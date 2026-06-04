use anyhow::Result;
use clap::{Parser, Subcommand};
use tracing::Level;

mod app;
mod event;
mod gatt;
mod scanner;
mod ui;

#[derive(Parser)]
#[command(name = "ssst-cli")]
#[command(about = "BLE debugging TUI CLI")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Scan for BLE devices and print to stdout
    Scan {
        /// Scan duration in seconds
        #[arg(short, long, default_value = "10")]
        duration: u64,
    },
    /// Launch interactive TUI
    Interactive,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt()
        .with_max_level(Level::WARN)
        .init();

    let cli = Cli::parse();

    match cli.command {
        Commands::Scan { duration } => scanner::run_scan(duration).await,
        Commands::Interactive => app::run_tui().await,
    }
}
