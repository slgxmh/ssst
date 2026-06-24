pub mod gatt;
pub mod scanner;

use btleplug::platform::{Adapter, Peripheral};
use std::sync::atomic::AtomicBool;
use std::sync::{Arc, Mutex};

/// btleplug 在 macOS 上的平台类型未实现 Send，但内部实际上是线程安全的
///（基于 CoreBluetooth 的 dispatch queue）。这里用 unsafe wrapper 使其能
/// 在 Tauri 的多线程异步命令中使用。
#[derive(Clone)]
pub struct SendAdapter(pub Adapter);
unsafe impl Send for SendAdapter {}
unsafe impl Sync for SendAdapter {}

#[derive(Clone)]
pub struct SendPeripheral(pub Peripheral);
unsafe impl Send for SendPeripheral {}
unsafe impl Sync for SendPeripheral {}

pub struct AppState {
    pub adapter: Arc<Mutex<Option<SendAdapter>>>,
    pub peripheral: Arc<Mutex<Option<SendPeripheral>>>,
    pub scanning: Arc<AtomicBool>,
}
