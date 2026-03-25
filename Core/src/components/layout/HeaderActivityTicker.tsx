import {
  useActivityFeed,
  loadTickerSettings,
  type ActivityEvent,
} from '../../hooks/useActivityFeed';
import { useAuth } from '../AuthContext';
import { useEffect, useRef, useState } from 'react';
import { PenLine, Plus, Zap, AlertTriangle, Trash2 } from 'lucide-react';

/* ─── helpers ─── */

function EventIcon({ event, size }: { event: ActivityEvent; size: number }) {
  const cls = 'flex-shrink-0';
  const px = size + 2;

  if (event.type === 'error') return <AlertTriangle className={cls} style={{ width: px, height: px }} color="#f87171" />;
  if (event.type === 'auto') return <Zap className={cls} style={{ width: px, height: px }} color="#fbbf24" />;

  const msg = event.message.toLowerCase();
  if (msg.includes('verwijderd') || msg.includes('deleted'))
    return <Trash2 className={cls} style={{ width: px, height: px }} color="#94a3b8" />;
  if (msg.includes('toegevoegd') || msg.includes('created') || msg.includes('aangemaakt'))
    return <Plus className={cls} style={{ width: px, height: px }} color="#34d399" />;
  return <PenLine className={cls} style={{ width: px, height: px }} color="#60a5fa" />;
}

function eventColor(event: ActivityEvent): string {
  if (event.type === 'error') return '#f87171';
  if (event.type === 'auto') return '#fbbf24';
  return '#94a3b8';
}

function timeAgo(date: Date): string {
  const diff = Math.floor((Date.now() - date.getTime()) / 1000);
  if (diff < 10) return 'nu';
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}u`;
  return `${Math.floor(diff / 86400)}d`;
}

/* ─── main component ─── */

export function HeaderActivityTicker() {
  const { hasPermission } = useAuth();
  const canView = hasPermission('activity_ticker_view');

  // Re-read settings from localStorage on mount (updated via Beheer > Ticker page)
  const [settings] = useState(loadTickerSettings);
  const { currentEvent } = useActivityFeed(canView, settings);

  const [visible, setVisible] = useState(false);
  const [displayEvent, setDisplayEvent] = useState<ActivityEvent | null>(null);
  const prevEventId = useRef<string | null>(null);

  // Animate transitions between events
  useEffect(() => {
    if (!currentEvent) {
      setVisible(false);
      return;
    }

    if (currentEvent.id !== prevEventId.current) {
      setVisible(false);
      const swapTimer = setTimeout(() => {
        setDisplayEvent(currentEvent);
        prevEventId.current = currentEvent.id;
        setVisible(true);
      }, 200);
      return () => clearTimeout(swapTimer);
    }
  }, [currentEvent]);

  if (!canView || !displayEvent) return null;

  return (
    <div
      className="flex items-center gap-1.5 overflow-hidden transition-all duration-300 ease-in-out flex-shrink-0"
      style={{
        maxWidth: settings.maxWidth,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0)' : 'translateY(-4px)',
      }}
      title={displayEvent.message}
    >
      <EventIcon event={displayEvent} size={settings.fontSize} />
      <span
        className="font-medium truncate leading-tight"
        style={{ fontSize: settings.fontSize, color: eventColor(displayEvent) }}
      >
        {displayEvent.message}
      </span>
      <span
        className="text-slate-300 flex-shrink-0 tabular-nums"
        style={{ fontSize: Math.max(settings.fontSize - 1, 8) }}
      >
        {timeAgo(displayEvent.timestamp)}
      </span>
    </div>
  );
}
