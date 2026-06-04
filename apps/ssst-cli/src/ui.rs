use anyhow::Result;
use btleplug::api::{Central, Peripheral as _};
use crossterm::event::{KeyCode, KeyEventKind};
use ratatui::{
    backend::CrosstermBackend,
    layout::{Constraint, Direction, Layout},
    style::{Color, Modifier, Style},
    widgets::{Block, Borders, List, ListItem, Paragraph},
    Frame, Terminal,
};
use std::io;
use tokio::time::Duration;

use crate::app::{App, AppMode};
use crate::event::{BleEvent, Event, EventHandler};
use crate::gatt;

pub async fn run(app: &mut App) -> Result<()> {
    crossterm::terminal::enable_raw_mode()?;
    let mut stdout = io::stdout();
    crossterm::execute!(
        stdout,
        crossterm::terminal::EnterAlternateScreen,
        crossterm::event::EnableMouseCapture
    )?;

    let backend = CrosstermBackend::new(stdout);
    let mut terminal = Terminal::new(backend)?;

    let events = EventHandler::new(Duration::from_millis(250));
    let mut rx = events.rx;

    // start scanning immediately
    app.adapter.start_scan(btleplug::api::ScanFilter::default()).await?;
    app.scan_active = true;
    app.push_log("Scanning started...");

    let result = loop {
        terminal.draw(|f| draw(f, app))?;

        let event = rx.recv().await;
        match event {
            Some(Event::Key(key)) => {
                if key.kind != KeyEventKind::Press {
                    continue;
                }
                match key.code {
                    KeyCode::Char('q') | KeyCode::Esc => {
                        if app.mode != AppMode::Devices {
                            app.mode = AppMode::Devices;
                        } else {
                            break Ok(());
                        }
                    }
                    KeyCode::Up => {
                        match app.mode {
                            AppMode::Devices => {
                                if app.selected_device > 0 {
                                    app.selected_device -= 1;
                                }
                            }
                            AppMode::Services => {
                                if app.selected_service > 0 {
                                    app.selected_service -= 1;
                                }
                            }
                            AppMode::Characteristics => {
                                if app.selected_char > 0 {
                                    app.selected_char -= 1;
                                }
                            }
                        }
                    }
                    KeyCode::Down => {
                        match app.mode {
                            AppMode::Devices => {
                                if app.selected_device + 1 < app.devices.len() {
                                    app.selected_device += 1;
                                }
                            }
                            AppMode::Services => {
                                if app.selected_service + 1 < app.services.len() {
                                    app.selected_service += 1;
                                }
                            }
                            AppMode::Characteristics => {
                                if let Some(s) = app.selected_service_info() {
                                    if app.selected_char + 1 < s.characteristics.len() {
                                        app.selected_char += 1;
                                    }
                                }
                            }
                        }
                    }
                    KeyCode::Enter => {
                        match app.mode {
                            AppMode::Devices => {
                                let device_info = app.devices.get(app.selected_device)
                                    .map(|d| (d.addr.clone(), d.peripheral.clone()));
                                if let Some((addr, Some(p))) = device_info {
                                    if let Err(e) = gatt::connect(&p).await {
                                        app.push_log(format!("Connect failed: {e}"));
                                    } else {
                                        app.connected_peripheral = Some(p.clone());
                                        app.push_log(format!("Connected to {}", addr));
                                        match gatt::discover_services(&p).await {
                                            Ok(services) => {
                                                app.services.clear();
                                                for s in services {
                                                    let uuid = s.uuid.to_string();
                                                    let chars = s
                                                        .characteristics
                                                        .into_iter()
                                                        .map(|c| {
                                                            crate::app::CharacteristicInfo {
                                                                uuid: c.uuid.to_string(),
                                                                properties: c
                                                                    .properties
                                                                    .into_iter()
                                                                    .map(|p| format!("{:?}", p))
                                                                    .collect(),
                                                            }
                                                        })
                                                        .collect();
                                                    app.services.insert(
                                                        uuid.clone(),
                                                        crate::app::ServiceInfo { uuid, characteristics: chars },
                                                    );
                                                }
                                                app.mode = AppMode::Services;
                                                app.selected_service = 0;
                                            }
                                            Err(e) => {
                                                app.push_log(format!(
                                                    "Discover services failed: {e}"
                                                ));
                                            }
                                        }
                                    }
                                }
                            }
                            AppMode::Services => {
                                app.mode = AppMode::Characteristics;
                                app.selected_char = 0;
                            }
                            AppMode::Characteristics => {
                                // read action on Enter in char mode
                                if let Some(p) = &app.connected_peripheral {
                                    if let Some(s) = app.selected_service_info() {
                                        if let Some(c) = s.characteristics.get(app.selected_char) {
                                            // find actual characteristic object
                                            let services = p.services();
                                            // simplified: not doing actual read here to avoid complexity
                                            app.push_log(format!(
                                                "Selected char {} in service {}",
                                                c.uuid, s.uuid
                                            ));
                                        }
                                    }
                                }
                            }
                        }
                    }
                    KeyCode::Char('r') => {
                        if app.mode == AppMode::Characteristics {
                            app.push_log("Read not yet fully wired in TUI.");
                        }
                    }
                    KeyCode::Char('d') => {
                        if let Some(p) = &app.connected_peripheral {
                            let _ = gatt::disconnect(p).await;
                            app.connected_peripheral = None;
                            app.services.clear();
                            app.mode = AppMode::Devices;
                            app.push_log("Disconnected.");
                        }
                    }
                    _ => {}
                }
            }
            Some(Event::Ble(ble_event)) => {
                match ble_event {
                    BleEvent::DeviceFound { name, addr, rssi } => {
                        if !app.devices.iter().any(|d| d.addr == addr) {
                            app.devices.push(crate::app::DeviceInfo {
                                name: name.unwrap_or_else(|| "Unknown".to_string()),
                                addr,
                                rssi,
                                peripheral: None,
                            });
                        }
                    }
                    BleEvent::Log(msg) => app.push_log(msg),
                    BleEvent::Error(msg) => app.push_log(format!("ERROR: {msg}")),
                    _ => {}
                }
            }
            Some(Event::Tick) => {
                // poll adapter for new peripherals periodically
                if app.scan_active {
                    if let Ok(peripherals) = app.adapter.peripherals().await {
                        for p in peripherals {
                            let addr = p.address().to_string();
                            if app.devices.iter().any(|d| d.addr == addr) {
                                continue;
                            }
                            if let Ok(Some(props)) = p.properties().await {
                                app.devices.push(crate::app::DeviceInfo {
                                    name: props
                                        .local_name
                                        .unwrap_or_else(|| "Unknown".to_string()),
                                    addr,
                                    rssi: props.rssi,
                                    peripheral: Some(p),
                                });
                            }
                        }
                    }
                }
            }
            None => break Ok(()),
        }
    };

    crossterm::terminal::disable_raw_mode()?;
    crossterm::execute!(
        terminal.backend_mut(),
        crossterm::terminal::LeaveAlternateScreen,
        crossterm::event::DisableMouseCapture
    )?;
    terminal.show_cursor()?;

    // stop scan
    let _ = app.adapter.stop_scan().await;

    result
}

