use base64::Engine;
use image::imageops::FilterType;
use image::GenericImageView;
use std::io::Cursor;

/// Compress an image to WebP (or JPEG fallback), returning a data URI.
/// Receives raw image bytes, resizes to max_dimension, encodes at given quality.
#[tauri::command]
pub fn compress_image(
    data: Vec<u8>,
    max_dimension: Option<u32>,
    quality: Option<f32>,
) -> Result<String, String> {
    let max_dim = max_dimension.unwrap_or(1200);
    let q = quality.unwrap_or(0.82);

    let img = image::load_from_memory(&data).map_err(|e| format!("Invalid image: {}", e))?;

    let (w, h) = img.dimensions();

    // Resize if needed
    let img = if w.max(h) > max_dim {
        let ratio = max_dim as f32 / w.max(h) as f32;
        let nw = (w as f32 * ratio).round() as u32;
        let nh = (h as f32 * ratio).round() as u32;
        img.resize_exact(nw, nh, FilterType::Lanczos3)
    } else {
        img
    };

    // Try WebP encoding
    let rgba = img.to_rgba8();
    let (w, h) = rgba.dimensions();

    // Use the webp crate for encoding
    let encoder = webp::Encoder::from_rgba(&rgba, w, h);
    let webp_data = encoder.encode(q);

    if !webp_data.is_empty() {
        let b64 = base64::engine::general_purpose::STANDARD.encode(&*webp_data);
        return Ok(format!("data:image/webp;base64,{}", b64));
    }

    // Fallback: JPEG
    let mut buf = Vec::new();
    let mut cursor = Cursor::new(&mut buf);
    img.write_to(&mut cursor, image::ImageFormat::Jpeg)
        .map_err(|e| format!("JPEG encode failed: {}", e))?;

    let b64 = base64::engine::general_purpose::STANDARD.encode(&buf);
    Ok(format!("data:image/jpeg;base64,{}", b64))
}
