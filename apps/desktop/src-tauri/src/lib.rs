mod ble;

use ble::AppState;
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tracing_subscriber::fmt::init();

    tauri::Builder::default()
        .manage(AppState {
            adapter: Arc::new(Mutex::new(None)),
            peripheral: Arc::new(Mutex::new(None)),
            scanning: Arc::new(AtomicBool::new(false)),
        })
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            ble::scanner::start_scan,
            ble::scanner::stop_scan,
            ble::gatt::connect_device,
            ble::gatt::disconnect_device,
            ble::gatt::discover_services,
            ble::gatt::read_characteristic,
            ble::gatt::write_characteristic,
            ble::gatt::subscribe_characteristic,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
