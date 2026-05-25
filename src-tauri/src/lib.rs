use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::Path;

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Category {
    pub id: u32,
    pub name: String,
    pub color: String,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct Shape {
    pub label: String,
    pub points: Vec<Vec<f64>>,
    pub group_id: Option<u32>,
    pub shape_type: String,
    pub flags: HashMap<String, bool>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct LabelMeAnnotation {
    pub version: String,
    pub flags: HashMap<String, bool>,
    pub shapes: Vec<Shape>,
    #[serde(rename = "imagePath")]
    pub image_path: String,
    #[serde(rename = "imageHeight")]
    pub image_height: u32,
    #[serde(rename = "imageWidth")]
    pub image_width: u32,
    pub categories: Vec<Category>,
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
fn save_labels(image_path: String, annotation: LabelMeAnnotation) -> Result<(), String> {
    let base = Path::new(&image_path)
        .file_stem()
        .ok_or("无效的文件路径")?
        .to_string_lossy();

    let parent = Path::new(&image_path)
        .parent()
        .ok_or("无法获取父目录")?;

    let json_path = parent.join(format!("{}.json", base));
    let json_str = serde_json::to_string_pretty(&annotation).map_err(|e| e.to_string())?;
    fs::write(&json_path, json_str).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn load_labels(image_path: String) -> Result<LabelMeAnnotation, String> {
    let base = Path::new(&image_path)
        .file_stem()
        .ok_or("无效的文件路径")?
        .to_string_lossy();

    let parent = Path::new(&image_path)
        .parent()
        .ok_or("无法获取父目录")?;

    let json_path = parent.join(format!("{}.json", base));

    if !json_path.exists() {
        let image_name = Path::new(&image_path)
            .file_name()
            .ok_or("无效的文件路径")?
            .to_string_lossy()
            .to_string();
        
        return Ok(LabelMeAnnotation {
            version: "5.0".to_string(),
            flags: HashMap::new(),
            shapes: Vec::new(),
            image_path: image_name,
            image_height: 0,
            image_width: 0,
            categories: Vec::new(),
        });
    }

    let json_str = fs::read_to_string(&json_path).map_err(|e| e.to_string())?;
    let annotation: LabelMeAnnotation = serde_json::from_str(&json_str).map_err(|e| e.to_string())?;
    Ok(annotation)
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
