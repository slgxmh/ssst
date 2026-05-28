mod features;
mod models;

pub use models::*;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            features::image_labeler::read_image,
            features::image_labeler::save_labels,
            features::image_labeler::load_labels,
            features::crop::crop_image,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
