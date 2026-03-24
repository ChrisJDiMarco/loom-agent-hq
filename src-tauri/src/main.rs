// Prevents an additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod commands;

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            use tauri::Manager;
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_title("Loom — Agent HQ");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::scan_agent_processes,
            commands::get_system_stats,
            commands::start_watching_directory,
            commands::pause_process,
            commands::resume_process,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Loom");
}
