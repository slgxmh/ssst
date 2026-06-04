use crossterm::event::{self, Event as CEvent, KeyEvent};
use std::time::Duration;
use tokio::sync::mpsc;

#[derive(Clone, Debug)]
pub enum Event {
    Tick,
    Key(KeyEvent),
    Ble(BleEvent),
}

#[derive(Clone, Debug)]
pub enum BleEvent {
    DeviceFound {
        name: Option<String>,
        addr: String,
        rssi: Option<i16>,
    },
    Connected,
    Disconnected,
    ServicesDiscovered(Vec<(String, String)>), // (uuid, name if known)
    CharacteristicsDiscovered(Vec<(String, String, Vec<String>)>), // (uuid, name, props)
    ReadResult(Vec<u8>),
    NotifyReceived(Vec<u8>),
    Error(String),
    Log(String),
}

pub struct EventHandler {
    pub rx: mpsc::Receiver<Event>,
    _tx: mpsc::Sender<Event>,
}

impl EventHandler {
    pub fn new(tick_rate: Duration) -> Self {
        let (tx, rx) = mpsc::channel(100);
        let tx_tick = tx.clone();
        let tx_key = tx.clone();

        tokio::spawn(async move {
            let mut interval = tokio::time::interval(tick_rate);
            loop {
                interval.tick().await;
                if tx_tick.send(Event::Tick).await.is_err() {
                    break;
                }
            }
        });

        tokio::spawn(async move {
            loop {
                if let Ok(true) = event::poll(Duration::from_millis(100)) {
                    if let Ok(CEvent::Key(key)) = event::read() {
                        if tx_key.send(Event::Key(key)).await.is_err() {
                            break;
                        }
                    }
                }
            }
        });

        Self { rx, _tx: tx }
    }
}
