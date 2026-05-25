use csv::Writer;
use serde::{Deserialize, Serialize};
use std::fs;
use std::fs::File;
use std::io::{BufRead, BufReader};
use std::path::Path;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Label {
    pub id: u32,
    pub x: f64,
    pub y: f64,
    pub text: String,
}

#[tauri::command]
fn read_image(image_path: String) -> Result<String, String> {
    let ext = Path::new(&image_path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png")
        .to_lowercase();

    let mime = match ext.as_str() {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "gif" => "image/gif",
        "bmp" => "image/bmp",
        "webp" => "image/webp",
        _ => "image/png",
    };

    let bytes = fs::read(&image_path).map_err(|e| e.to_string())?;
    let b64 = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, &bytes);
    Ok(format!("data:{};base64,{}" , mime, b64))
}

#[tauri::command]
fn save_labels(image_path: String, labels: Vec<Label>) -> Result<(), String> {
    let base = Path::new(&image_path)
        .file_stem()
        .ok_or("无效的文件路径")?
        .to_string_lossy();

    let parent = Path::new(&image_path)
        .parent()
        .ok_or("无法获取父目录")?;

    let csv_path = parent.join(format!("{}.csv", base));

    let mut writer = Writer::from_path(&csv_path).map_err(|e| e.to_string())?;

    writer
        .write_record(&["id", "x", "y", "label"])
        .map_err(|e| e.to_string())?;

    for label in &labels {
        writer
            .write_record(&[
                label.id.to_string(),
                label.x.to_string(),
                label.y.to_string(),
                label.text.clone(),
            ])
            .map_err(|e| e.to_string())?;
    }

    writer.flush().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn load_labels(image_path: String) -> Result<Vec<Label>, String> {
    let base = Path::new(&image_path)
        .file_stem()
        .ok_or("无效的文件路径")?
        .to_string_lossy();

    let parent = Path::new(&image_path)
        .parent()
        .ok_or("无法获取父目录")?;

    let csv_path = parent.join(format!("{}.csv", base));

    if !csv_path.exists() {
        return Ok(vec![]);
    }

    let file = File::open(&csv_path).map_err(|e| e.to_string())?;
    let reader = BufReader::new(file);
    let mut labels = Vec::new();

    for (i, line) in reader.lines().enumerate() {
        if i == 0 {
            continue; // skip header
        }
        let line = line.map_err(|e| e.to_string())?;
        let parts: Vec<&str> = line.split(',').collect();
        if parts.len() >= 4 {
            labels.push(Label {
                id: parts[0].parse().unwrap_or(i as u32),
                x: parts[1].parse().unwrap_or(0.0),
                y: parts[2].parse().unwrap_or(0.0),
                text: parts[3..].join(","),
            });
        }
    }

    Ok(labels)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![read_image, save_labels, load_labels])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
