// LiveFeed.tsx — chronological stream of all agent events

import { useLoomStore } from "../store";
import type { FeedEvent, FeedEventType } from "../types";

// ─── Icon map ─────────────────────────────────────────────────────────────────

function feedIcon(type: FeedEventType): { icon: string; cls: string } {
  switch (type) {
    case "completed": return { icon: "✓", cls: "fi-green" };
    case "waiting":   return { icon: "⏸", cls: "fi-amber" };
    case "running":   return { icon: "↻", cls: "fi-accent" };
    case "error":     return { icon: "✕", cls: "fi-red" };
    case "handoff":   return { icon: "⬆", cls: "fi-purple" };
    case "user":      return { icon: "◉", cls: "fi-accent" };
  }
}

// ─── Single feed item ─────────────────────────────────────────────────────────

function FeedItem({ event, delay }: { event: FeedEvent; delay: number }) {
  const { icon, cls } = feedIcon(event.type);

  return (
    <div
      className={`feed-item${event.read ? " read" : ""}`}
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className={`feed-icon ${cls}`}>{icon}</div>
      <div className="feed-body">
        <div
          className="feed-headline"
          // Safe: data comes from local seed/store — no user HTML injection
          dangerouslySetInnerHTML={{
            __html: `<strong>${event.agentName}</strong> ${event.headline}`,
          }}
        />
        <div className="feed-detail">{event.detail}</div>
      </div>
      <div className="feed-time">{event.timestamp}</div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function LiveFeed() {
  const feed = useLoomStore((s) => s.feed);
  const markAllRead = useLoomStore((s) => s.markAllRead);
  const unread = feed.filter((e) => !e.read).length;

  return (
    <div>
      <div className="section-header">
        <div className="section-title">Live Feed</div>
        {unread > 0 && (
          <div className="section-action" onClick={markAllRead}>
            mark all read ({unread})
          </div>
        )}
      </div>

      <div className="activity-feed">
        {feed.length === 0 ? (
          <div style={{ color: "var(--text-dim)", fontSize: 13, padding: "10px 0" }}>
            No activity yet.
          </div>
        ) : (
          feed.map((event, i) => (
            <FeedItem key={event.id} event={event} delay={i * 50} />
          ))
        )}
      </div>
    </div>
  );
}
