use crate::models::{LabelMeAnnotation, Shape};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::Path;

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
pub fn crop_image(
    image_path: String,
    output_dir: Option<String>,
    config: CropConfig,
) -> Result<CropResult, String> {
    use crate::features::image_labeler::load_labels;

    // 1. 读取原图
    let mut img = image::open(&image_path).map_err(|e| e.to_string())?;
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
            let sub_img = img.crop(crop_x, crop_y, crop_w, crop_h);
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

#[cfg(test)]
mod tests {
    use super::*;
    use std::env;
    use std::path::PathBuf;

    fn temp_dir() -> PathBuf {
        env::temp_dir().join("ssst_crop_test")
    }

    fn create_test_image(path: &std::path::Path) {
        // 生成 1024x768 的 RGB 测试图，左上角红、右下角绿、其余蓝
        let mut img = image::RgbImage::new(1024, 768);
        for (x, y, pixel) in img.enumerate_pixels_mut() {
            if x < 512 && y < 384 {
                *pixel = image::Rgb([255, 0, 0]);
            } else if x >= 512 && y >= 384 {
                *pixel = image::Rgb([0, 255, 0]);
            } else {
                *pixel = image::Rgb([0, 0, 255]);
            }
        }
        let dynamic = image::DynamicImage::ImageRgb8(img);
        dynamic.save(path).expect("生成测试图片失败");
    }

    #[test]
    fn test_crop_image_generates_non_empty_files() {
        let temp = temp_dir();
        let image_path = temp.join("test_input.jpg");
        let output_dir = temp.join("output");

        // 清理并准备
        let _ = std::fs::remove_dir_all(&temp);
        std::fs::create_dir_all(&temp).expect("创建临时目录失败");
        create_test_image(&image_path);

        let result = crop_image(
            image_path.to_string_lossy().to_string(),
            Some(output_dir.to_string_lossy().to_string()),
            CropConfig {
                tile_width: 512,
                tile_height: 512,
                overlap: 128,
            },
        );

        let r = result.expect("crop_image 应该成功");
        assert!(r.total_tiles > 0, "应该生成至少一个瓦片");

        // 验证每个 jpg 文件都非空
        let entries = std::fs::read_dir(&output_dir).expect("无法读取输出目录");
        let mut jpg_count = 0;
        for entry in entries {
            let entry = entry.expect("无法读取条目");
            let path = entry.path();
            if let Some(ext) = path.extension() {
                if ext == "jpg" || ext == "jpeg" {
                    let meta = entry.metadata().expect("无法读取元数据");
                    assert!(
                        meta.len() > 0,
                        "文件 {} 不应该为空",
                        path.display()
                    );
                    jpg_count += 1;
                }
            }
        }
        assert!(jpg_count > 0, "应该生成至少一个 jpg 文件");
        assert_eq!(jpg_count, r.total_tiles, "jpg 文件数量应该等于瓦片总数");

        // 清理
        let _ = std::fs::remove_dir_all(&temp);
    }

    #[test]
    fn test_crop_image_tile_count() {
        let temp = temp_dir().join("count_test");
        let image_path = temp.join("test.jpg");
        let output_dir = temp.join("out");

        let _ = std::fs::remove_dir_all(&temp);
        std::fs::create_dir_all(&temp).unwrap();
        create_test_image(&image_path);

        // 1024x768, tile=512, overlap=128 → stride=384
        // x: 0, 384, 768 (3 tiles)
        // y: 0, 384 (2 tiles)
        // total = 6
        let result = crop_image(
            image_path.to_string_lossy().to_string(),
            Some(output_dir.to_string_lossy().to_string()),
            CropConfig {
                tile_width: 512,
                tile_height: 512,
                overlap: 128,
            },
        )
        .unwrap();

        assert_eq!(result.total_tiles, 6, "1024x768 以 512/128 分割应产生 6 个瓦片");

        let _ = std::fs::remove_dir_all(&temp);
    }
}
