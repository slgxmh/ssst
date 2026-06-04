use anyhow::Result;
use btleplug::api::{Characteristic, Peripheral as _, WriteType};
use btleplug::platform::Peripheral;
use futures::StreamExt;
use tokio::sync::mpsc;
use tracing::info;

pub async fn connect(peripheral: &Peripheral) -> Result<()> {
    peripheral.connect().await?;
    info!("Connected to {}", peripheral.address());
    Ok(())
}

pub async fn disconnect(peripheral: &Peripheral) -> Result<()> {
    peripheral.disconnect().await?;
    info!("Disconnected from {}", peripheral.address());
    Ok(())
}

pub async fn discover_services(
    peripheral: &Peripheral,
) -> Result<std::collections::BTreeSet<btleplug::api::Service>> {
    peripheral.discover_services().await?;
    let services = peripheral.services();
    info!("Discovered {} services", services.len());
    Ok(services)
}

pub async fn read_char(
    peripheral: &Peripheral,
    characteristic: &Characteristic,
) -> Result<Vec<u8>> {
    let data = peripheral.read(characteristic).await?;
    Ok(data)
}

pub async fn write_char(
    peripheral: &Peripheral,
    characteristic: &Characteristic,
    data: Vec<u8>,
) -> Result<()> {
    peripheral
        .write(characteristic, &data, WriteType::WithResponse)
        .await?;
    Ok(())
}

pub async fn subscribe_notify(
    peripheral: &Peripheral,
    characteristic: &Characteristic,
) -> Result<mpsc::Receiver<Vec<u8>>> {
    let (tx, rx) = mpsc::channel(32);
    peripheral.subscribe(characteristic).await?;

    let peripheral_clone = peripheral.clone();
    let char_clone = characteristic.clone();
    tokio::spawn(async move {
        let mut notifications = peripheral_clone.notifications().await.unwrap();
        while let Some(data) = notifications.next().await {
            if data.uuid == char_clone.uuid {
                if tx.send(data.value).await.is_err() {
                    break;
                }
            }
        }
    });

    Ok(rx)
}
