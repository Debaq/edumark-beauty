use rayon::prelude::*;
use regex::Regex;
use serde::Serialize;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

/// Result type for file maps returned to the frontend.
#[derive(Serialize)]
pub struct FileMapResult {
    /// Map of relative_path -> file content
    files: HashMap<String, String>,
    /// Files that could not be read
    errors: Vec<String>,
}

/// Valid text file extensions for edumark projects.
fn is_text_file(name: &str) -> bool {
    let lower = name.to_lowercase();
    lower.ends_with(".edm")
        || lower.ends_with(".edmindex")
        || lower.ends_with(".md")
        || lower.ends_with(".txt")
}

/// Read all text files from a directory recursively, in parallel.
#[tauri::command]
pub fn read_directory_files(dir_path: String) -> Result<FileMapResult, String> {
    let root = PathBuf::from(&dir_path);
    if !root.is_dir() {
        return Err(format!("Not a directory: {}", dir_path));
    }

    let paths: Vec<(PathBuf, String, String)> = WalkDir::new(&root)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .filter(|e| {
            e.file_name()
                .to_str()
                .map(|n| is_text_file(n))
                .unwrap_or(false)
        })
        .filter_map(|e| {
            let full = e.path().to_path_buf();
            let rel = e
                .path()
                .strip_prefix(&root)
                .ok()?
                .to_string_lossy()
                .to_string();
            let base = e.file_name().to_string_lossy().to_string();
            Some((full, rel, base))
        })
        .collect();

    let results: Vec<(String, String, Result<String, String>)> = paths
        .par_iter()
        .map(|(full, rel, base)| {
            let content = fs::read_to_string(full).map_err(|e| format!("{}: {}", rel, e));
            (rel.clone(), base.clone(), content)
        })
        .collect();

    let mut files = HashMap::new();
    let mut errors = Vec::new();

    for (rel, base, result) in results {
        match result {
            Ok(content) => {
                files.insert(base, content.clone());
                files.insert(rel, content);
            }
            Err(e) => errors.push(e),
        }
    }

    Ok(FileMapResult { files, errors })
}

/// Read all text files from a ZIP archive.
#[tauri::command]
pub fn read_zip_files(zip_path: String) -> Result<FileMapResult, String> {
    let file = fs::File::open(&zip_path).map_err(|e| format!("Cannot open ZIP: {}", e))?;
    let mut archive =
        zip::ZipArchive::new(file).map_err(|e| format!("Invalid ZIP: {}", e))?;

    let mut files = HashMap::new();
    let mut errors = Vec::new();

    for i in 0..archive.len() {
        let mut entry = archive
            .by_index(i)
            .map_err(|e| format!("ZIP entry error: {}", e))?;

        if entry.is_dir() {
            continue;
        }

        let name = entry.name().to_string();
        if !is_text_file(&name) {
            continue;
        }

        let mut content = String::new();
        use std::io::Read;
        match entry.read_to_string(&mut content) {
            Ok(_) => {
                let base = Path::new(&name)
                    .file_name()
                    .map(|f| f.to_string_lossy().to_string())
                    .unwrap_or_else(|| name.clone());
                files.insert(base, content.clone());
                files.insert(name, content);
            }
            Err(e) => errors.push(format!("{}: {}", name, e)),
        }
    }

    Ok(FileMapResult { files, errors })
}

/// Parse include references from source text.
fn parse_all_includes(source: &str) -> Vec<String> {
    let mut includes = Vec::new();
    let mut seen = HashSet::new();

    let re_at = Regex::new(r"@include\(([^)]+)\)").unwrap();
    for cap in re_at.captures_iter(source) {
        let path = cap[1].to_string();
        if seen.insert(path.clone()) {
            includes.push(path);
        }
    }

    let re_block = Regex::new(r#":{2,3}include\s+file="([^"]+)""#).unwrap();
    for cap in re_block.captures_iter(source) {
        let path = cap[1].to_string();
        if seen.insert(path.clone()) {
            includes.push(path);
        }
    }

    includes
}

/// Resolve an .edmindex: reads the index file and all referenced .edm files.
/// Accepts a list of includes from JS (already parsed) + the index path.
/// Recursively resolves nested includes.
#[tauri::command]
pub fn resolve_edmindex(
    index_path: String,
    includes: Vec<String>,
) -> Result<FileMapResult, String> {
    let index_file = PathBuf::from(&index_path);
    if !index_file.is_file() {
        return Err(format!("Not a file: {}", index_path));
    }

    let dir = index_file
        .parent()
        .ok_or_else(|| "Cannot determine parent directory".to_string())?;

    eprintln!("[Rust resolve_edmindex] dir={}, includes={:?}", dir.display(), includes);

    // Use provided includes or parse from index file
    let initial_includes = if !includes.is_empty() {
        includes
    } else {
        let source = fs::read_to_string(&index_file)
            .map_err(|e| format!("Cannot read index: {}", e))?;
        let parsed = parse_all_includes(&source);
        eprintln!("[Rust resolve_edmindex] parsed from file: {:?}", parsed);
        parsed
    };

    let mut files = HashMap::new();
    let mut errors = Vec::new();
    let mut fetched = HashSet::new();
    let mut queue = initial_includes;

    while !queue.is_empty() {
        let batch: Vec<(String, PathBuf)> = queue
            .drain(..)
            .filter(|p| {
                let base = Path::new(p)
                    .file_name()
                    .map(|f| f.to_string_lossy().to_string())
                    .unwrap_or_else(|| p.clone());
                fetched.insert(p.clone()) && fetched.insert(base)
            })
            .map(|p| {
                let full = dir.join(&p);
                (p, full)
            })
            .collect();

        let results: Vec<(String, Result<String, String>)> = batch
            .par_iter()
            .map(|(rel, full)| {
                let content =
                    fs::read_to_string(full).map_err(|e| format!("{}: {}", rel, e));
                (rel.clone(), content)
            })
            .collect();

        for (rel, result) in results {
            match result {
                Ok(content) => {
                    let nested = parse_all_includes(&content);
                    for n in nested {
                        let base = Path::new(&n)
                            .file_name()
                            .map(|f| f.to_string_lossy().to_string())
                            .unwrap_or_else(|| n.clone());
                        if !fetched.contains(&n) && !fetched.contains(&base) {
                            queue.push(n);
                        }
                    }

                    let base = Path::new(&rel)
                        .file_name()
                        .map(|f| f.to_string_lossy().to_string())
                        .unwrap_or_else(|| rel.clone());
                    files.insert(base, content.clone());
                    files.insert(rel, content);
                }
                Err(e) => errors.push(e),
            }
        }
    }

    Ok(FileMapResult { files, errors })
}
