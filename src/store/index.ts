import { create } from "zustand";
import type { Agent, FeedEvent, LoomStore, SessionStats } from "../types";

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_AGENTS: Agent[] = [
  {
    id: "claude-code-1",
    name: "Claude Code",
    type: "claude-code",
    status: "running",
    task: "refactoring auth",
    elapsed: "3:42",
    progress: 72,
    outputSnippet:
      "Refactoring validateSession() to use\nJWT verification with RS256…\nMoving token refresh to middleware…",
    lastActivity: new Date().toISOString(),
    tokensUsed: 84200,
    costUsd: 0.92,
    needsReview: false,
  },
  {
    id: "cursor-1",
    name: "Cursor — Tab 2",
    type: "cursor",
    status: "running",
    task: "writing tests",
    elapsed: "1:18",
    progress: 63,
    outputSnippet:
      "describe('UserService', () => {\n  it('creates user with valid…\n  it('rejects duplicate email…",
    lastActivity: new Date().toISOString(),
    tokensUsed: 31000,
    costUsd: 0.44,
    needsReview: false,
  },
  {
    id: "devin-1",
    name: "Devin",
    type: "devin",
    status: "waiting",
    task: "awaiting review",
    elapsed: "done",
    progress: 100,
    outputSnippet:
      "PR #214 — payment flow complete.\nStripe webhook handler + idempotency\nkeys. Ready for your review.",
    lastActivity: new Date(Date.now() - 120000).toISOString(),
    tokensUsed: 11800,
    costUsd: 0.28,
    needsReview: true,
  },
  {
    id: "copilot-1",
    name: "Copilot",
    type: "copilot",
    status: "idle",
    task: "VS Code",
    elapsed: "—",
    progress: 0,
    outputSnippet: "Waiting for input…",
    lastActivity: new Date(Date.now() - 600000).toISOString(),
    tokensUsed: 0,
    costUsd: 0,
    needsReview: false,
  },
  {
    id: "chatgpt-1",
    name: "ChatGPT",
    type: "chatgpt",
    status: "idle",
    task: "research tab",
    elapsed: "—",
    progress: 0,
    outputSnippet: "Idle.",
    lastActivity: new Date(Date.now() - 900000).toISOString(),
    tokensUsed: 0,
    costUsd: 0,
    needsReview: false,
  },
  {
    id: "windsurf-1",
    name: "Windsurf",
    type: "windsurf",
    status: "error",
    task: "token limit hit",
    elapsed: "stopped",
    progress: 100,
    outputSnippet:
      "ERR: Context window exhausted\nat API integration task line 847\nSuggest: split task or handoff",
    lastActivity: new Date(Date.now() - 300000).toISOString(),
    tokensUsed: 128000,
    costUsd: 0.2,
    needsReview: false,
    errorMessage: "Context window exhausted (128k tokens)",
  },
];

const SEED_FEED: FeedEvent[] = [
  {
    id: "f1",
    agentId: "claude-code-1",
    agentName: "Claude Code",
    type: "completed",
    headline: "Finished refactoring <code>authMiddleware.ts</code>",
    detail: "4 files changed · +87 -143 lines · passes all tests",
    timestamp: "12s ago",
    read: false,
  },
  {
    id: "f2",
    agentId: "devin-1",
    agentName: "Devin",
    type: "waiting",
    headline: "Needs approval to merge <code>feat/payment-flow</code>",
    detail: "PR #214 ready — 3 new files, 1 migration",
    timestamp: "2m ago",
    read: false,
  },
  {
    id: "f3",
    agentId: "cursor-1",
    agentName: "Cursor",
    type: "running",
    headline: "Generating unit tests for <code>UserService</code>",
    detail: "14 of 22 test cases written · estimating 40s remaining",
    timestamp: "now",
    read: true,
  },
  {
    id: "f4",
    agentId: "windsurf-1",
    agentName: "Windsurf",
    type: "error",
    headline: "Hit context limit on API integration task",
    detail: "128k tokens exhausted — needs context reset or handoff",
    timestamp: "5m ago",
    read: false,
  },
  {
    id: "f5",
    agentId: "devin-1",
    agentName: "You",
    type: "handoff",
    headline: "Promoted Devin's DB schema draft to Claude Code",
    detail: "context handoff: schema.prisma + migration notes",
    timestamp: "8m ago",
    read: true,
  },
];

const SEED_STATS: SessionStats = {
  running: 3,
  totalCostToday: 1.84,
  totalTokensToday: 127000,
  tasksDoneToday: 12,
};

// ─── Store ────────────────────────────────────────────────────────────────────

let _nextEventId = 100;

export const useLoomStore = create<LoomStore>((set, get) => ({
  agents: SEED_AGENTS,
  feed: SEED_FEED,
  stats: SEED_STATS,
  selectedAgentId: null,
  commandValue: "",

  selectAgent: (id) => set({ selectedAgentId: id }),
  setCommandValue: (val) => set({ commandValue: val }),

  markAllRead: () =>
    set((s) => ({ feed: s.feed.map((e) => ({ ...e, read: true })) })),

  pauseAgent: (id) =>
    set((s) => ({
      agents: s.agents.map((a) =>
        a.id === id ? { ...a, status: "idle" as const, task: "paused" } : a
      ),
    })),

  resumeAgent: (id) =>
    set((s) => ({
      agents: s.agents.map((a) =>
        a.id === id ? { ...a, status: "running" as const } : a
      ),
    })),

  approveAgent: (id) => {
    const agent = get().agents.find((a) => a.id === id);
    if (!agent) return;
    set((s) => ({
      agents: s.agents.map((a) =>
        a.id === id
          ? { ...a, status: "idle" as const, needsReview: false, task: "approved — done" }
          : a
      ),
      stats: { ...s.stats, tasksDoneToday: s.stats.tasksDoneToday + 1, running: Math.max(0, s.stats.running - 1) },
    }));
    get().addFeedEvent({
      agentId: id,
      agentName: "You",
      type: "completed",
      headline: `Approved <strong>${agent.name}</strong>'s work`,
      detail: "Task marked complete",
      timestamp: "just now",
      read: false,
    });
  },

  rejectAgent: (id) => {
    const agent = get().agents.find((a) => a.id === id);
    if (!agent) return;
    set((s) => ({
      agents: s.agents.map((a) =>
        a.id === id
          ? { ...a, status: "idle" as const, needsReview: false, task: "rejected — needs rework" }
          : a
      ),
    }));
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
    const from = get().agents.find((a) => a.id === fromId);
    const to = get().agents.find((a) => a.id === toId);
    if (!from || !to) return;
    get().addFeedEvent({
      agentId: fromId,
      agentName: "You",
      type: "handoff",
      headline: `Handed off <strong>${from.name}</strong> → <strong>${to.name}</strong>`,
      detail: "Context and task state transferred",
      timestamp: "just now",
      read: false,
    });
  },

  addFeedEvent: (event) =>
    set((s) => ({
      feed: [{ ...event, id: `f${_nextEventId++}` }, ...s.feed].slice(0, 50),
    })),
}));
