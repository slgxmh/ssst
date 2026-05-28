use image::GenericImageView;
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
    Ok(format!("data:{};base64,{}", mime, b64))
}

#[tauri::command]
fn save_labels(image_path: String, annotation: LabelMeAnnotation) -> Result<(), String> {
    let base = Path::new(&image_path)
        .file_stem()
        .ok_or("无效的文件路径")?
        .to_string_lossy();

    let parent = Path::new(&image_path).parent().ok_or("无法获取父目录")?;

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

    let parent = Path::new(&image_path).parent().ok_or("无法获取父目录")?;

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
    let annotation: LabelMeAnnotation =
        serde_json::from_str(&json_str).map_err(|e| e.to_string())?;
    Ok(annotation)
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CropConfig {
    pub tile_width: u32,
    pub tile_height: u32,
    pub overlap: u32,
}

#[derive(Serialize, Clone, Debug)]
pub struct CropResult {
    pub total_tiles: usize,
    pub tiles_with_labels: usize,
    pub output_dir: String,
}

#[tauri::command]
fn crop_image(
    image_path: String,
    output_dir: Option<String>,
    config: CropConfig,
) -> Result<CropResult, String> {
    // 1. 读取原图
    let img = image::open(&image_path).map_err(|e| e.to_string())?;
    let img_width = img.width();
    let img_height = img.height();

    // 2. 读取标注
    let annotation = load_labels(image_path.clone())?;

    // 3. 确定输出目录
    let out_dir = match output_dir {
        Some(dir) => std::path::PathBuf::from(dir),
        None => Path::new(&image_path)
            .parent()
            .ok_or("无法获取父目录")?
            .to_path_buf(),
    };
    if !out_dir.exists() {
        fs::create_dir_all(&out_dir).map_err(|e| e.to_string())?;
    }

    // 4. 计算网格
    let stride_x = config.tile_width.saturating_sub(config.overlap).max(1);
    let stride_y = config.tile_height.saturating_sub(config.overlap).max(1);

    let base_name = Path::new(&image_path)
        .file_stem()
        .ok_or("无效的文件路径")?
        .to_string_lossy();

    let ext = Path::new(&image_path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("png")
        .to_lowercase();

    let mut total_tiles = 0usize;
    let mut tiles_with_labels = 0usize;
    let mut row = 0u32;

    let mut y = 0u32;
    while y < img_height {
        let crop_y = y;
        let crop_h = config.tile_height.min(img_height - y);
        if crop_h == 0 {
            break;
        }

        let mut col = 0u32;
        let mut x = 0u32;
        while x < img_width {
            let crop_x = x;
            let crop_w = config.tile_width.min(img_width - x);
            if crop_w == 0 {
                break;
            }

            // 裁切图片
            let sub_img = img.view(crop_x, crop_y, crop_w, crop_h).to_image();
            let tile_name = format!("{}_crop_r{}_c{}", base_name, row, col);
            let tile_img_path = out_dir.join(format!("{}.{}", tile_name, ext));
            sub_img.save(&tile_img_path).map_err(|e| e.to_string())?;

            // 筛选并转换标注
            let mut tile_shapes = Vec::new();
            for shape in &annotation.shapes {
                if shape.points.is_empty() {
                    continue;
                }
                let px = shape.points[0][0];
                let py = shape.points[0][1];
                if px >= crop_x as f64
                    && px < (crop_x + crop_w) as f64
                    && py >= crop_y as f64
                    && py < (crop_y + crop_h) as f64
                {
                    let new_x = px - crop_x as f64;
                    let new_y = py - crop_y as f64;
                    tile_shapes.push(Shape {
                        label: shape.label.clone(),
                        points: vec![vec![new_x, new_y]],
                        group_id: shape.group_id,
                        shape_type: shape.shape_type.clone(),
                        flags: shape.flags.clone(),
                    });
                }
            }

            if !tile_shapes.is_empty() {
                tiles_with_labels += 1;
            }

            // 保存 JSON
            let tile_annotation = LabelMeAnnotation {
                version: annotation.version.clone(),
                flags: annotation.flags.clone(),
                shapes: tile_shapes,
                image_path: format!("{}.{}", tile_name, ext),
                image_height: crop_h,
                image_width: crop_w,
                categories: annotation.categories.clone(),
            };
            let tile_json_path = out_dir.join(format!("{}.json", tile_name));
            let json_str = serde_json::to_string_pretty(&tile_annotation).map_err(|e| e.to_string())?;
            fs::write(&tile_json_path, json_str).map_err(|e| e.to_string())?;

            total_tiles += 1;
            col += 1;
            x += stride_x;
        }

        row += 1;
        y += stride_y;
    }

    Ok(CropResult {
        total_tiles,
        tiles_with_labels,
        output_dir: out_dir.to_string_lossy().to_string(),
    })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            read_image,
            save_labels,
            load_labels,
            crop_image
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
