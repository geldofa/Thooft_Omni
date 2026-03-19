import { useEffect, useRef, useState, useCallback } from 'react';
import { pb } from '../lib/pocketbase';

export type ActivityEventType = 'task' | 'auto' | 'error';

export interface ActivityEvent {
  id: string;
  type: ActivityEventType;
  message: string;
  timestamp: Date;
}

export interface TickerSettings {
  fontSize: number;       // px, default 10
  cycleDuration: number;  // seconds between events, default 4
  maxEvents: number;      // how many events to keep, default 8
  stickyErrors: boolean;  // pause cycling when current event is an error
  maxWidth: number;       // max width in px, default 280
}

const SETTINGS_KEY = 'omni_ticker_settings';

const DEFAULT_SETTINGS: TickerSettings = {
  fontSize: 10,
  cycleDuration: 4,
  maxEvents: 8,
  stickyErrors: true,
  maxWidth: 280,
};

export function loadTickerSettings(): TickerSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

export function saveTickerSettings(settings: TickerSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

// Global event bus so non-React code (like useAutoReports) can push events
type Listener = (event: ActivityEvent) => void;
const listeners = new Set<Listener>();

export function pushActivityEvent(event: Omit<ActivityEvent, 'id' | 'timestamp'>) {
  const full: ActivityEvent = {
    ...event,
    id: `local-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date(),
  };
  listeners.forEach(fn => fn(full));
}

/**
 * Hook that provides a live activity feed for the header ticker.
 * Subscribes to PocketBase `activity_logs` realtime events and
 * maintains a small in-memory queue that auto-cycles.
 */
export function useActivityFeed(enabled: boolean, settings: TickerSettings) {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const cycleTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const addEvent = useCallback((event: ActivityEvent) => {
    setEvents(prev => {
      const next = [event, ...prev].slice(0, settings.maxEvents);
      return next;
    });
    // Reset to show newest
    setCurrentIndex(0);
  }, [settings.maxEvents]);

  // Listen for programmatic pushes (from useAutoReports etc.)
  useEffect(() => {
    if (!enabled) return;
    const handler: Listener = (event) => addEvent(event);
    listeners.add(handler);
    return () => { listeners.delete(handler); };
  }, [enabled, addEvent]);

  // Subscribe to PocketBase realtime
  useEffect(() => {
    if (!enabled) return;

    const mapAction = (action: string): string => {
      const map: Record<string, string> = {
        'Created': 'Toegevoegd',
        'Updated': 'Bewerkt',
        'Deleted': 'Verwijderd',
      };
      return map[action] || action;
    };

    const handleRecord = (e: any) => {
      if (e.action !== 'create') return;
      const r = e.record;

      const action = r.action || '';
      const entityName = r.entity_name || r.entityName || '';
      const user = r.user || 'Systeem';
      const press = r.press || '';

      let type: ActivityEventType = 'task';
      if (user === 'Systeem' || action.toLowerCase().includes('auto')) {
        type = 'auto';
      }

      const pressLabel = press ? ` (${press})` : '';
      const message = `${user}: ${mapAction(action)} ${entityName}${pressLabel}`;

      addEvent({
        id: r.id || `rt-${Date.now()}`,
        type,
        message: message.trim(),
        timestamp: new Date(r.created || Date.now()),
      });
    };

    pb.collection('activity_logs').subscribe('*', handleRecord).catch(err => {
      console.warn('[ActivityFeed] Subscription failed:', err);
    });

    return () => {
      pb.collection('activity_logs').unsubscribe('*').catch(() => {});
    };
  }, [enabled, addEvent]);

  // Auto-cycle through events (respects stickyErrors)
  useEffect(() => {
    if (events.length <= 1) {
      setCurrentIndex(0);
      return;
    }

    cycleTimer.current = setInterval(() => {
      setCurrentIndex(prev => {
        const currentEvent = events[prev % events.length];
        // If sticky errors is on and current event is an error, don't advance
        if (settings.stickyErrors && currentEvent?.type === 'error') {
          return prev;
        }
        return (prev + 1) % events.length;
      });
    }, settings.cycleDuration * 1000);

    return () => {
      if (cycleTimer.current) clearInterval(cycleTimer.current);
    };
  }, [events, settings.cycleDuration, settings.stickyErrors]);

  const currentEvent = events.length > 0 ? events[currentIndex % events.length] : null;

  return { currentEvent, events };
}
