// TitleBar.tsx — macOS-style traffic lights + window title
// Note: data-tauri-drag-region enables native window dragging

import { useLoomStore } from "../store";

export function TitleBar() {
  const feed = useLoomStore((s) => s.feed);
  const unread = feed.filter((e) => !e.read).length;

  return (
    <div
      className="titlebar"
      data-tauri-drag-region
    >
      <div className="traffic-lights">
        <span className="tl-red" />
        <span className="tl-yellow" />
        <span className="tl-green" />
      </div>

      <div className="titlebar-title">
        <strong>Loom</strong>&nbsp;&mdash; Agent HQ
      </div>

      {unread > 0 && (
        <div className="titlebar-badge">
          {unread}
        </div>
      )}
    </div>
  );
}
