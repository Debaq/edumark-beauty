mod project_loader;
mod image_compress;
mod qr_generator;
mod docx_export;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            project_loader::read_directory_files,
            project_loader::read_zip_files,
            project_loader::resolve_edmindex,
            image_compress::compress_image,
            qr_generator::generate_qr,
            docx_export::generate_docx,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
