use crate::ble::{AppState, SendPeripheral};
use base64::Engine;
use btleplug::api::{Central, CharPropFlags, Peripheral as _, WriteType};
use futures::StreamExt;
use tauri::{AppHandle, Emitter, State};
use tracing::info;
use uuid::Uuid;

fn properties_to_strings(props: CharPropFlags) -> Vec<&'static str> {
    let mut out = Vec::new();
    if props.contains(CharPropFlags::READ) {
        out.push("read");
    }
    if props.contains(CharPropFlags::WRITE) {
        out.push("write");
    }
    if props.contains(CharPropFlags::NOTIFY) {
        out.push("notify");
    }
    if props.contains(CharPropFlags::INDICATE) {
        out.push("indicate");
    }
    if props.contains(CharPropFlags::WRITE_WITHOUT_RESPONSE) {
        out.push("write_without_response");
    }
    out
}

fn find_characteristic(
    state: &AppState,
    service_uuid: Uuid,
    char_uuid: Uuid,
) -> Result<btleplug::api::Characteristic, String> {
    let guard = state.peripheral.lock().map_err(|e| e.to_string())?;
    let peripheral = guard.as_ref().ok_or("Not connected")?;
    let services = peripheral.0.services();
    services
        .iter()
        .find(|s| s.uuid == service_uuid)
        .and_then(|s| s.characteristics.iter().find(|c| c.uuid == char_uuid))
        .cloned()
        .ok_or("Characteristic not found".to_string())
}

#[tauri::command]
pub async fn connect_device(
    state: State<'_, AppState>,
    address: String,
    app: AppHandle,
) -> Result<(), String> {
    let adapter = {
        let guard = state.adapter.lock().map_err(|e| e.to_string())?;
        guard.as_ref().ok_or("Adapter not initialized")?.clone()
    };
    let peripherals = adapter.0.peripherals().await.map_err(|e| e.to_string())?;
    let peripheral = peripherals
        .into_iter()
        .find(|p| p.address().to_string() == address)
        .ok_or("Device not found")?;

    peripheral.connect().await.map_err(|e| e.to_string())?;
    *state.peripheral.lock().map_err(|e| e.to_string())? = Some(SendPeripheral(peripheral.clone()));
    info!("Connected to {}", peripheral.address());

    app.emit(
        "ble://connected",
        serde_json::json!({ "address": address }),
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn disconnect_device(state: State<'_, AppState>, app: AppHandle) -> Result<(), String> {
    let peripheral = {
        let mut guard = state.peripheral.lock().map_err(|e| e.to_string())?;
        guard.take().ok_or("Not connected")?
    };
    peripheral.0.disconnect().await.map_err(|e| e.to_string())?;
    info!("Disconnected from {}", peripheral.0.address());
    app.emit("ble://disconnected", serde_json::json!({}))
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn discover_services(state: State<'_, AppState>, app: AppHandle) -> Result<(), String> {
    let peripheral = {
        let guard = state.peripheral.lock().map_err(|e| e.to_string())?;
        guard.as_ref().ok_or("Not connected")?.clone()
    };

    peripheral.0.discover_services().await.map_err(|e| e.to_string())?;
    let services = peripheral.0.services();
    let result: Vec<_> = services
        .iter()
        .map(|s| {
            let characteristics: Vec<_> = s
                .characteristics
                .iter()
                .map(|c| {
                    serde_json::json!({
                        "uuid": c.uuid.to_string(),
                        "properties": properties_to_strings(c.properties),
                    })
                })
                .collect();
            serde_json::json!({
                "uuid": s.uuid.to_string(),
                "characteristics": characteristics,
            })
        })
        .collect();

    info!("Discovered {} services", services.len());
    app.emit(
        "ble://services",
        serde_json::json!({ "services": result }),
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn read_characteristic(
    state: State<'_, AppState>,
    service_uuid: String,
    char_uuid: String,
    app: AppHandle,
) -> Result<(), String> {
    let service_uuid = Uuid::parse_str(&service_uuid).map_err(|e| e.to_string())?;
    let char_uuid = Uuid::parse_str(&char_uuid).map_err(|e| e.to_string())?;

    let characteristic = find_characteristic(&state, service_uuid, char_uuid)?;
    let peripheral = {
        let guard = state.peripheral.lock().map_err(|e| e.to_string())?;
        guard.as_ref().ok_or("Not connected")?.clone()
    };
    let data = peripheral.0.read(&characteristic).await.map_err(|e| e.to_string())?;

    app.emit(
        "ble://read-result",
        serde_json::json!({
            "base64": base64::engine::general_purpose::STANDARD.encode(&data),
            "charUuid": char_uuid.to_string(),
            "hex": hex::encode(&data),
        }),
    )
    .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn write_characteristic(
    state: State<'_, AppState>,
    service_uuid: String,
    char_uuid: String,
    data: Vec<u8>,
) -> Result<(), String> {
    let service_uuid = Uuid::parse_str(&service_uuid).map_err(|e| e.to_string())?;
    let char_uuid = Uuid::parse_str(&char_uuid).map_err(|e| e.to_string())?;

    let characteristic = find_characteristic(&state, service_uuid, char_uuid)?;
    let peripheral = {
        let guard = state.peripheral.lock().map_err(|e| e.to_string())?;
        guard.as_ref().ok_or("Not connected")?.clone()
    };
    peripheral
        .0
        .write(&characteristic, &data, WriteType::WithResponse)
        .await
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
pub async fn subscribe_characteristic(
    state: State<'_, AppState>,
    service_uuid: String,
    char_uuid: String,
    app: AppHandle,
) -> Result<(), String> {
    let service_uuid = Uuid::parse_str(&service_uuid).map_err(|e| e.to_string())?;
    let char_uuid = Uuid::parse_str(&char_uuid).map_err(|e| e.to_string())?;

    let characteristic = find_characteristic(&state, service_uuid, char_uuid)?;
    let peripheral = {
        let guard = state.peripheral.lock().map_err(|e| e.to_string())?;
        guard.as_ref().ok_or("Not connected")?.clone()
    };

    peripheral
        .0
        .subscribe(&characteristic)
        .await
        .map_err(|e| e.to_string())?;

    tokio::spawn(async move {
        let mut notifications = match peripheral.0.notifications().await {
            Ok(n) => n,
            Err(_) => return,
        };
        while let Some(data) = notifications.next().await {
            if data.uuid == characteristic.uuid {
                let _ = app.emit(
                    "ble://notify",
                    serde_json::json!({
                        "base64": base64::engine::general_purpose::STANDARD.encode(&data.value),
                        "hex": hex::encode(&data.value),
                    }),
                );
            }
        }
    });

    Ok(())
}
