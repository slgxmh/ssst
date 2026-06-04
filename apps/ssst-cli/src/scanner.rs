use anyhow::Result;
use btleplug::api::{Central, Manager as _, Peripheral as _, ScanFilter};
use btleplug::platform::{Adapter, Manager};
use std::time::Duration;
use tokio::time;
use tracing::info;

pub async fn get_adapter() -> Result<Adapter> {
    let manager = Manager::new().await?;
    let adapters = manager.adapters().await?;
    adapters
        .into_iter()
        .next()
        .ok_or_else(|| anyhow::anyhow!("No Bluetooth adapter found"))
}

pub async fn run_scan(duration_secs: u64) -> Result<()> {
    let adapter = get_adapter().await?;
    adapter
        .start_scan(ScanFilter::default())
        .await?;
    info!("Scanning for {} seconds...", duration_secs);
    time::sleep(Duration::from_secs(duration_secs)).await;
    adapter.stop_scan().await?;

    let peripherals = adapter.peripherals().await?;
    if peripherals.is_empty() {
        println!("No devices found.");
        return Ok(());
    }

    println!("{:<30} {:<20} {:<10}", "Name", "Address", "RSSI");
    println!("{}", "-".repeat(62));
    for p in peripherals {
        let props = p.properties().await?;
        if let Some(props) = props {
            let name = props.local_name.unwrap_or_else(|| "Unknown".to_string());
            let addr = props.address.to_string();
            let rssi = props.rssi.map_or("N/A".to_string(), |r| format!("{} dBm", r));
            println!("{:<30} {:<20} {:<10}", name, addr, rssi);
        }
    }
    Ok(())
}
