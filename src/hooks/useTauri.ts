/**
 * useTauri.ts
 *
 * Thin wrapper around Tauri's invoke() that gracefully degrades when running
 * in a plain browser (the preview.html dev workflow).
 *
 * Usage:
 *   const { invoke, isTauri } = useTauri()
 *   const procs = await invoke<DetectedProcess[]>('scan_agent_processes')
 */

import { useCallback } from 'react'

// Tauri 2 injects window.__TAURI_INTERNALS__ when running inside the app.
// We check this instead of importing from @tauri-apps/api so the bundle
// doesn't break when opened as a plain HTML file.
export function isTauriEnv(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
}

type InvokeArgs = Record<string, unknown>

/**
 * Call a Rust command via Tauri's invoke bridge.
 * Returns null (and logs a warning) when running outside Tauri.
 */
export async function tauriInvoke<T>(
  command: string,
  args?: InvokeArgs
): Promise<T | null> {
  if (!isTauriEnv()) {
    console.debug(`[useTauri] Not in Tauri — skipping invoke("${command}")`)
    return null
  }

  try {
    // Dynamically import to avoid hard dependency in browser builds
    const { invoke } = await import('@tauri-apps/api/core')
    return await invoke<T>(command, args)
  } catch (err) {
    console.error(`[useTauri] invoke("${command}") failed:`, err)
    return null
  }
}

/**
 * Listen to a Tauri backend event.
 * Returns an unlisten function; call it in your cleanup / useEffect return.
 * No-ops gracefully outside Tauri.
 */
export async function tauriListen<T>(
  event: string,
  handler: (payload: T) => void
): Promise<() => void> {
  if (!isTauriEnv()) {
    console.debug(`[useTauri] Not in Tauri — skipping listen("${event}")`)
    return () => {}
  }

  const { listen } = await import('@tauri-apps/api/event')
  const unlisten = await listen<T>(event, (e) => handler(e.payload))
  return unlisten
}

/**
 * React hook — provides invoke + isTauri flag, memoised for stable refs.
 */
export function useTauri() {
  const invoke = useCallback(tauriInvoke, [])
  return { invoke, isTauri: isTauriEnv() }
}
