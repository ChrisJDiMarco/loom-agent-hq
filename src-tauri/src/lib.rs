// lib.rs — Tauri backend for Loom Agent HQ
//
// Phase 1 (current): process detection + stubbed commands
// Phase 2:           file-system watching for agent output files
// Phase 3:           MCP integration for real agent state

use serde::{Deserialize, Serialize};
use sysinfo::System;
use tauri::Manager;

// ─── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DetectedProcess {
    pub pid: u32,
    pub name: String,
    pub agent_type: String,
    pub cpu_usage: f32,
    pub memory_mb: u64,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct AgentStatusEvent {
    pub agent_id: String,
    pub agent_name: String,
    pub event_type: String,
    pub message: String,
    pub timestamp: String,
}

// ─── Known agent process names ─────────────────────────────────────────────────
// Maps process names → agent type labels shown in the UI

const KNOWN_AGENTS: &[(&str, &str)] = &[
    ("claude",        "claude-code"),
    ("cursor",        "cursor"),
    ("code",          "vscode"),       // VS Code (Copilot)
    ("windsurf",      "windsurf"),
    ("devin",         "devin"),
    ("chatgpt",       "chatgpt"),
    ("node",          "node-agent"),   // Generic node-based agents
];

// ─── Commands ─────────────────────────────────────────────────────────────────

/// Scan running processes and return known AI agent processes.
/// Called by the frontend on startup and periodically.
#[tauri::command]
pub fn scan_agent_processes() -> Vec<DetectedProcess> {
    let mut sys = System::new_all();
    sys.refresh_all();

    let mut detected = Vec::new();

    for (pid, process) in sys.processes() {
        let name = process.name().to_string_lossy().to_lowercase();

        if let Some((_, agent_type)) = KNOWN_AGENTS.iter().find(|(proc, _)| name.contains(proc)) {
            detected.push(DetectedProcess {
                pid: pid.as_u32(),
                name: process.name().to_string_lossy().to_string(),
                agent_type: agent_type.to_string(),
                cpu_usage: process.cpu_usage(),
                memory_mb: process.memory() / 1_048_576,
            });
        }
    }

    detected
}

/// Return basic system stats (CPU, memory) for the status bar.
#[tauri::command]
pub fn get_system_stats() -> serde_json::Value {
    let mut sys = System::new_all();
    sys.refresh_cpu_all();
    sys.refresh_memory();

    serde_json::json!({
        "cpu_usage": sys.global_cpu_usage(),
        "total_memory_gb": sys.total_memory() / 1_073_741_824,
        "used_memory_gb": sys.used_memory() / 1_073_741_824,
    })
}

/// Placeholder: in Phase 2, this will watch a directory for agent output files
/// and emit `agent-status` events via Tauri's event system.
#[tauri::command]
pub fn start_watching_directory(_app: tauri::AppHandle, _path: String) -> Result<(), String> {
    // TODO Phase 2: use `notify` crate to watch ~/.claude/ or project dirs
    // and emit events like:
    //   app.emit("agent-status", AgentStatusEvent { ... })
    Ok(())
}

/// Pause a process by PID (sends SIGSTOP on macOS/Linux).
#[tauri::command]
pub fn pause_process(pid: u32) -> Result<(), String> {
    #[cfg(unix)]
    {
        use std::process::Command;
        Command::new("kill")
            .args(["-STOP", &pid.to_string()])
            .output()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

/// Resume a paused process by PID (sends SIGCONT on macOS/Linux).
#[tauri::command]
pub fn resume_process(pid: u32) -> Result<(), String> {
    #[cfg(unix)]
    {
        use std::process::Command;
        Command::new("kill")
            .args(["-CONT", &pid.to_string()])
            .output()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

// ─── App ──────────────────────────────────────────────────────────────────────

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_process::init())
        .setup(|app| {
            // Set a nice default window size for macOS
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_title("Loom — Agent HQ");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            scan_agent_processes,
            get_system_stats,
            start_watching_directory,
            pause_process,
            resume_process,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Loom");
}
