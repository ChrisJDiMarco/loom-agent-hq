# Loom — Agent HQ

A native macOS app that gives you a single calm interface to monitor and control all your running AI coding agents — Claude Code, Cursor, Devin, Windsurf, Copilot, and more.

## Stack

- **Frontend**: React 18 + TypeScript + Zustand (state)
- **Backend**: Tauri 2 (Rust) — native macOS window, process monitoring
- **Build**: Vite 5
- **Target**: macOS 12+ (Monterey and later)

---

## Prerequisites

Install these before you start:

```bash
# 1. Rust (required by Tauri)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source "$HOME/.cargo/env"

# 2. Node.js 18+ (use nvm or brew)
brew install node

# 3. Tauri CLI
cargo install tauri-cli --version "^2.0"

# 4. Xcode Command Line Tools (required for macOS builds)
xcode-select --install
```

---

## Development

```bash
# Install JS dependencies
npm install

# Start dev server (Vite) + Tauri window
npm run tauri dev
```

The app opens in a native macOS window with hot-reload. Rust changes require a recompile (~10–20s).

---

## Project Structure

```
loom-agent-hq/
├── src/                        ← React frontend
│   ├── components/
│   │   ├── TitleBar.tsx        ← macOS traffic lights + title
│   │   ├── Sidebar.tsx         ← Agent roster + session stats
│   │   ├── LiveFeed.tsx        ← Chronological event stream
│   │   ├── AgentCards.tsx      ← Detailed per-agent cards
│   │   └── CommandBar.tsx      ← Natural-language command input
│   ├── store/index.ts          ← Zustand global state + actions
│   ├── types/index.ts          ← TypeScript types
│   ├── App.tsx                 ← Root layout
│   └── index.css               ← All styles (no CSS-in-JS)
├── src-tauri/
│   ├── src/
│   │   ├── main.rs             ← Tauri entry point
│   │   └── lib.rs              ← Rust commands (process scan, etc.)
│   ├── Cargo.toml
│   ├── tauri.conf.json         ← App config, window size, bundle settings
│   ├── entitlements.plist      ← macOS sandbox entitlements
│   └── capabilities/
│       └── default.json        ← Tauri permission grants
├── package.json
├── vite.config.ts
└── tsconfig.json
```

---

## Build for Distribution

```bash
# Build a signed .app and .dmg
npm run tauri build
```

Output: `src-tauri/target/release/bundle/macos/Loom.app`

---

## Mac App Store Submission Path

### Step 1 — Apple Developer Account
Sign up at https://developer.apple.com ($99/year). You need this for code signing and MAS submission.

### Step 2 — Certificates
In Xcode → Settings → Accounts, create:
- **Mac App Distribution** certificate (for the app bundle)
- **Mac Installer Distribution** certificate (for the .pkg you upload)

### Step 3 — App ID + Bundle ID
In the Apple Developer portal, register bundle ID: `io.loom.agenthq`

### Step 4 — Configure signing in tauri.conf.json
```json
"macOS": {
  "signingIdentity": "Apple Distribution: Your Name (TEAMID)",
  "providerShortName": "TEAMID"
}
```

### Step 5 — App Sandbox (critical)
The `entitlements.plist` is already configured for the App Sandbox, which is **required** for MAS. Read the comments in that file carefully — process monitoring via `sysinfo` may need to move to a privileged helper tool distributed outside the sandbox, or you can start with a simpler file-watching approach (Phase 2) that doesn't require process-level access.

### Step 6 — Build & sign
```bash
npm run tauri build -- --target universal-apple-darwin
```

### Step 7 — Upload via Xcode / Transporter
Use Xcode's Organizer or the Transporter app to upload the `.pkg` to App Store Connect.

### Step 8 — App Store Connect
Fill in screenshots, description, and privacy policy at https://appstoreconnect.apple.com

---

## Development Phases

### Phase 1 (current — what's built)
- Full UI with mock/simulated data
- Zustand state with real actions (pause, approve, handoff, reset)
- Tauri backend with process scanning via `sysinfo`
- Command bar with basic command parsing

### Phase 2 — File System Watching
- Watch `~/.claude/`, `~/.cursor/`, project directories for agent output files
- Parse output and update agent status in real time
- Use Tauri's `notify` integration to emit events to the frontend

### Phase 3 — MCP Integration
- Implement Loom as an MCP host
- Any MCP-compatible agent can report status directly
- Command bar routes natural language to Claude API for intelligent routing

### Phase 4 — Mac App Store
- Sandbox hardening
- Code signing
- App Store Connect submission

---

## Working with Claude on this

Recommended session flow:
1. Pick one phase or one component per session
2. Share relevant files (paste or `cat src/components/Foo.tsx`)
3. Let Claude write/edit, then you review the diff
4. Never let Claude run unsupervised on more than one component at a time

The codebase is intentionally flat — one file per component, no barrel files — so it's easy to paste individual files into context.
