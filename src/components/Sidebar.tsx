// Sidebar.tsx — Agent roster + session stats

import { useLoomStore } from "../store";
import type { Agent } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function statusDotClass(status: Agent["status"]) {
  return `agent-dot ${
    status === "running"
      ? "running"
      : status === "waiting"
      ? "waiting"
      : status === "error"
      ? "error"
      : "idle"
  }`;
}

function badgeClass(status: Agent["status"]) {
  return `agent-badge ${
    status === "running"
      ? "badge-running"
      : status === "waiting"
      ? "badge-waiting"
      : status === "error"
      ? "badge-error"
      : "badge-idle"
  }`;
}

function badgeLabel(agent: Agent) {
  if (agent.status === "running") return agent.elapsed;
  if (agent.status === "waiting") return "review";
  if (agent.status === "error") return "error";
  return "idle";
}

// ─── Component ────────────────────────────────────────────────────────────────

export function Sidebar() {
  const agents = useLoomStore((s) => s.agents);
  const stats = useLoomStore((s) => s.stats);
  const selectedId = useLoomStore((s) => s.selectedAgentId);
  const selectAgent = useLoomStore((s) => s.selectAgent);

  const active = agents.filter(
    (a) => a.status === "running" || a.status === "waiting"
  );
  const idle = agents.filter(
    (a) => a.status === "idle" || a.status === "error"
  );

  const renderAgent = (agent: Agent) => (
    <div
      key={agent.id}
      className={`agent-item${selectedId === agent.id ? " active" : ""}`}
      onClick={() => selectAgent(agent.id === selectedId ? null : agent.id)}
    >
      <div className={statusDotClass(agent.status)} />
      <div className="agent-info">
        <div className="agent-name">{agent.name}</div>
        <div className="agent-meta">{agent.task}</div>
      </div>
      <span className={badgeClass(agent.status)}>{badgeLabel(agent)}</span>
    </div>
  );

  return (
    <div className="sidebar">
      {/* Active agents */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">Active</div>
        {active.length === 0 ? (
          <div className="agent-meta" style={{ padding: "8px 10px", color: "var(--text-dim)" }}>
            No active agents
          </div>
        ) : (
          active.map(renderAgent)
        )}
      </div>

      {/* Idle / error agents */}
      <div className="sidebar-section">
        <div className="sidebar-section-title">Idle</div>
        {idle.map(renderAgent)}
      </div>

      <div className="sidebar-spacer" />

      {/* Quick stats footer */}
      <div className="sidebar-footer">
        <div className="quick-stats">
          <div className="stat-box">
            <div className="stat-val">{stats.running}</div>
            <div className="stat-label">Running</div>
          </div>
          <div className="stat-box">
            <div className="stat-val">
              ${stats.totalCostToday.toFixed(2)}
            </div>
            <div className="stat-label">Today</div>
          </div>
          <div className="stat-box">
            <div className="stat-val">
              {stats.totalTokensToday >= 1000
                ? `${Math.round(stats.totalTokensToday / 1000)}k`
                : stats.totalTokensToday}
            </div>
            <div className="stat-label">Tokens</div>
          </div>
          <div className="stat-box">
            <div className="stat-val">{stats.tasksDoneToday}</div>
            <div className="stat-label">Done</div>
          </div>
        </div>
      </div>
    </div>
  );
}
