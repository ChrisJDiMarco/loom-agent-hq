/**
 * useAgentScanner.ts
 *
 * Polls the Rust `scan_agent_processes` command every SCAN_INTERVAL ms and
 * syncs the results into the Zustand store via `syncProcesses()`.
 *
 * Also fires a one-time call to `get_system_stats` on mount so the stats
 * strip in the Overview can show real CPU/memory numbers.
 *
 * Falls back to no-op polling when running outside Tauri (browser preview).
 */

import { useEffect, useRef } from 'react'
import { tauriInvoke, tauriListen } from './useTauri'
import { useLoomStore } from '../store'
import type { DetectedProcess } from '../types'

const SCAN_INTERVAL = 10_000 // 10 seconds

interface SystemStats {
  cpu_usage: number
  total_memory_gb: number
  used_memory_gb: number
}

export function useAgentScanner() {
  const syncProcesses  = useLoomStore((s) => s.syncProcesses)
  const setSystemStats = useLoomStore((s) => s.setSystemStats)
  const addFeedEvent   = useLoomStore((s) => s.addFeedEvent)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const unlistenRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    let cancelled = false

    // ── Initial scan ────────────────────────────────────────────────────────
    async function scan() {
      const procs = await tauriInvoke<DetectedProcess[]>('scan_agent_processes')
      if (cancelled) return
      if (procs) {
        syncProcesses(procs)
      }
    }

    // ── System stats (once on mount) ────────────────────────────────────────
    async function fetchSystemStats() {
      const stats = await tauriInvoke<SystemStats>('get_system_stats')
      if (cancelled || !stats) return
      setSystemStats(stats)
    }

    // ── Listen for backend-pushed agent status events ───────────────────────
    // Phase 2: the Rust watcher will emit these when it detects changes in
    // agent output files (e.g. ~/.claude/logs/, .cursor/logs/)
    async function subscribe() {
      const unlisten = await tauriListen<{
        agent_id: string
        agent_name: string
        event_type: string
        message: string
        timestamp: string
      }>('agent-status', (payload) => {
        if (cancelled) return
        addFeedEvent({
          agentId: payload.agent_id,
          agentName: payload.agent_name,
          type: payload.event_type as 'completed' | 'running' | 'error' | 'waiting' | 'handoff' | 'user',
          headline: payload.message,
          detail: `from Loom backend · ${payload.timestamp}`,
          timestamp: 'just now',
          read: false,
        })
      })
      unlistenRef.current = unlisten
    }

    // ── Start polling ────────────────────────────────────────────────────────
    scan()
    fetchSystemStats()
    subscribe()

    timerRef.current = setInterval(scan, SCAN_INTERVAL)

    return () => {
      cancelled = true
      if (timerRef.current) clearInterval(timerRef.current)
      if (unlistenRef.current) unlistenRef.current()
    }
  }, [syncProcesses, setSystemStats, addFeedEvent])
}
