// CommandBar.tsx — unified natural-language command input

import { useRef } from "react";
import { useLoomStore } from "../store";

const QUICK_TAGS = [
  "pause all",
  "status report",
  "handoff Windsurf → Claude",
  "show diffs",
  "cost breakdown",
  "focus mode",
  "approve all waiting",
  "reset all errors",
];

// ─── Simple command parser ─────────────────────────────────────────────────────
// In v2 this will be replaced by a Tauri command that calls an LLM

function handleCommand(cmd: string, store: ReturnType<typeof useLoomStore.getState>) {
  const lower = cmd.toLowerCase().trim();

  if (lower === "pause all") {
    store.agents
      .filter((a) => a.status === "running")
      .forEach((a) => store.pauseAgent(a.id));
    store.addFeedEvent({
      agentId: "system",
      agentName: "You",
      type: "user",
      headline: "Paused all running agents",
      detail: "Use 'resume all' to restart",
      timestamp: "just now",
      read: false,
    });
    return;
  }

  if (lower === "approve all waiting") {
    store.agents
      .filter((a) => a.status === "waiting")
      .forEach((a) => store.approveAgent(a.id));
    return;
  }

  if (lower === "reset all errors") {
    store.agents
      .filter((a) => a.status === "error")
      .forEach((a) => store.resetAgentContext(a.id));
    return;
  }

  if (lower === "status report") {
    const running = store.agents.filter((a) => a.status === "running").length;
    const waiting = store.agents.filter((a) => a.status === "waiting").length;
    const errors = store.agents.filter((a) => a.status === "error").length;
    store.addFeedEvent({
      agentId: "system",
      agentName: "Loom",
      type: "user",
      headline: `Status: ${running} running · ${waiting} waiting · ${errors} errors`,
      detail: `$${store.stats.totalCostToday.toFixed(2)} spent · ${Math.round(store.stats.totalTokensToday / 1000)}k tokens · ${store.stats.tasksDoneToday} tasks done`,
      timestamp: "just now",
      read: false,
    });
    return;
  }

  if (lower === "cost breakdown") {
    const lines = store.agents
      .map((a) => `${a.name}: $${a.costUsd.toFixed(2)}`)
      .join(" · ");
    store.addFeedEvent({
      agentId: "system",
      agentName: "Loom",
      type: "user",
      headline: "Cost breakdown",
      detail: lines,
      timestamp: "just now",
      read: false,
    });
    return;
  }

  // Default: echo as a feed event (v2 will route to AI)
  store.addFeedEvent({
    agentId: "system",
    agentName: "You",
    type: "user",
    headline: cmd,
    detail: "Command received — AI routing coming in v2",
    timestamp: "just now",
    read: false,
  });
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CommandBar() {
  const commandValue = useLoomStore((s) => s.commandValue);
  const setCommandValue = useLoomStore((s) => s.setCommandValue);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = () => {
    const val = commandValue.trim();
    if (!val) return;
    handleCommand(val, useLoomStore.getState());
    setCommandValue("");
    inputRef.current?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") submit();
    if (e.key === "Escape") setCommandValue("");
  };

  const onTagClick = (tag: string) => {
    setCommandValue(tag);
    // Auto-execute quick tags immediately
    handleCommand(tag, useLoomStore.getState());
    setCommandValue("");
    inputRef.current?.focus();
  };

  return (
    <div className="command-bar">
      <div className="command-input-wrap">
        <div className="cmd-icon">⌘</div>
        <input
          ref={inputRef}
          className="command-input"
          type="text"
          placeholder="Talk to your agents — ask questions, give instructions, or hand off context…"
          value={commandValue}
          onChange={(e) => setCommandValue(e.target.value)}
          onKeyDown={onKeyDown}
          autoFocus
        />
        {commandValue && (
          <div className="cmd-hint" style={{ cursor: "pointer" }} onClick={submit}>
            ↵
          </div>
        )}
        {!commandValue && <div className="cmd-hint">⌘K</div>}
      </div>

      <div className="command-tags">
        {QUICK_TAGS.map((tag) => (
          <span
            key={tag}
            className="cmd-tag"
            onClick={() => onTagClick(tag)}
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}
