use serde::{Deserialize, Serialize};
use sysinfo::System;

// ─── Types ────────────────────────────────────────────────────────────────────

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct DetectedProcess {
    pub pid: u32,
    pub name: String,
    pub agent_type: String,
    pub cpu_usage: f32,
    pub memory_mb: u64,
}

// ─── Known agent process names ─────────────────────────────────────────────────

const KNOWN_AGENTS: &[(&str, &str)] = &[
    ("claude",    "claude-code"),
    ("cursor",    "cursor"),
    ("code",      "vscode"),
    ("windsurf",  "windsurf"),
    ("devin",     "devin"),
    ("chatgpt",   "chatgpt"),
    ("node",      "node-agent"),
];

// ─── Commands ─────────────────────────────────────────────────────────────────

#[tauri::command]
pub fn scan_agent_processes() -> Vec<DetectedProcess> {
    let mut sys = System::new_all();
    sys.refresh_all();

    let mut detected = Vec::new();
    for (pid, process) in sys.processes() {
        let name = process.name().to_string_lossy().to_lowercase();
        if let Some((_, agent_type)) = KNOWN_AGENTS.iter().find(|(p, _)| name.contains(p)) {
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

#[tauri::command]
pub fn start_watching_directory(_app: tauri::AppHandle, _path: String) -> Result<(), String> {
    // Phase 2: use notify crate to watch agent output dirs
    Ok(())
}

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
