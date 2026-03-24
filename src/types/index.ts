// ─── Agent Status ────────────────────────────────────────────────────────────

export type AgentStatus = "running" | "waiting" | "idle" | "error";

export type AgentType =
  | "claude-code"
  | "cursor"
  | "devin"
  | "copilot"
  | "chatgpt"
  | "windsurf"
  | "custom";

// ─── Agent ───────────────────────────────────────────────────────────────────

export interface Agent {
  id: string;
  name: string;
  type: AgentType;
  status: AgentStatus;
  /** Short description of current task, e.g. "refactoring auth" */
  task: string;
  /** Elapsed time string, e.g. "3:42" */
  elapsed: string;
  /** 0–100 */
  progress: number;
  /** Last few lines of actual output */
  outputSnippet: string;
  /** ISO timestamp of last activity */
  lastActivity: string;
  /** Estimated tokens used this session */
  tokensUsed: number;
  /** Estimated cost in USD this session */
  costUsd: number;
  /** True if the agent is waiting for user review/approval */
  needsReview: boolean;
  /** Error message if status === "error" */
  errorMessage?: string;
}

// ─── Feed Event ──────────────────────────────────────────────────────────────

export type FeedEventType =
  | "completed"
  | "waiting"
  | "running"
  | "error"
  | "handoff"
  | "user";

export interface FeedEvent {
  id: string;
  agentId: string;
  agentName: string;
  type: FeedEventType;
  headline: string;
  detail: string;
  timestamp: string; // relative, e.g. "12s ago"
  read: boolean;
}

// ─── Session Stats ────────────────────────────────────────────────────────────

export interface SessionStats {
  running: number;
  totalCostToday: number;
  totalTokensToday: number;
  tasksDoneToday: number;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export interface LoomStore {
  agents: Agent[];
  feed: FeedEvent[];
  stats: SessionStats;
  selectedAgentId: string | null;
  commandValue: string;

  // Actions
  selectAgent: (id: string | null) => void;
  setCommandValue: (val: string) => void;
  markAllRead: () => void;
  pauseAgent: (id: string) => void;
  resumeAgent: (id: string) => void;
  handoffAgent: (fromId: string, toId: string) => void;
  approveAgent: (id: string) => void;
  rejectAgent: (id: string) => void;
  resetAgentContext: (id: string) => void;
  addFeedEvent: (event: Omit<FeedEvent, "id">) => void;
}
