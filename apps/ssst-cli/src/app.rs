use anyhow::Result;
use btleplug::platform::{Adapter, Peripheral};
use std::collections::BTreeMap;
use tokio::sync::mpsc;
use crate::scanner;
use crate::ui;

pub async fn run_tui() -> Result<()> {
    let adapter = scanner::get_adapter().await?;
    let mut app = App::new(adapter);
    ui::run(&mut app).await
}

#[derive(Clone, Debug)]
pub struct DeviceInfo {
    pub name: String,
    pub addr: String,
    pub rssi: Option<i16>,
    pub peripheral: Option<Peripheral>,
}

#[derive(Clone, Debug)]
pub struct ServiceInfo {
    pub uuid: String,
    pub characteristics: Vec<CharacteristicInfo>,
}

#[derive(Clone, Debug)]
pub struct CharacteristicInfo {
    pub uuid: String,
    pub properties: Vec<String>,
}

pub struct App {
    pub adapter: Adapter,
    pub devices: Vec<DeviceInfo>,
    pub selected_device: usize,
    pub services: BTreeMap<String, ServiceInfo>,
    pub selected_service: usize,
    pub selected_char: usize,
    pub connected_peripheral: Option<Peripheral>,
    pub logs: Vec<String>,
    pub mode: AppMode,
    pub scan_active: bool,
    pub notify_channels: Vec<mpsc::Receiver<Vec<u8>>>,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum AppMode {
    Devices,
    Services,
    Characteristics,
}

impl App {
    pub fn new(adapter: Adapter) -> Self {
        Self {
            adapter,
            devices: Vec::new(),
            selected_device: 0,
            services: BTreeMap::new(),
            selected_service: 0,
            selected_char: 0,
            connected_peripheral: None,
            logs: Vec::new(),
            mode: AppMode::Devices,
            scan_active: false,
            notify_channels: Vec::new(),
        }
    }

    pub fn push_log(&mut self, msg: impl Into<String>) {
        let msg = msg.into();
        if self.logs.len() > 200 {
            self.logs.remove(0);
        }
        self.logs.push(msg);
    }

    pub fn selected_device_info(&self) -> Option<&DeviceInfo> {
        self.devices.get(self.selected_device)
    }

    pub fn selected_service_info(&self) -> Option<&ServiceInfo> {
        self.services.values().nth(self.selected_service)
    }

    pub fn selected_char_info(&self) -> Option<&CharacteristicInfo> {
        self.selected_service_info()
            .and_then(|s| s.characteristics.get(self.selected_char))
    }
}
