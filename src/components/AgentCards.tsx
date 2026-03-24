// AgentCards.tsx — detailed cards for active/errored agents

import { useLoomStore } from "../store";
import type { Agent } from "../types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cardAccent(agent: Agent) {
  if (agent.status === "running") return "card-green";
  if (agent.status === "waiting") return "card-amber";
  if (agent.status === "error") return "card-red";
  return "card-purple";
}

function progressColor(agent: Agent) {
  if (agent.status === "running") return "var(--green)";
  if (agent.status === "waiting") return "var(--amber)";
  if (agent.status === "error") return "var(--red)";
  return "var(--purple)";
}

function statusBadge(agent: Agent) {
  if (agent.status === "running") return { cls: "badge-running", label: "running" };
  if (agent.status === "waiting") return { cls: "badge-waiting", label: "awaiting" };
  if (agent.status === "error") return { cls: "badge-error", label: "error" };
  return { cls: "badge-idle", label: "idle" };
}

// ─── Single Card ──────────────────────────────────────────────────────────────

function AgentCard({ agent, delay }: { agent: Agent; delay: number }) {
  const pauseAgent = useLoomStore((s) => s.pauseAgent);
  const resumeAgent = useLoomStore((s) => s.resumeAgent);
  const approveAgent = useLoomStore((s) => s.approveAgent);
  const rejectAgent = useLoomStore((s) => s.rejectAgent);
  const resetAgentContext = useLoomStore((s) => s.resetAgentContext);
  const handoffAgent = useLoomStore((s) => s.handoffAgent);
  const agents = useLoomStore((s) => s.agents);

  const { cls, label } = statusBadge(agent);

  const handleHandoff = () => {
    // Handoff to claude-code if available, otherwise first other running agent
    const target = agents.find(
      (a) => a.id !== agent.id && (a.status === "running" || a.status === "idle")
    );
    if (target) handoffAgent(agent.id, target.id);
  };

  return (
    <div
      className={`agent-card ${cardAccent(agent)}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Header */}
      <div className="card-top">
        <div className="card-name">{agent.name}</div>
        <div className={`card-status ${cls}`}>{label}</div>
      </div>

      {/* Progress bar */}
      <div className="card-progress">
        <div
          className="card-progress-fill"
          style={{ width: `${agent.progress}%`, background: progressColor(agent) }}
        />
      </div>

      {/* Output snippet */}
      <div className="card-output">
        {agent.outputSnippet.split("\n").map((line, i) => (
          <span key={i}>
            {line}
            {i < agent.outputSnippet.split("\n").length - 1 && <br />}
          </span>
        ))}
      </div>

      {/* Footer */}
      <div className="card-footer">
        <div className="card-elapsed">
          {agent.status === "waiting"
            ? `done — waiting`
            : agent.status === "error"
            ? `stopped`
            : `elapsed ${agent.elapsed}`}
        </div>

        <div className="card-actions">
          {/* Running → pause / inspect / handoff */}
          {agent.status === "running" && (
            <>
              <button className="card-btn" onClick={() => pauseAgent(agent.id)}>pause</button>
              <button className="card-btn">inspect</button>
              <button className="card-btn" onClick={handleHandoff}>→ handoff</button>
            </>
          )}

          {/* Waiting → approve / reject / handoff */}
          {agent.status === "waiting" && (
            <>
              <button
                className="card-btn"
                style={{ color: "var(--green)" }}
                onClick={() => approveAgent(agent.id)}
              >
                approve
              </button>
              <button className="card-btn" onClick={() => rejectAgent(agent.id)}>
                reject
              </button>
              <button className="card-btn" onClick={handleHandoff}>→ handoff</button>
            </>
          )}

          {/* Error → retry / reset ctx / handoff */}
          {agent.status === "error" && (
            <>
              <button className="card-btn" onClick={() => resumeAgent(agent.id)}>retry</button>
              <button className="card-btn" onClick={() => resetAgentContext(agent.id)}>
                reset ctx
              </button>
              <button className="card-btn" onClick={handleHandoff}>→ handoff</button>
            </>
          )}

          {/* Idle → resume */}
          {agent.status === "idle" && (
            <button className="card-btn" onClick={() => resumeAgent(agent.id)}>resume</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AgentCards() {
  const agents = useLoomStore((s) => s.agents);
  // Show non-idle agents in cards (running, waiting, error)
  const featured = agents.filter((a) => a.status !== "idle");

  return (
    <div>
      <div className="section-header">
        <div className="section-title">Agent Detail</div>
        <div className="section-action">
          {featured.length} active
        </div>
      </div>
      <div className="agent-cards">
        {featured.map((agent, i) => (
          <AgentCard key={agent.id} agent={agent} delay={i * 60} />
        ))}
      </div>
    </div>
  );
}
