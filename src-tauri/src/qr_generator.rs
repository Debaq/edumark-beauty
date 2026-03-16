use base64::Engine;
use qrcode::QrCode;
use image::Luma;
use std::io::Cursor;

/// Generate a QR code as a PNG data URL.
#[tauri::command]
pub fn generate_qr(
    text: String,
    size: Option<u32>,
) -> Result<String, String> {
    let dim = size.unwrap_or(120);

    let code = QrCode::new(text.as_bytes()).map_err(|e| format!("QR encode error: {}", e))?;

    let img = code.render::<Luma<u8>>()
        .min_dimensions(dim, dim)
        .dark_color(Luma([0u8]))
        .light_color(Luma([255u8]))
        .quiet_zone(true)
        .build();

    let mut buf = Vec::new();
    let mut cursor = Cursor::new(&mut buf);
    image::DynamicImage::ImageLuma8(img)
        .write_to(&mut cursor, image::ImageFormat::Png)
        .map_err(|e| format!("PNG encode error: {}", e))?;

    let b64 = base64::engine::general_purpose::STANDARD.encode(&buf);
    Ok(format!("data:image/png;base64,{}", b64))
}
