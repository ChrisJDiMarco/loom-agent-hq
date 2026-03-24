// App.tsx — Root layout + Tauri backend wiring

import { useEffect } from "react";
import { TitleBar } from "./components/TitleBar";
import { Sidebar } from "./components/Sidebar";
import { LiveFeed } from "./components/LiveFeed";
import { AgentCards } from "./components/AgentCards";
import { CommandBar } from "./components/CommandBar";
import { useAgentScanner } from "./hooks/useAgentScanner";
import { isTauriEnv } from "./hooks/useTauri";
import { useLoomStore } from "./store";

// ─── Browser-only demo simulation ────────────────────────────────────────────
// Fires only when NOT running inside Tauri — keeps preview.html lively.
// Remove this once the real Tauri watcher (Phase 2) covers all events.

function useDemoSimulation() {
  const addFeedEvent = useLoomStore((s) => s.addFeedEvent);

  useEffect(() => {
    if (isTauriEnv()) return; // real backend handles this

    const demoEvents = [
      {
        agentId: "demo",
        agentName: "Claude Code",
        type: "running" as const,
        headline: "Working on <code>validateSession()</code>",
        detail: "Writing RS256 key rotation logic… (demo mode)",
        timestamp: "just now",
        read: false,
      },
      {
        agentId: "demo",
        agentName: "Cursor",
        type: "completed" as const,
        headline: "Completed another test case",
        detail: "UserService test suite progressing (demo mode)",
        timestamp: "just now",
        read: false,
      },
    ];

    const timer = setInterval(() => {
      const event = demoEvents[Math.floor(Math.random() * demoEvents.length)];
      addFeedEvent(event);
    }, 12000);

    return () => clearInterval(timer);
  }, [addFeedEvent]);
}

// ─── Connection status banner ─────────────────────────────────────────────────

function ConnectionBanner() {
  const isInTauri = isTauriEnv();
  if (isInTauri) return null;

  return (
    <div style={{
      background: "rgba(255,149,0,0.12)",
      borderBottom: "1px solid rgba(255,149,0,0.2)",
      padding: "6px 20px",
      fontSize: "12px",
      color: "#A05F00",
      display: "flex",
      alignItems: "center",
      gap: "6px",
      flexShrink: 0,
    }}>
      <span>⚠️</span>
      <span>
        <strong>Browser preview mode</strong> — process scanning disabled.
        Run <code style={{ background: "rgba(0,0,0,0.06)", padding: "1px 5px", borderRadius: 3 }}>
          npm run tauri dev
        </code> to connect the live backend.
      </span>
    </div>
  );
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  // Wire Rust backend — polls scan_agent_processes + listens for agent-status events
  useAgentScanner();

  // Demo simulation for browser preview
  useDemoSimulation();

  return (
    <div className="app-root">
      <TitleBar />
      <ConnectionBanner />
      <div className="main-layout">
        <Sidebar />
        <div className="content">
          <div className="overview">
            <LiveFeed />
            <AgentCards />
          </div>
          <CommandBar />
        </div>
      </div>
    </div>
  );
}
