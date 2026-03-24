// lib.rs — mobile entry point only (desktop uses main.rs)
// This file exists so Tauri can build iOS/Android targets in the future.

mod commands;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
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
