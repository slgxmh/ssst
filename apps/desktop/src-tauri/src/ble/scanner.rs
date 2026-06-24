use crate::ble::{AppState, SendAdapter};
use btleplug::api::{Central, Manager as _, Peripheral as _, ScanFilter};
use btleplug::platform::{Adapter, Manager};
use std::sync::atomic::Ordering;
use std::sync::Arc;
use std::time::Duration;
use tauri::{AppHandle, Emitter, State};
use tokio::time;
use tracing::info;

pub async fn get_adapter() -> anyhow::Result<Adapter> {
    let manager = Manager::new().await?;
    let adapters = manager.adapters().await?;
    adapters
        .into_iter()
        .next()
        .ok_or_else(|| anyhow::anyhow!("No Bluetooth adapter found"))
}

#[tauri::command]
pub async fn start_scan(state: State<'_, AppState>, app: AppHandle) -> Result<(), String> {
    let adapter = get_adapter().await.map_err(|e| e.to_string())?;
    adapter
        .start_scan(ScanFilter::default())
        .await
        .map_err(|e| e.to_string())?;

    let send_adapter = SendAdapter(adapter);
    *state.adapter.lock().map_err(|e| e.to_string())? = Some(send_adapter.clone());
    state.scanning.store(true, Ordering::Relaxed);
    let scanning = Arc::clone(&state.scanning);
    info!("Scanning started");

    tokio::spawn(async move {
        let adapter = send_adapter.0;
        let mut interval = time::interval(Duration::from_secs(1));
        while scanning.load(Ordering::Relaxed) {
            interval.tick().await;
            let peripherals = match adapter.peripherals().await {
                Ok(p) => p,
                Err(_) => break,
            };
            for p in peripherals {
                if let Ok(Some(props)) = p.properties().await {
                    let name = props.local_name.unwrap_or_else(|| "Unknown".to_string());
                    let address = props.address.to_string();
                    let rssi = props.rssi;
                    let _ = app.emit(
                        "ble://device-found",
                        serde_json::json!({
                            "name": name,
                            "address": address,
                            "rssi": rssi,
                        }),
                    );
                }
            }
        }
        let _ = adapter.stop_scan().await;
        info!("Scanning stopped");
    });

    Ok(())
}

#[tauri::command]
pub async fn stop_scan(state: State<'_, AppState>) -> Result<(), String> {
    state.scanning.store(false, Ordering::Relaxed);
    let adapter = {
        let guard = state.adapter.lock().map_err(|e| e.to_string())?;
        guard.as_ref().ok_or("Adapter not initialized")?.clone()
    };
    adapter.0.stop_scan().await.map_err(|e| e.to_string())?;
    Ok(())
}
