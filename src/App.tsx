// App.tsx — Root layout, mirrors the macOS window chrome from the original design

import { useEffect } from "react";
import { TitleBar } from "./components/TitleBar";
import { Sidebar } from "./components/Sidebar";
import { LiveFeed } from "./components/LiveFeed";
import { AgentCards } from "./components/AgentCards";
import { CommandBar } from "./components/CommandBar";
import { useLoomStore } from "./store";

// ─── Simulated live updates (remove in production — replace with Tauri events) ─

function useSimulatedUpdates() {
  const addFeedEvent = useLoomStore((s) => s.addFeedEvent);

  useEffect(() => {
    // Simulate a new event every ~15 seconds to demo the live feed
    const timer = setInterval(() => {
      const events = [
        {
          agentId: "claude-code-1",
          agentName: "Claude Code",
          type: "running" as const,
          headline: "Still working on <code>validateSession()</code>",
          detail: "Writing RS256 key rotation logic…",
          timestamp: "just now",
          read: false,
        },
        {
          agentId: "cursor-1",
          agentName: "Cursor",
          type: "completed" as const,
          headline: "Completed test case #15 for <code>UserService</code>",
          detail: "it('handles concurrent requests correctly') ✓",
          timestamp: "just now",
          read: false,
        },
      ];
      const event = events[Math.floor(Math.random() * events.length)];
      addFeedEvent(event);
    }, 15000);

    return () => clearInterval(timer);
  }, [addFeedEvent]);
}

// ─── App ──────────────────────────────────────────────────────────────────────

export default function App() {
  useSimulatedUpdates();

  return (
    <div className="app-root">
      <TitleBar />
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
