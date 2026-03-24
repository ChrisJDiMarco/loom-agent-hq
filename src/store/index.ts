import { create } from "zustand";
import type { Agent, AgentType, DetectedProcess, FeedEvent, LoomStore, SessionStats } from "../types";

// ─── Seed Data (used when Tauri backend hasn't reported yet) ──────────────────

const SEED_AGENTS: Agent[] = [
  {
    id: "claude-code-1",
    name: "Claude Code",
    type: "claude-code",
    status: "idle",
    task: "Waiting for process scan…",
    elapsed: "—",
    progress: 0,
    outputSnippet: "Loom is scanning for running AI agents on your Mac…",
    lastActivity: new Date().toISOString(),
    tokensUsed: 0,
    costUsd: 0,
    needsReview: false,
    pid: null,
    memoryMb: 0,
    cpuUsage: 0,
  },
];

const SEED_FEED: FeedEvent[] = [
  {
    id: "f-boot",
    agentId: "system",
    agentName: "Loom",
    type: "user",
    headline: "Loom started — scanning for AI agent processes",
    detail: "Process scan runs every 10s · events will appear here in real time",
    timestamp: "just now",
    read: false,
  },
];

const SEED_STATS: SessionStats = {
  running: 0,
  totalCostToday: 0,
  totalTokensToday: 0,
  tasksDoneToday: 0,
  cpuUsage: 0,
  totalMemoryGb: 0,
  usedMemoryGb: 0,
};

// ─── Process → Agent type mapping ─────────────────────────────────────────────
// Matches the same list in src-tauri/src/lib.rs KNOWN_AGENTS

const PROCESS_TO_TYPE: Record<string, AgentType> = {
  "claude-code": "claude-code",
  "cursor":      "cursor",
  "windsurf":    "windsurf",
  "devin":       "devin",
  "chatgpt":     "chatgpt",
  "copilot":     "copilot",
  "node-agent":  "custom",
  "vscode":      "copilot",
};

const TYPE_DISPLAY: Record<AgentType, { name: string; emoji: string }> = {
  "claude-code": { name: "Claude Code",  emoji: "🤖" },
  "cursor":      { name: "Cursor",       emoji: "✳️" },
  "windsurf":    { name: "Windsurf",     emoji: "🌊" },
  "devin":       { name: "Devin",        emoji: "🦾" },
  "chatgpt":     { name: "ChatGPT",      emoji: "💬" },
  "copilot":     { name: "Copilot",      emoji: "🐙" },
  "custom":      { name: "Agent",        emoji: "⚙️" },
};

// ─── Store ────────────────────────────────────────────────────────────────────

let _nextEventId = 100;