fn draw(frame: &mut Frame, app: &App) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Min(0), Constraint::Length(1)])
        .split(frame.area());

    let main_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(35), Constraint::Percentage(65)])
        .split(chunks[0]);

    let right_chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Percentage(50), Constraint::Percentage(50)])
        .split(main_chunks[1]);

    // Device list
    let device_items: Vec<ListItem> = app
        .devices
        .iter()
        .enumerate()
        .map(|(i, d)| {
            let style = if i == app.selected_device {
                Style::default()
                    .fg(Color::Black)
                    .bg(Color::Cyan)
                    .add_modifier(Modifier::BOLD)
            } else {
                Style::default()
            };
            let rssi_str = d.rssi.map_or("".to_string(), |r| format!(" ({r} dBm)"));
            ListItem::new(format!("{} {}{}", if i == app.selected_device { ">" } else { " " }, d.name, rssi_str)).style(style)
        })
        .collect();

    let device_list = List::new(device_items)
        .block(Block::default().borders(Borders::ALL).title("Devices (q: quit, d: disconnect)"));
    frame.render_widget(device_list, main_chunks[0]);

    // Services / Characteristics
    let service_items: Vec<ListItem> = app
        .services
        .values()
        .enumerate()
        .map(|(i, s)| {
            let style = if app.mode == AppMode::Services && i == app.selected_service {
                Style::default().fg(Color::Black).bg(Color::Green).add_modifier(Modifier::BOLD)
            } else {
                Style::default()
            };
            ListItem::new(format!("{} {}", if i == app.selected_service { ">" } else { " " }, s.uuid)).style(style)
        })
        .collect();

    let service_list = List::new(service_items)
        .block(Block::default().borders(Borders::ALL).title("Services"));
    frame.render_widget(service_list, right_chunks[0]);

    let char_items: Vec<ListItem> = if let Some(s) = app.selected_service_info() {
        s.characteristics
            .iter()
            .enumerate()
            .map(|(i, c)| {
                let style = if app.mode == AppMode::Characteristics && i == app.selected_char {
                    Style::default().fg(Color::Black).bg(Color::Yellow).add_modifier(Modifier::BOLD)
                } else {
                    Style::default()
                };
                let props = c.properties.join(", ");
                ListItem::new(format!(
                    "{} {} [{}]",
                    if i == app.selected_char { ">" } else { " " },
                    c.uuid,
                    props
                )).style(style)
            })
            .collect()
    } else {
        vec![]
    };

    let char_list = List::new(char_items)
        .block(Block::default().borders(Borders::ALL).title("Characteristics (Enter: read)"));
    frame.render_widget(char_list, right_chunks[1]);

    // Status bar
    let status = format!(
        "Mode: {:?} | Devices: {} | Connected: {} | ↑↓ navigate | Enter select | q quit",
        app.mode,
        app.devices.len(),
        app.connected_peripheral.is_some()
    );
    let status_bar = Paragraph::new(status).style(Style::default().fg(Color::White).bg(Color::Blue));
    frame.render_widget(status_bar, chunks[1]);
}
