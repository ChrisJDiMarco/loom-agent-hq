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
  task: string;
  elapsed: string;
  /** 0–100 */
  progress: number;
  outputSnippet: string;
  lastActivity: string;
  tokensUsed: number;
  costUsd: number;
  needsReview: boolean;
  errorMessage?: string;
  /** Live data from Rust process scan */
  pid: number | null;
  memoryMb: number;
  cpuUsage: number;
}

// ─── Detected Process (from Rust sysinfo scan) ───────────────────────────────

export interface DetectedProcess {
  pid: number;
  name: string;
  /** Matches KNOWN_AGENTS keys in lib.rs: "claude-code", "cursor", etc. */
  agent_type: string;
  cpu_usage: number;
  memory_mb: number;
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
  timestamp: string;
  read: boolean;
}

// ─── Session Stats ────────────────────────────────────────────────────────────

export interface SessionStats {
  running: number;
  totalCostToday: number;
  totalTokensToday: number;
  tasksDoneToday: number;
  /** From Rust get_system_stats */
  cpuUsage: number;
  totalMemoryGb: number;
  usedMemoryGb: number;
}

// ─── Store ───────────────────────────────────────────────────────────────────

export interface LoomStore {
  agents: Agent[];
  feed: FeedEvent[];
  stats: SessionStats;
  selectedAgentId: string | null;
  commandValue: string;

  // Navigation
  selectAgent: (id: string | null) => void;
  setCommandValue: (val: string) => void;
  markAllRead: () => void;

  // Backend sync — called by useAgentScanner
  syncProcesses: (detected: DetectedProcess[]) => void;
  setSystemStats: (stats: {
    cpu_usage: number;
    total_memory_gb: number;
    used_memory_gb: number;
  }) => void;

  // Agent actions
  pauseAgent: (id: string) => void;
  resumeAgent: (id: string) => void;
  handoffAgent: (fromId: string, toId: string) => void;
  approveAgent: (id: string) => void;
  rejectAgent: (id: string) => void;
  resetAgentContext: (id: string) => void;
  addFeedEvent: (event: Omit<FeedEvent, "id">) => void;
}