export const useLoomStore = create<LoomStore>((set, get) => ({
  agents: SEED_AGENTS,
  feed: SEED_FEED,
  stats: SEED_STATS,
  selectedAgentId: null,
  commandValue: "",

  // ── Navigation ──────────────────────────────────────────────────────────────
  selectAgent: (id) => set({ selectedAgentId: id }),
  setCommandValue: (val) => set({ commandValue: val }),
  markAllRead: () =>
    set((s) => ({ feed: s.feed.map((e) => ({ ...e, read: true })) })),

  // ── Process sync (called by useAgentScanner every 10s) ─────────────────────
  syncProcesses: (detected: DetectedProcess[]) => {
    set((s) => {
      const now = new Date().toISOString()
      const existingIds = new Set(s.agents.map((a) => a.id))
      const updatedAgents = [...s.agents]
      const newEvents: FeedEvent[] = []

      // Build a set of pids currently active
      const activePids = new Set(detected.map((p) => p.pid))

      // Mark agents whose process is no longer running as idle
      updatedAgents.forEach((agent) => {
        if (agent.pid && !activePids.has(agent.pid)) {
          if (agent.status === "running") {
            agent.status = "idle"
            agent.task = "Process stopped"
            agent.pid = null
            newEvents.push({
              id: `f${_nextEventId++}`,
              agentId: agent.id,
              agentName: agent.name,
              type: "user",
              headline: `${agent.name} process stopped`,
              detail: "Process no longer detected — may have finished or been closed",
              timestamp: "just now",
              read: false,
            })
          }
        }
      })

      // Add or update agents from scan results
      detected.forEach((proc) => {
        const agentType = PROCESS_TO_TYPE[proc.agent_type] ?? "custom"
        const agentId = `${agentType}-${proc.pid}`
        const display = TYPE_DISPLAY[agentType]

        if (!existingIds.has(agentId)) {
          // New process detected — add to roster
          const newAgent: Agent = {
            id: agentId,
            name: display.name,
            type: agentType,
            status: "running",
            task: "Active — monitoring output",
            elapsed: "0:00",
            progress: 0,
            outputSnippet: `Process detected: ${proc.name} (PID ${proc.pid})`,
            lastActivity: now,
            tokensUsed: 0,
            costUsd: 0,
            needsReview: false,
            pid: proc.pid,
            memoryMb: proc.memory_mb,
            cpuUsage: proc.cpu_usage,
          }
          updatedAgents.push(newAgent)
          existingIds.add(agentId)

          newEvents.push({
            id: `f${_nextEventId++}`,
            agentId: agentId,
            agentName: display.name,
            type: "running",
            headline: `${display.name} detected`,
            detail: `PID ${proc.pid} · ${proc.memory_mb}MB · ${proc.cpu_usage.toFixed(1)}% CPU`,
            timestamp: "just now",
            read: false,
          })
        } else {
          // Known process — update live metrics
          const idx = updatedAgents.findIndex((a) => a.id === agentId)
          if (idx !== -1) {
            updatedAgents[idx] = {
              ...updatedAgents[idx],
              status: "running",
              pid: proc.pid,
              memoryMb: proc.memory_mb,
              cpuUsage: proc.cpu_usage,
              lastActivity: now,
              outputSnippet: `PID ${proc.pid} · ${proc.memory_mb}MB · ${proc.cpu_usage.toFixed(1)}% CPU`,
            }
          }
        }
      })

      const running = updatedAgents.filter((a) => a.status === "running").length

      return {
        agents: updatedAgents,
        feed: [...newEvents, ...s.feed].slice(0, 50),
        stats: {
          ...s.stats,
          running,
        },
      }
    })
  },

  // ── System stats (CPU / memory from Rust) ──────────────────────────────────
  setSystemStats: (stats: { cpu_usage: number; total_memory_gb: number; used_memory_gb: number }) => {
    set((s) => ({
      stats: {
        ...s.stats,
        cpuUsage: stats.cpu_usage,
        totalMemoryGb: stats.total_memory_gb,
        usedMemoryGb: stats.used_memory_gb,
      },
    }))
  },

  // ── Agent actions ───────────────────────────────────────────────────────────
  pauseAgent: (id) =>
    set((s) => ({
      agents: s.agents.map((a) =>
        a.id === id ? { ...a, status: "idle" as const, task: "paused" } : a
      ),
      stats: {
        ...s.stats,
        running: Math.max(0, s.stats.running - 1),
      },
    })),

  resumeAgent: (id) =>
    set((s) => ({
      agents: s.agents.map((a) =>
        a.id === id ? { ...a, status: "running" as const } : a
      ),
      stats: { ...s.stats, running: s.stats.running + 1 },
    })),

  approveAgent: (id) => {
    const agent = get().agents.find((a) => a.id === id)
    if (!agent) return
    set((s) => ({
      agents: s.agents.map((a) =>
        a.id === id
          ? { ...a, status: "idle" as const, needsReview: false, task: "approved — done" }
          : a
      ),
      stats: {
        ...s.stats,
        tasksDoneToday: s.stats.tasksDoneToday + 1,
        running: Math.max(0, s.stats.running - 1),
      },
    }))
    get().addFeedEvent({
      agentId: id,
      agentName: "You",
      type: "completed",
      headline: `Approved ${agent.name}'s work`,
      detail: "Task marked complete",
      timestamp: "just now",
      read: false,
    })
  },

  rejectAgent: (id) => {
    const agent = get().agents.find((a) => a.id === id)
    if (!agent) return
    set((s) => ({
      agents: s.agents.map((a) =>
        a.id === id
          ? { ...a, status: "idle" as const, needsReview: false, task: "rejected — needs rework" }
          : a
      ),
    }))
  },

  resetAgentContext: (id) =>
    set((s) => ({
      agents: s.agents.map((a) =>
        a.id === id
          ? {
              ...a,
              status: "idle" as const,
              progress: 0,
              tokensUsed: 0,
              task: "context reset — ready",
              errorMessage: undefined,
            }
          : a
      ),
    })),

  handoffAgent: (fromId, toId) => {
    const from = get().agents.find((a) => a.id === fromId)
    const to   = get().agents.find((a) => a.id === toId)
    if (!from || !to) return
    get().addFeedEvent({
      agentId: fromId,
      agentName: "You",
      type: "handoff",
      headline: `Handed off ${from.name} → ${to.name}`,
      detail: "Context and task state transferred",
      timestamp: "just now",
      read: false,
    })
  },

  addFeedEvent: (event) =>
    set((s) => ({
      feed: [{ ...event, id: `f${_nextEventId++}` }, ...s.feed].slice(0, 50),
    })),
}))
