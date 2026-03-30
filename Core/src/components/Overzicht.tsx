import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { pb, useAuth } from './AuthContext';
import { Card } from './ui/card';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Button } from './ui/button';

import {
  Activity,
  Layers,
  Wrench,
  CheckCircle2,
  AlertCircle,
  Radio,
  Search,
  Calendar,
  Printer,
  Zap,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

import { cn } from './ui/utils';

import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

// Format number with dots as thousands separator
const fmtNum = (v: string): string => {
  const n = parseInt(v.replace(/[^0-9-]/g, ''), 10);
  return isNaN(n) ? v : n.toLocaleString('nl-NL');
};

// Types
interface PressMetric {
  press: string;
  value: number;
}

// Canonical press order
const PRESS_ORDER = ['Lithoman', 'C818', 'C80'];
const sortPressMetrics = (metrics: PressMetric[]): PressMetric[] => {
  return [...metrics].sort((a, b) => {
    let ai = PRESS_ORDER.indexOf(a.press);
    let bi = PRESS_ORDER.indexOf(b.press);

    // Handle 'KBA C818' legacy name if it appears
    if (ai === -1 && a.press.includes('C818')) ai = PRESS_ORDER.indexOf('C818');
    if (bi === -1 && b.press.includes('C818')) bi = PRESS_ORDER.indexOf('C818');

    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });
};


interface OsintCounterData {
  label: string;
  mainValue: string;
  sideValue?: string;
  pressBreakdown: PressMetric[];
  status: 'nominal' | 'warning' | 'critical';
  icon: React.ElementType;
}

interface YearlyStats {
  jobsCount: number;
  versionsCount: number;
  totalNetto: number;
  pressJobs: PressMetric[];
  pressNetto: PressMetric[];
}

interface ActivityEvent {
  id: string;
  timestamp: Date;
  user: string;
  action: string;
  entity: string;
  entityName: string;
  details: string;
  newValue?: string;
  oldValue?: string;
  entityId?: string;
  status: 'info' | 'success' | 'warning' | 'error';
}

interface MaintenanceStatsData {
  overdueInRange: { count: number; pressBreakdown: PressMetric[] };
  alreadyOverdue: { count: number; pressBreakdown: PressMetric[] };
  completedInRange: { count: number; pressBreakdown: PressMetric[] };
}

// Press breakdown text component (standardized)
const PressBreakdownText = ({ metrics, isLarge = false, showPercent = false }: { metrics: PressMetric[]; isLarge?: boolean; showPercent?: boolean }) => {
  const sorted = sortPressMetrics(metrics);
  return (
    <div className="text-[10px] text-muted-foreground font-bold mt-1">
      {sorted.map((p, i) => (
        <span key={i}>
          {i > 0 && ' // '}
          {p.press}: {showPercent ? `${p.value}%` : (isLarge ? fmtNum(p.value.toString()) : p.value.toLocaleString('nl-NL'))}
        </span>
      ))}
    </div>
  );
};

// --- CONFIGURATION CONSTANTS ---
// EDIT THESE TO CHANGE LAYOUT AND TYPOGRAPHY FROM ONE PLACE
const LOG_CONFIG = {
  columnWidths: {
    netto: '82px',
    groen: '82px',
    rood: '72px'
  }
};



export function Overzicht() {
  useAuth();
  const navigate = useNavigate();
  const [selectedLog, setSelectedLog] = useState<ActivityEvent | null>(null);
  const [selectedVersionIds, setSelectedVersionIds] = useState<Set<string>>(new Set());
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [expandedOrders, setExpandedOrders] = useState<Set<string>>(new Set());
  const [counters, setCounters] = useState<OsintCounterData[]>([]);
  const [yearlyStats, setYearlyStats] = useState<YearlyStats>({
    jobsCount: 0, versionsCount: 0, totalNetto: 0, pressJobs: [], pressNetto: []
  });
  const [timeRange, setTimeRange] = useState<'week' | 'month'>('week');
  const [maintenanceStats, setMaintenanceStats] = useState<MaintenanceStatsData>({
    overdueInRange: { count: 0, pressBreakdown: [] },
    alreadyOverdue: { count: 0, pressBreakdown: [] },
    completedInRange: { count: 0, pressBreakdown: [] }
  });
  const [showOldOrders, setShowOldOrders] = useState(false);
  const [jobDates, setJobDates] = useState<Record<string, string>>({});
  const [currentRangeStart, setCurrentRangeStart] = useState<string>('');

  useEffect(() => {
    fetchData();
    fetchMaintenanceData();

    pb.collection('drukwerken').subscribe('*', () => fetchData());
    pb.collection('activity_logs').subscribe('*', (e) => {
      if (e.action === 'create') {
        const r = e.record;
        setActivities(prev => [{
          id: r.id,
          timestamp: new Date(r.created),
          user: r.user || 'SYSTEM',
          action: r.action || 'Unknown',
          entity: r.entity || 'Event',
          entityName: r.entity_name || r.entityName || '',
          details: r.details || '',
          newValue: r.newValue || r.newvalue || '',
          status: getStatusFromAction(r.action)
        }, ...prev].slice(0, 150));
      }
    });
    pb.collection('onderhoud').subscribe('*', () => fetchMaintenanceData());

    return () => {
      pb.collection('drukwerken').unsubscribe('*').catch(() => { });
      pb.collection('activity_logs').unsubscribe('*').catch(() => { });
      pb.collection('onderhoud').unsubscribe('*').catch(() => { });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  // --- DATA FETCHING ---
  const fetchData = async (range: 'week' | 'month' = timeRange) => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yearStr = format(new Date(today.getFullYear(), 0, 1), 'yyyy-MM-dd');

      let rangeStart = new Date(today);
      if (range === 'month') {
        rangeStart = new Date(today.getFullYear(), today.getMonth(), 1);
      } else {
        const dow = today.getDay();
        rangeStart.setDate(today.getDate() - dow);
      }
      const rangeStr = format(rangeStart, 'yyyy-MM-dd');

      const rangeFilter = `(date >= "${rangeStr}" || created >= "${rangeStr}")`;
      const yearFilter = `(date >= "${yearStr}" || created >= "${yearStr}")`;

      const [rangeJobsRaw, logs, yearJobsRaw] = await Promise.all([
        pb.collection('drukwerken').getFullList({ filter: rangeFilter, sort: '-created', expand: 'pers' }),
        pb.collection('activity_logs').getList(1, 500, { filter: rangeFilter.replace('date', 'created'), sort: '-created' }),
        pb.collection('drukwerken').getFullList({ filter: yearFilter, expand: 'pers' })
      ]);

      const rangeJobs = rangeJobsRaw.filter(item => (item.groen || 0) !== 0 || (item.rood || 0) !== 0);
      const yearJobs = yearJobsRaw.filter(item => (item.groen || 0) !== 0 || (item.rood || 0) !== 0);

      processProduction(rangeJobs);
      processActivities(logs.items);
      processYearlyStats(yearJobs);

      // Track production dates for all jobs in range
      const dates: Record<string, string> = {};
      rangeJobsRaw.forEach(j => {
        if (j.date) dates[j.id] = j.date.split(' ')[0];
      });
      setJobDates(dates);
      setCurrentRangeStart(rangeStr);
    } catch (err) {
      console.error("OSINT fetch failed:", err);
    }
  };

  const fetchMaintenanceData = async (range: 'week' | 'month' = timeRange) => {
    try {
      const tasks = await pb.collection('onderhoud').getFullList({ expand: 'pers' });
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let rangeStart = new Date(today);
      let rangeEnd = new Date(today);

      if (range === 'month') {
        rangeStart = new Date(today.getFullYear(), today.getMonth(), 1);
        rangeEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
      } else {
        const dow = today.getDay();
        rangeStart.setDate(today.getDate() - dow);
        rangeEnd = new Date(rangeStart);
        rangeEnd.setDate(rangeStart.getDate() + 6);
        rangeEnd.setHours(23, 59, 59, 999);
      }

      const overdueThisRange: any[] = [];
      const alreadyOverdue: any[] = [];
      const completedThisRange: any[] = [];

      tasks.forEach(task => {
        const nextDate = task.next_date ? new Date(task.next_date) : null;
        const lastDate = task.last_date ? new Date(task.last_date) : null;

        if (lastDate && lastDate >= rangeStart && lastDate <= rangeEnd) {
          completedThisRange.push(task);
        }
        if (nextDate) {
          if (nextDate >= today && nextDate <= rangeEnd) overdueThisRange.push(task);
          if (nextDate < today) alreadyOverdue.push(task);
        }
      });

      const getPressBreakdown = (items: any[]): PressMetric[] => {
        const pressMap: Record<string, number> = {};
        items.forEach(item => {
          const presses = item.expand?.pers;
          if (Array.isArray(presses)) {
            presses.forEach((p: any) => {
              const name = p.naam || p.name || 'Onbekend';
              pressMap[name] = (pressMap[name] || 0) + 1;
            });
          } else if (presses) {
            const name = presses.naam || presses.name || 'Onbekend';
            pressMap[name] = (pressMap[name] || 0) + 1;
          }
        });
        return sortPressMetrics(Object.entries(pressMap).map(([press, count]) => ({
          press, value: count
        })));
      };

      setMaintenanceStats({
        overdueInRange: { count: overdueThisRange.length, pressBreakdown: getPressBreakdown(overdueThisRange) },
        alreadyOverdue: { count: alreadyOverdue.length, pressBreakdown: getPressBreakdown(alreadyOverdue) },
        completedInRange: { count: completedThisRange.length, pressBreakdown: getPressBreakdown(completedThisRange) }
      });
    } catch (err) {
      console.error("OSINT Maintenance fetch failed:", err);
    }
  };

  // --- DATA PROCESSING ---
  const processProduction = (items: any[]) => {
    const pressMap: Record<string, { green: number, red: number, planned: number }> = {};
    let totalGreen = 0, totalRed = 0, totalPlanned = 0;

    items.forEach(item => {
      const press = item.expand?.pers?.naam || item.pers || 'Onbekend';
      if (!pressMap[press]) pressMap[press] = { green: 0, red: 0, planned: 0 };
      pressMap[press].green += (item.groen || 0);
      pressMap[press].red += (item.rood || 0);
      pressMap[press].planned += Number(item.max_bruto || item.oplage_bruto || item.netto_oplage) || 0;
      totalGreen += (item.groen || 0);
      totalRed += (item.rood || 0);
      totalPlanned += Number(item.max_bruto || item.oplage_bruto || item.netto_oplage) || 0;
    });

    const pressGreen = sortPressMetrics(Object.entries(pressMap).map(([press, data]) => ({
      press, value: totalGreen > 0 ? Math.round((data.green / totalGreen) * 100) : 0
    })));
    const pressLoss = sortPressMetrics(Object.entries(pressMap).map(([press, data]) => ({
      press, value: data.green > 0 ? Math.round((data.red / data.green) * 100) : 0
    })));
    const pressDelta = sortPressMetrics(Object.entries(pressMap).map(([press, data]) => ({
      press, value: data.planned > 0 ? Math.round(((data.green + data.red - data.planned) / data.planned) * 100) : 0
    })));

    const totalDelta = (totalGreen + totalRed) - totalPlanned;
    const deltaPercentage = totalPlanned > 0 ? (totalDelta / totalPlanned) : 0;
    const deltaPercentageText = (deltaPercentage * 100).toFixed(1);
    const displayDelta = Number(deltaPercentageText) > 0 ? `+${deltaPercentageText}%` : `${deltaPercentageText}%`;

    // Modified Productie calculation: count Netto if Groen > 0
    let totalProdNetto = 0;
    items.forEach(item => {
      if ((item.groen || 0) > 0) {
        totalProdNetto += (item.netto_oplage || 0);
      }
    });

    const lossPercentage = totalGreen > 0 ? (totalRed / totalGreen * 100).toFixed(1) : '0.0';

    setCounters([
      {
        label: 'Productie', mainValue: totalProdNetto.toLocaleString(),
        pressBreakdown: pressGreen,
        status: totalGreen < totalPlanned ? 'warning' : 'nominal',
        icon: AlertCircle
      },
      {
        label: 'Verlies', mainValue: `${lossPercentage}%`, sideValue: totalRed.toLocaleString(),
        pressBreakdown: pressLoss,
        status: parseFloat(lossPercentage) > 5 ? 'warning' : 'nominal', icon: AlertCircle
      },
      {
        label: 'Delta', mainValue: displayDelta, sideValue: totalDelta.toLocaleString(),
        pressBreakdown: pressDelta,
        status: Math.abs(deltaPercentage) > 0.01
          ? (totalDelta > 0 ? 'critical' : 'warning')
          : 'nominal',
        icon: AlertCircle
      }
    ]);
  };

  const processYearlyStats = (items: any[]) => {
    const orderNumbers = new Set<string>();
    const orderByPress: Record<string, Set<string>> = {};
    const nettoMap: Record<string, number> = {};
    let totalNetto = 0;
    let versionsCount = 0;

    items.forEach(item => {
      const groen = item.groen || 0;
      if (groen <= 0) return;

      const press = item.expand?.pers?.naam || item.pers || 'Onbekend';
      const orderNum = item.order_nummer || item.id;
      orderNumbers.add(orderNum);
      if (!orderByPress[press]) orderByPress[press] = new Set();
      orderByPress[press].add(orderNum);
      const netto = (item.netto_oplage || 0);
      nettoMap[press] = (nettoMap[press] || 0) + netto;
      totalNetto += netto;
      versionsCount++;
    });

    const totalJobs = orderNumbers.size;
    setYearlyStats({
      jobsCount: totalJobs,
      versionsCount: versionsCount,
      totalNetto,
      pressJobs: sortPressMetrics(Object.entries(orderByPress).map(([press, orders]) => ({
        press, value: totalJobs > 0 ? Math.round((orders.size / totalJobs) * 100) : 0
      }))),
      pressNetto: sortPressMetrics(Object.entries(nettoMap).map(([press, netto]) => ({
        press, value: totalNetto > 0 ? Math.round((netto / totalNetto) * 100) : 0
      })))
    });
  };

  const processActivities = (items: any[]) => {
    setActivities(items.map(r => ({
      id: r.id,
      timestamp: new Date(r.created || r.timestamp),
      user: r.user || 'SYSTEM',
      action: r.action || 'Unknown',
      entity: r.entity || 'Event',
      entityName: r.entity_name || r.entityName || '',
      details: r.details || '',
      newValue: r.newValue || r.newvalue || '',
      oldValue: r.old_value || r.oldValue || '',
      entityId: r.entity_id || r.entityId || r.entityid || '',
      status: getStatusFromAction(r.action)
    })));
  };

  const getStatusFromAction = (action: string): 'info' | 'success' | 'warning' | 'error' => {
    const a = action?.toLowerCase() || '';
    if (a.includes('error') || a.includes('fail')) return 'error';
    if (a.includes('delet') || a.includes('remove')) return 'warning';
    if (a.includes('creat') || a.includes('complet') || a.includes('finish')) return 'success';
    return 'info';
  };
  const getOrderKey = (item: ActivityEvent) => {
    if (item.newValue) {
      const parts = item.newValue.split('|||');
      const orderPart = parts.find(p => p.startsWith('Order:'));
      if (orderPart) return orderPart.split(':')[1].trim();
    }
    const match = item.entityName?.match(/DT\s*(\d+)/i);
    if (match) return match[1];
    return item.entityName || 'Onbekend';
  };

  const getVersie = (item: ActivityEvent) => {
    if (item.newValue) {
      const parts = item.newValue.split('|||');
      const vPart = parts.find(p => p.startsWith('Versie:'));
      if (vPart) return vPart.split(':')[1].trim();
    }
    return '';
  };

  // --- Split activities ---
  const orderActivities = React.useMemo(() => {
    const raw = activities.filter(a => {
      const e = a.entity?.toLowerCase() || '';
      const d = a.details?.toLowerCase() || '';
      return e.includes('job') || e.includes('druk') || d.includes('druk') || d.includes('order') || e === 'finishedjob';
    });

    const latestPerJob = new Map<string, ActivityEvent>();
    raw.forEach(a => {
      const id = `${getOrderKey(a)}|${getVersie(a)}`;
      if (!latestPerJob.has(id)) {
        latestPerJob.set(id, a);
      } else {
        const existing = latestPerJob.get(id)!;
        if (a.timestamp > existing.timestamp) {
          latestPerJob.set(id, a);
        }
      }
    });

    return Array.from(latestPerJob.values()).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [activities]);

  const groupedOrders = React.useMemo(() => {
    const groups = new Map<string, ActivityEvent[]>();
    orderActivities.forEach(a => {
      // If showOldOrders is false (OFF), check if the job production date is old and skip it
      if (!showOldOrders && a.entityId && currentRangeStart) {
        const prodDate = jobDates[a.entityId];
        if (prodDate && prodDate < currentRangeStart) {
          return; // Skip old order
        }
        // If it's a FinishedJob but not in jobDates, it's likely outside our range
        if (a.entity === 'FinishedJob' && !prodDate) {
          return;
        }
      }

      const key = getOrderKey(a);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(a);
    });
    return Array.from(groups.entries()).sort((a, b) => {
      const maxA = Math.max(...a[1].map(x => x.timestamp.getTime()));
      const maxB = Math.max(...b[1].map(x => x.timestamp.getTime()));
      return maxB - maxA;
    });
  }, [orderActivities, showOldOrders, jobDates, currentRangeStart]);

  const onderhoudActivities = activities.filter(a => {
    const e = a.entity?.toLowerCase() || '';
    const d = a.details?.toLowerCase() || '';
    return e.includes('maintenance') || e.includes('onderhoud') || d.includes('onderhoud') || d.includes('task');
  });;

  // --- Helpers for log detail dialog ---
  const formatDateTime = (date: Date) => {
    const d = new Date(date);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const getActionBadge = (action: string) => {
    if (action === 'Created') return <Badge className="bg-green-500">Aangemaakt</Badge>;
    if (action === 'Updated') return <Badge className="bg-blue-500">Bijgewerkt</Badge>;
    if (action === 'Deleted') return <Badge className="bg-red-500">Verwijderd</Badge>;
    return <Badge variant="secondary">{action}</Badge>;
  };

  const parseChanges = (oldStr: string, newStr: string) => {
    if (!oldStr && !newStr) return [];
    const split = (s: string) => s.includes('|||') ? s.split('|||') : s.split(' · ');
    const oldParts = split(oldStr); const newParts = split(newStr);
    const fieldNames = new Set<string>();
    const oldMap = new Map<string, string>(); const newMap = new Map<string, string>();
    const parse = (part: string, map: Map<string, string>) => {
      const i = part.indexOf(': ');
      if (i !== -1) { const f = part.substring(0, i); map.set(f, part.substring(i + 2)); fieldNames.add(f); }
    };
    oldParts.forEach(p => parse(p, oldMap)); newParts.forEach(p => parse(p, newMap));
    return Array.from(fieldNames).map(f => ({ field: f, old: oldMap.get(f) || '-', new: newMap.get(f) || '-' }));
  };

  // --- Order Stream Renderer ---
  const renderOrderStream = (groupedItems: [string, ActivityEvent[]][]) => {
    const flatList: React.ReactNode[] = [];
    let lastDateStr: string | null = null;

    groupedItems.forEach(([orderKey, events], groupIndex) => {
      const latestEvent = events[0];
      const itemDate = new Date(latestEvent.timestamp);
      const itemDayStr = format(itemDate, 'yyyy-MM-dd');

      if (itemDayStr !== lastDateStr) {
        flatList.push(
          <div key={`date-${itemDayStr}-${groupIndex}`} className="flex items-end gap-1 mt-3 mb-0.5 first:mt-0 opacity-50 select-none">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap">
              {format(itemDate, 'EEEE d MMM', { locale: nl }).toUpperCase()}
            </span>
            <div className="flex-1 border-b border-muted-foreground/30 h-[1.5px] mb-[1.5px] opacity-20"></div>
          </div>
        );
        lastDateStr = itemDayStr;
      }

      const isExpanded = expandedOrders.has(orderKey);
      const hasMultiple = events.length > 1;

      const toggleOrder = (e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedOrders(prev => {
          const next = new Set(prev);
          if (next.has(orderKey)) next.delete(orderKey);
          else next.add(orderKey);
          return next;
        });
      };

      const renderSingleItem = (item: ActivityEvent, isChild = false, customPrefix?: React.ReactNode) => {
        let netto = 0, groen = 0, rood = 0, versie = '', typeLabel = '';
        if (item.newValue) {
          const parts = item.newValue.split('|||');
          parts.forEach(p => {
            const [f, v] = p.split(':').map(s => s.trim());
            const numV = Number(v?.replace(/[.,]/g, '')) || 0;
            if (f === 'Netto') netto = numV;
            if (f === 'Groen') groen = numV;
            if (f === 'Rood') rood = numV;
            if (f === 'Versie') versie = v;
            if (['4/4', '4/0', '1/0', '1/1', '4/1'].includes(f) && numV > 0) typeLabel = f;
          });
        }

        let displayUser = item.user;
        if (displayUser) {
          if (/MAN Lithoman/i.test(displayUser)) displayUser = 'Lithoman';
          else if (/KBA C818/i.test(displayUser)) displayUser = 'C818';
          else if (/KBA C80/i.test(displayUser)) displayUser = 'C80';
        }

        let textStr = item.entityName || item.details || '';
        const pMatchers = [{ prefix: 'MAN LITHOMAN' }, { prefix: 'LITHOMAN' }, { prefix: 'KBA C818' }, { prefix: 'C818' }, { prefix: 'C80' }];
        for (const m of pMatchers) {
          if (textStr.toUpperCase().startsWith(m.prefix)) {
            textStr = textStr.slice(m.prefix.length).trim();
            if (textStr.startsWith('- ')) textStr = textStr.slice(2);
            break;
          }
        }

        return (
          <div
            key={item.id}
            className={cn(
              "text-[11px] border-l-2 pl-2.5 py-0.5 flex items-center gap-3 hover:bg-muted/50 transition-colors rounded-r cursor-pointer group",
              isChild ? "ml-6 border-muted/20" : "border-muted hover:border-primary"
            )}
            onClick={() => setSelectedLog(item)}
          >
            <span className="text-muted-foreground font-mono shrink-0 w-[42px] text-right">[{format(item.timestamp, 'HH:mm')}]</span>

            <div className="flex items-center gap-1.5 shrink-0">
              {!isChild ? <div className="w-3.5 h-3.5" /> : null}
              <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", isChild ? "bg-muted-foreground/30" : "bg-primary")}></span>
            </div>

            {!isChild && (
              <div className="w-[92px] shrink-0 flex items-center">
                <span className="px-1.5 py-0.5 rounded-md bg-muted/60 text-[9px] font-black text-muted-foreground uppercase tracking-tight shadow-sm border border-muted/30 whitespace-nowrap">{displayUser}</span>
              </div>
            )}

            <div className="flex flex-1 items-center min-w-0">
              {customPrefix}
              <span className={cn(
                "text-muted-foreground truncate group-hover:text-foreground transition-colors",
                isChild && "ml-[148px]"
              )}>
                {isChild ? (versie || textStr) : textStr}
              </span>
              {!isChild && versie && versie !== '-' && (
                <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded tracking-widest text-primary/70 bg-primary/10 border border-primary/20 shrink-0">{versie}</span>
              )}
            </div>

            <div className="ml-auto flex items-center gap-1.5 shrink-0">
              {typeLabel && (
                <div className="px-1.5 py-0.5 rounded bg-gray-100 text-[9px] font-bold text-gray-600 border border-gray-200">
                  {typeLabel}
                </div>
              )}

              <div
                className="flex justify-between shrink-0 text-blue-700 bg-blue-500/15 px-1.5 py-0.5 rounded font-mono"
                style={{ width: LOG_CONFIG.columnWidths.netto }}
              >
                <span className="opacity-70 text-[9px]">N:</span><span className="font-bold text-[10px]">{netto > 0 ? fmtNum(netto.toString()) : '0'}</span>
              </div>

              <div
                className="flex justify-between shrink-0 text-emerald-700 bg-emerald-500/15 px-1.5 py-0.5 rounded font-mono"
                style={{ width: LOG_CONFIG.columnWidths.groen }}
              >
                <span className="opacity-70 text-[9px]">G:</span><span className="font-bold text-[10px]">{groen > 0 ? fmtNum(groen.toString()) : '0'}</span>
              </div>

              <div
                className="flex justify-between shrink-0 text-red-700 bg-red-500/15 px-1.5 py-0.5 rounded font-mono"
                style={{ width: LOG_CONFIG.columnWidths.rood }}
              >
                <span className="opacity-70 text-[9px]">R:</span><span className="font-bold text-[10px]">{rood > 0 ? fmtNum(rood.toString()) : '0'}</span>
              </div>
            </div>
          </div>
        );
      };

      if (!hasMultiple) {
        flatList.push(renderSingleItem(latestEvent));
      } else {
        // Parent row logic
        let totalNetto = 0, totalGroen = 0, totalRood = 0;
        const typeCounts: Record<string, number> = {};

        // Deduplicate events by version to get the latest state of each version
        const latestVersionLogs = new Map<string, ActivityEvent>();
        events.forEach(item => {
          let versie = '-';
          if (item.newValue) {
            const vPart = item.newValue.split('|||').find(p => p.startsWith('Versie:'));
            if (vPart) versie = vPart.split(':')[1].trim();
          }
          if (!latestVersionLogs.has(versie)) {
            latestVersionLogs.set(versie, item);
          }
        });

        latestVersionLogs.forEach(item => {
          if (item.newValue) {
            const parts = item.newValue.split('|||');
            parts.forEach(p => {
              const [f, v] = p.split(':').map(s => s.trim());
              const numV = Number(v?.replace(/[.,]/g, '')) || 0;
              if (f === 'Netto') totalNetto += numV;
              if (f === 'Groen') totalGroen += numV;
              if (f === 'Rood') totalRood += numV;
              if (['4/4', '4/0', '1/0', '1/1', '4/1'].includes(f) && numV > 0) {
                typeCounts[f] = (typeCounts[f] || 0) + 1;
              }
            });
          }
        });

        const parentText = latestEvent.entityName; // Use full name (ordernr - ordername)
        const pMatchers = [{ prefix: 'MAN LITHOMAN' }, { prefix: 'LITHOMAN' }, { prefix: 'KBA C818' }, { prefix: 'C818' }, { prefix: 'C80' }];
        let displayTitle = parentText;
        for (const m of pMatchers) {
          if (displayTitle.toUpperCase().startsWith(m.prefix)) {
            displayTitle = displayTitle.slice(m.prefix.length).trim();
            if (displayTitle.startsWith('- ')) displayTitle = displayTitle.slice(2);
            break;
          }
        }

        flatList.push(
          <div
            key={`parent-${orderKey}`}
            className="text-[11px] border-l-2 border-primary/40 pl-2.5 py-1 flex items-center gap-3 bg-primary/5 hover:bg-primary/10 transition-colors rounded-r cursor-pointer group mb-0.5"
            onClick={toggleOrder}
          >
            <span className="text-muted-foreground font-mono shrink-0 w-[42px] text-right">[{format(latestEvent.timestamp, 'HH:mm')}]</span>
            <div className="flex items-center gap-1.5 shrink-0">
              {isExpanded ? <ChevronDown className="w-3.5 h-3.5 text-primary" /> : <ChevronRight className="w-3.5 h-3.5 text-primary" />}
              <span className={cn("w-1.5 h-1.5 rounded-full", "bg-primary")}></span>
            </div>

            <div className="w-[92px] shrink-0 flex items-center">
              {(() => {
                let displayUser = latestEvent.user;
                if (displayUser) {
                  if (/MAN Lithoman/i.test(displayUser)) displayUser = 'Lithoman';
                  else if (/KBA C818/i.test(displayUser)) displayUser = 'C818';
                  else if (/KBA C80/i.test(displayUser)) displayUser = 'C80';
                }
                return <span className="px-1.5 py-0.5 rounded-md bg-muted/60 text-[9px] font-black text-muted-foreground uppercase tracking-tight shadow-sm border border-muted/30 whitespace-nowrap">{displayUser}</span>;
              })()}
            </div>

            <div className="flex flex-1 items-center min-w-0">
              <span className="text-foreground/80 truncate">{displayTitle}</span>
              <span className="ml-2 text-[9px] px-1.5 py-0.5 rounded text-gray-600 border border-gray-200 uppercase tracking-tighter shrink-0 flex items-center gap-1 shadow-sm">
                <Layers className="w-2.5 h-2.5" /> {events.length} VERSIES
              </span>
            </div>

            <div className="ml-auto flex items-center gap-1.5 shrink-0">
              {/* Type summary cards */}
              <div className="flex gap-1 mr-2">
                {Object.entries(typeCounts).map(([type, count]) => (
                  <div key={type} className="px-1.5 py-0.5 rounded bg-white shadow-sm border border-primary/20 text-[9px] font-bold text-primary italic">
                    {count}x {type}
                  </div>
                ))}
              </div>

              <div
                className="flex justify-between shrink-0 text-blue-700 bg-blue-700/10 px-1.5 py-0.5 rounded border border-blue-200 font-mono"
                style={{ width: LOG_CONFIG.columnWidths.netto }}
              >
                <span className="opacity-70 text-[9px]">ΣN:</span><span className="font-black text-[10px]">{totalNetto > 0 ? fmtNum(totalNetto.toString()) : '0'}</span>
              </div>

              <div
                className="flex justify-between shrink-0 text-emerald-700 bg-emerald-700/10 px-1.5 py-0.5 rounded border border-emerald-200 font-mono"
                style={{ width: LOG_CONFIG.columnWidths.groen }}
              >
                <span className="opacity-70 text-[9px]">ΣG:</span><span className="font-black text-[10px]">{totalGroen > 0 ? fmtNum(totalGroen.toString()) : '0'}</span>
              </div>

              <div
                className="flex justify-between shrink-0 text-red-700 bg-red-700/10 px-1.5 py-0.5 rounded border border-red-200 font-mono"
                style={{ width: LOG_CONFIG.columnWidths.rood }}
              >
                <span className="opacity-70 text-[9px]">ΣR:</span><span className="font-black text-[10px]">{totalRood > 0 ? fmtNum(totalRood.toString()) : '0'}</span>
              </div>
            </div>
          </div>
        );

        if (isExpanded) {
          events.forEach(child => {
            flatList.push(renderSingleItem(child, true));
          });
        }
      }
    });

    return flatList;
  };

  // --- Maintenance Activity Stream Renderer ---
  const renderActivityStream = (items: ActivityEvent[]) => {
    return items.reduce((acc: React.ReactNode[], item, index, array) => {
      const itemDate = new Date(item.timestamp);
      const itemDayStr = format(itemDate, 'yyyy-MM-dd');
      const prevItem = index > 0 ? (array[index - 1] as any) : null;
      const prevDayStr = prevItem ? format(new Date(prevItem.timestamp), 'yyyy-MM-dd') : null;

      if (itemDayStr !== prevDayStr) {
        acc.push(
          <div key={`date-${itemDayStr}-${index}`} className="flex items-end gap-1 mt-2 mb-0.5 first:mt-0 opacity-50 select-none">
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap">
              {format(itemDate, 'EEEE d MMM', { locale: nl }).toUpperCase()}
            </span>
            <div className="flex-1 border-b border-muted-foreground/30 h-[1.5px] mb-[1.5px] opacity-20"></div>
          </div>
        );
      }

      let prodData = null;
      let versieBadge = null;
      if ((item.entity as string) === 'FinishedJob' && item.newValue) {
        const parts = item.newValue.split('|||');
        let netto = '', groen = '', rood = '', versie = '';
        parts.forEach((p: string) => {
          if (p.startsWith('Netto:')) netto = p.split(':')[1].trim();
          if (p.startsWith('Groen:')) groen = p.split(':')[1].trim();
          if (p.startsWith('Rood:')) rood = p.split(':')[1].trim();
          if (p.startsWith('Versie:')) versie = p.split(':')[1].trim();
        });

        if (versie && versie !== '-') {
          versieBadge = <span className="ml-2 text-[9px] font-bold px-1.5 py-0.5 rounded tracking-widest text-primary/70 bg-primary/10 border border-primary/20 shrink-0">{versie}</span>;
        }

        if (netto || groen || rood) {
          prodData = (
            <div className="flex items-center gap-1.5 ml-auto text-[10px] font-mono shrink-0">
              <div
                className="flex justify-between shrink-0 text-blue-700 bg-blue-500/15 px-1.5 py-0.5 rounded"
                style={{ width: LOG_CONFIG.columnWidths.netto }}
              >
                <span className="opacity-70">N:</span><span className="font-bold">{netto ? fmtNum(netto) : '0'}</span>
              </div>
              <div
                className="flex justify-between shrink-0 px-1.5 py-0.5 rounded text-emerald-900 bg-emerald-500/20"
                style={{ width: LOG_CONFIG.columnWidths.groen }}
              >
                <span className="opacity-70">G:</span><span className="font-bold">{groen ? fmtNum(groen) : '0'}</span>
              </div>
              <div
                className="flex justify-between shrink-0 text-red-700 bg-red-500/15 px-1.5 py-0.5 rounded"
                style={{ width: LOG_CONFIG.columnWidths.rood }}
              >
                <span className="opacity-70">R:</span><span className="font-bold">{rood ? fmtNum(rood) : '0'}</span>
              </div>
            </div>
          );
        }
      }

      let maintenanceData = null;
      if ((item.entity as string) === 'Task' && item.newValue) {
        const parts = item.newValue.split('|||');
        let operators = '';
        parts.forEach((p: string) => {
          if (p.includes('Operators:')) {
            const val = p.split('Operators:')[1]?.trim();
            if (val && !/Niemand/i.test(val)) operators = val;
          }
        });
        if (operators) {
          maintenanceData = (
            <div className="px-1.5 py-0.5 rounded-md bg-indigo-500/10 text-[9px] font-black text-indigo-700 uppercase tracking-tight shadow-sm border border-indigo-500/20 max-w-[140px] truncate ml-auto">
              {operators}
            </div>
          );
        }
      }

      let textStr = item.entityName || item.details || '';
      const pMatchers = [
        { prefix: 'MAN LITHOMAN', display: 'Lithoman' },
        { prefix: 'LITHOMAN', display: 'Lithoman' },
        { prefix: 'KBA C818', display: 'C818' },
        { prefix: 'C818', display: 'C818' },
        { prefix: 'C80', display: 'C80' }
      ];

      for (const m of pMatchers) {
        if (textStr.toUpperCase().startsWith(m.prefix)) {
          textStr = textStr.slice(m.prefix.length).trim();
          if (textStr.startsWith('- ')) textStr = textStr.slice(2);
          break;
        }
      }

      let displayUser = item.user;
      if (displayUser) {
        if (/MAN Lithoman/i.test(displayUser)) displayUser = 'Lithoman';
        else if (/KBA C818/i.test(displayUser)) displayUser = 'C818';
        else if (/KBA C80/i.test(displayUser)) displayUser = 'C80';
      }

      acc.push(
        <div
          key={item.id}
          className="text-[11px] border-l-2 border-muted pl-2.5 py-0.5 flex items-center gap-3 hover:border-primary hover:bg-muted/50 transition-colors rounded-r cursor-pointer group"
          onClick={() => setSelectedLog(item)}
        >
          <span className="text-muted-foreground font-mono shrink-0 w-[42px] text-right">[{format(item.timestamp, 'HH:mm')}]</span>
          <span className={cn(
            "w-1.5 h-1.5 rounded-full shrink-0",
            (item.entity as string) === 'FinishedJob' ? "bg-primary" : "bg-indigo-500"
          )}></span>
          <div className="w-[92px] shrink-0 flex items-center">
            <span className="px-1.5 py-0.5 rounded-md bg-muted/60 text-[9px] font-black text-muted-foreground uppercase tracking-tight shadow-sm border border-muted/30 whitespace-nowrap">{displayUser}</span>
          </div>
          <span className="text-muted-foreground truncate group-hover:text-foreground transition-colors flex flex-1 items-center">
            {textStr}
            {versieBadge}
          </span>
          <div className="ml-auto flex items-center gap-2 shrink-0">
            {prodData}
            {maintenanceData}
          </div>
        </div>
      );
      return acc;
    }, []);
  };

  // --- Production Card ---
  const ProductionCard = ({ data }: { data: OsintCounterData }) => {
    const sorted = sortPressMetrics(data.pressBreakdown);
    return (
      <Card
        className="p-2 bg-card border shadow-sm cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
        onClick={() => navigate('/Analyses/statistieken/productie')}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className={cn(
            "size-10 rounded flex items-center justify-center",
            data.status === 'nominal' ? "bg-green-500/5" : data.status === 'warning' ? "bg-amber-500/5" : "bg-red-500/5"
          )}>
            <data.icon className={cn(
              "w-5 h-5",
              data.status === 'nominal' ? "text-green-500" : data.status === 'warning' ? "text-amber-500" : "text-red-500"
            )} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">{data.label}</div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black leading-tight">{data.mainValue}</span>
              {data.sideValue && <span className="text-base font-bold text-muted-foreground">{data.sideValue}</span>}
            </div>
            <PressBreakdownText metrics={sorted} isLarge={data.label.toLowerCase().includes('oplage') || data.label.toLowerCase().includes('productie')} showPercent />
          </div>
        </div>
      </Card>
    );
  };

  // --- Maintenance Card ---
  const MaintenanceCard = ({ title, count, breakdown, colorScheme }: {
    title: string; count: number; breakdown: PressMetric[];
    colorScheme: 'red' | 'amber' | 'green';
  }) => {
    const colors = {
      red: { bg: 'bg-red-500/10', text: 'text-red-500' },
      amber: { bg: 'bg-amber-500/10', text: 'text-amber-500' },
      green: { bg: 'bg-green-500/10', text: 'text-green-500' }
    };
    const scheme = count > 0 ? colors[colorScheme] : colors.green;
    const IconComp = colorScheme === 'green' ? CheckCircle2 : AlertCircle;
    const sorted = sortPressMetrics(breakdown);

    return (
      <Card
        className="p-2 bg-card border shadow-sm cursor-pointer hover:border-primary/50 hover:shadow-md transition-all group"
        onClick={() => navigate('/Analyses/statistieken/onderhoud')}
      >
        <div className="flex items-center gap-3 mb-1">
          <div className={cn("size-10 rounded flex items-center justify-center", scheme.bg)}>
            <IconComp className={cn("w-5 h-5", scheme.text)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider">{title}</div>
            <div className="text-2xl font-black leading-tight">{count}</div>
            <PressBreakdownText metrics={sorted} />
          </div>
        </div>
      </Card>
    );
  };

  // --- RENDER ---
  return (
    <div className="flex flex-col h-[calc(95vh-var(--header-height,64px))] bg-background text-foreground p-2 gap-3 overflow-hidden">

      {/* TOP HEADER ROW */}
      <div className="flex items-center gap-4 justify-between flex-wrap shrink-0">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-lg bg-card border flex items-center justify-center">
            <Radio className="w-6 h-6 text-primary" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tighter uppercase">OVERZICHT</h1>
              <Tabs value={timeRange} onValueChange={(v) => setTimeRange(v as 'week' | 'month')}>
                <TabsList className="tab-pill-list">
                  <TabsTrigger value="week" className="tab-pill-trigger">Week</TabsTrigger>
                  <TabsTrigger value="month" className="tab-pill-trigger">Maand</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="flex items-center gap-2 text-[12px] uppercase tracking-widest text-muted-foreground font-bold">
              <span className="text-green-600 flex items-center gap-1">
                <div className="size-1.5 rounded-full bg-green-500 animate-pulse"></div>
                LIVE
              </span>
            </div>
          </div>
        </div>

        {/* Yearly KPIs */}
        <div className="grid grid-cols-3 gap-4 w-[calc(50%-12px)]">
          <Card className="p-3 bg-card border shadow-sm h-full flex flex-col justify-center col-start-2">
            <div className="flex items-center gap-3">
              <div className="size-10 bg-primary/5 rounded flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider truncate">Jobs ({new Date().getFullYear()})</div>
                <div className="flex items-baseline gap-2">
                  <div className="text-lg font-black leading-tight">{yearlyStats.jobsCount.toLocaleString()}</div>
                  <div className="text-[10px] font-bold text-muted-foreground uppercase">{yearlyStats.versionsCount} versies</div>
                </div>
                <PressBreakdownText metrics={yearlyStats.pressJobs} showPercent />
              </div>
            </div>
          </Card>
          <Card className="p-3 bg-card border shadow-sm h-full flex flex-col justify-center col-start-3">
            <div className="flex items-center gap-3">
              <div className="size-10 bg-green-500/5 rounded flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider truncate">Netto {new Date().getFullYear()}</div>
                <div className="text-lg font-black leading-tight">{yearlyStats.totalNetto.toLocaleString()}</div>
                <PressBreakdownText metrics={yearlyStats.pressNetto} isLarge showPercent />
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* MIDDLE BODY: Left = Productie, Right = Onderhoud */}
      <div className="flex gap-6 shrink-0">
        {/* Productie (left) */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest text-muted-foreground">
            <Zap className="w-3.5 h-3.5" /> Productie ({timeRange === 'week' ? 'deze week' : 'deze maand'})
          </div>
          <div className="grid grid-cols-3 gap-4">
            {counters.map((c, i) => <ProductionCard key={i} data={c} />)}
          </div>
        </div>

        {/* Onderhoud (right) */}
        <div className="flex-1 flex flex-col gap-3">
          <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest text-muted-foreground">
            <Wrench className="w-3.5 h-3.5" /> Onderhoud ({timeRange === 'week' ? 'deze week' : 'deze maand'})
          </div>
          <div className="grid grid-cols-3 gap-4">
            <MaintenanceCard
              title={timeRange === 'week' ? "Vervalt deze week" : "Vervalt deze maand"}
              count={maintenanceStats.overdueInRange.count}
              breakdown={maintenanceStats.overdueInRange.pressBreakdown}
              colorScheme="amber"
            />
            <MaintenanceCard
              title="Achterstallig"
              count={maintenanceStats.alreadyOverdue.count}
              breakdown={maintenanceStats.alreadyOverdue.pressBreakdown}
              colorScheme="red"
            />
            <MaintenanceCard
              title={timeRange === 'week' ? "Afgerond deze week" : "Afgerond deze maand"}
              count={maintenanceStats.completedInRange.count}
              breakdown={maintenanceStats.completedInRange.pressBreakdown}
              colorScheme="green"
            />
          </div>
        </div>
      </div>

      {/* BOTTOM: Two Activity Streams (pinned, fill remaining space) */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        {/* Orders Stream (left) */}
        <Card className="flex-1 flex flex-col overflow-hidden bg-card border shadow-sm min-h-0">
          <div className="py-2 px-4 border-b flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-primary" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Orders</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-1.5 cursor-pointer group">
                <span className="text-[9px] font-bold text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-tighter">Aangepaste jobs</span>
                <div
                  onClick={() => setShowOldOrders(!showOldOrders)}
                  className={cn(
                    "w-7 h-4 rounded-full transition-colors relative flex items-center px-0.5",
                    showOldOrders ? "bg-primary" : "bg-muted-foreground/30"
                  )}
                >
                  <div className={cn(
                    "w-3 h-3 bg-white rounded-full shadow-sm transition-transform",
                    showOldOrders ? "translate-x-3" : "translate-x-0"
                  )} />
                </div>
              </label>
            </div>
          </div>
          <div className="flex-1 px-3 pt-0 pb-3 overflow-y-auto min-h-0">
            <div className="flex flex-col gap-y-0.5">
              {renderOrderStream(groupedOrders)}
              {groupedOrders.length === 0 && (
                <div className="text-[11px] text-muted-foreground italic py-4 text-center">Geen recente order activiteit.</div>
              )}
            </div>
          </div>
        </Card>

        {/* Onderhoud Stream (right) */}
        <Card className="flex-1 flex flex-col overflow-hidden bg-card border shadow-sm min-h-0">
          <div className="py-2 px-4 border-b flex items-center gap-2 shrink-0">
            <Wrench className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Onderhoud</span>
          </div>
          <div className="flex-1 px-3 pt-0 pb-3 overflow-y-auto min-h-0">
            <div className="flex flex-col gap-y-0.5">
              {renderActivityStream(onderhoudActivities)}
              {onderhoudActivities.length === 0 && (
                <div className="text-[11px] text-muted-foreground italic py-4 text-center">Geen recente onderhoud activiteit.</div>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Log Details Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Activiteit Details
            </DialogTitle>
            <div className="text-sm text-gray-500">
              {selectedLog && (
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm">
                  <span>Gebruiker: <strong>{selectedLog.user}</strong></span>
                  <span>Tijd: <strong>{formatDateTime(selectedLog.timestamp)}</strong></span>
                </div>
              )}
            </div>
          </DialogHeader>

          {selectedLog && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Entiteit</h4>
                  <p className="text-sm font-medium text-gray-900">{selectedLog.entity} | {selectedLog.entityName}</p>
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Actie</h4>
                  <div className="flex items-center gap-2">
                    {getActionBadge(selectedLog.action)}
                    {selectedLog.action !== 'Updated' && (
                      <span className="text-sm text-gray-700">{selectedLog.details}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Drukwerken Aggregated Summary Card */}
              {selectedLog.entity === 'FinishedJob' && (
                <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden mt-4">
                  <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Printer className="w-4 h-4 text-orange-600" />
                      Afgewerkte Versies
                    </h3>
                    {selectedVersionIds.size > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 text-gray-500 hover:text-gray-900"
                        onClick={() => setSelectedVersionIds(new Set())}
                      >
                        Wis selectie ({selectedVersionIds.size})
                      </Button>
                    )}
                  </div>
                  {(() => {
                    const latestStr = selectedLog.newValue || selectedLog.oldValue || '';
                    const mainChanges = parseChanges(latestStr, latestStr);
                    const getMainField = (name: string) => mainChanges.find(c => c.field.toLowerCase() === name.toLowerCase())?.new || '-';
                    const orderNr = getMainField('Order') !== '-' ? getMainField('Order') : (selectedLog.entityName.split(' - ')[0] || '-');

                    // Group logs by entityId to find unique versions
                    const versionLogs = activities.filter(l => l.entity === 'FinishedJob' && l.entityName.startsWith(orderNr));
                    const uniqueJobIds = Array.from(new Set(versionLogs.map(l => l.entityId)));

                    const aggregatedVersions = uniqueJobIds.map(jobId => {
                      const logsForJob = versionLogs.filter(l => l.entityId === jobId);
                      logsForJob.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

                      const firstLog = logsForJob[0];
                      const lastLog = logsForJob[logsForJob.length - 1];

                      const lastChanges = parseChanges(lastLog.newValue || lastLog.oldValue || '', lastLog.newValue || lastLog.oldValue || '');
                      const getField = (name: string) => lastChanges.find(c => c.field.toLowerCase() === name.toLowerCase())?.new || '-';

                      return {
                        id: jobId || '',
                        createdDate: firstLog.timestamp,
                        naam: getField('Naam') !== '-' ? getField('Naam') : (lastLog.entityName.split(' - ')[1] || '-'),
                        versie: getField('Versie'),
                        netto: getField('Netto'),
                        groen: getField('Groen'),
                        rood: getField('Rood'),
                        delta: getField('Delta %'),
                      };
                    }).sort((a, b) => new Date(a.createdDate).getTime() - new Date(b.createdDate).getTime());

                    return (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow className="bg-white hover:bg-white border-none">
                              <TableHead className="w-[120px] text-xs font-semibold text-gray-500 uppercase">Aanmaakdatum</TableHead>
                              <TableHead className="text-xs font-semibold text-gray-500 uppercase">Naam / Versie</TableHead>
                              <TableHead className="text-xs font-semibold text-gray-500 uppercase">Netto</TableHead>
                              <TableHead className="text-xs font-semibold text-gray-500 uppercase">Gecontroleerd</TableHead>
                              <TableHead className="text-xs font-semibold text-gray-500 uppercase">Delta %</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {aggregatedVersions.map(v => {
                              const isSelected = selectedVersionIds.has(v.id);
                              return (
                                <TableRow
                                  key={v.id}
                                  className={`cursor-pointer transition-colors ${isSelected ? 'bg-blue-50/50 hover:bg-blue-50/80 border-l-2 border-l-blue-500' : 'hover:bg-gray-50/50 border-l-2 border-l-transparent'}`}
                                  onClick={() => {
                                    const next = new Set(selectedVersionIds);
                                    if (next.has(v.id)) next.delete(v.id);
                                    else next.add(v.id);
                                    setSelectedVersionIds(next);
                                  }}
                                >
                                  <TableCell className="text-xs text-gray-500">
                                    {formatDateTime(v.createdDate)}
                                  </TableCell>
                                  <TableCell>
                                    <div className="flex flex-col">
                                      <span className="font-medium text-gray-900 truncate max-w-[200px]" title={v.naam}>{v.naam}</span>
                                      {v.versie !== '-' && <span className="text-xs text-gray-500">Versie: {v.versie}</span>}
                                    </div>
                                  </TableCell>
                                  <TableCell className="font-medium text-blue-600">
                                    {v.netto}
                                  </TableCell>
                                  <TableCell>
                                    <span className="text-green-600 font-medium">{v.groen}</span>
                                    <span className="text-gray-400 mx-1">/</span>
                                    <span className="text-red-600 font-medium">{v.rood}</span>
                                  </TableCell>
                                  <TableCell className="font-medium">
                                    {v.delta}
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Wijzigingenoverzicht */}
              {(selectedLog.newValue || '') && selectedLog.action === 'Updated' && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Search className="w-4 h-4 text-blue-500" />
                    Wijzigingenoverzicht
                  </h3>
                  <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm space-y-3">
                    {parseChanges(selectedLog.oldValue || '', selectedLog.newValue || '')
                      .filter(change => change.old !== change.new)
                      .filter(change => !change.field.toLowerCase().includes('volgend onderhoud') && !change.field.toLowerCase().includes('volgende datum'))
                      .map((change, idx) => {
                        const oldVal = change.old.length > 100 ? change.old.substring(0, 97) + '...' : change.old;
                        const newVal = change.new.length > 100 ? change.new.substring(0, 97) + '...' : change.new;
                        return (
                          <div key={idx} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2 border-b border-gray-50 last:border-0 pb-2 last:pb-0">
                            <span className="font-bold text-gray-900 shrink-0">{change.field}:</span>
                            <div className="flex flex-wrap items-center gap-1.5">
                              {change.old !== '-' && (
                                <>
                                  <span className="text-gray-400 italic line-through font-normal">{oldVal}</span>
                                  <span className="text-gray-400">→</span>
                                </>
                              )}
                              <span className="text-blue-700 font-medium">{newVal}</span>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* History Section */}
              {selectedLog.entityId && selectedLog.entityId !== 'new' && (
                <div className="space-y-3 pt-2 border-t border-gray-100">
                  <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-500" />
                    Activiteitshistorie (Vorige wijzigingen)
                  </h3>
                  <div className="bg-white border border-gray-200 rounded-lg overflow-hidden shadow-sm">
                    <Table>
                      <TableHeader>
                        {selectedLog.entity === 'FinishedJob' ? (
                          <TableRow className="bg-gray-50/80">
                            <TableHead className="w-[120px] font-semibold text-gray-900">Datum</TableHead>
                            <TableHead className="w-[100px] font-semibold text-gray-900">Actie</TableHead>
                            <TableHead className="font-semibold text-gray-900">Order</TableHead>
                            <TableHead className="font-semibold text-gray-900">Naam</TableHead>
                            <TableHead className="font-semibold text-gray-900">Blz</TableHead>
                            <TableHead className="font-semibold text-gray-900">Netto</TableHead>
                            <TableHead className="font-semibold text-gray-900">Groen</TableHead>
                            <TableHead className="font-semibold text-gray-900">Rood</TableHead>
                            <TableHead className="font-semibold text-gray-900">Delta %</TableHead>
                            <TableHead className="font-semibold text-gray-900">Opmerkingen</TableHead>
                          </TableRow>
                        ) : (
                          <TableRow className="bg-gray-50/80">
                            <TableHead className="w-[120px] font-semibold text-gray-900">Datum</TableHead>
                            <TableHead className="font-semibold text-gray-900">Taak</TableHead>
                            <TableHead className="font-semibold text-gray-900">Laatste onderhoud</TableHead>
                            <TableHead className="font-semibold text-gray-900">Volgende onderhoud</TableHead>
                            <TableHead className="font-semibold text-gray-900">Operators</TableHead>
                            <TableHead className="font-semibold text-gray-900">Opmerkingen</TableHead>
                          </TableRow>
                        )}
                      </TableHeader>
                      <TableBody>
                        {activities
                          .filter(l => {
                            if (selectedLog.entity === 'FinishedJob') {
                              const orderNr = selectedLog.entityName.split(' - ')[0];
                              const isSameOrder = l.entity === 'FinishedJob' && l.entityName.startsWith(orderNr);
                              if (!isSameOrder) return false;
                              if (selectedVersionIds.size > 0 && !selectedVersionIds.has(l.entityId || '')) return false;
                              return true;
                            }
                            return l.entity === selectedLog.entity && l.entityId === selectedLog.entityId;
                          })
                          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                          .map((histLog) => {
                            const isCurrent = histLog.id === selectedLog.id;
                            const rowClass = isCurrent ? "bg-blue-50/30" : "";

                            if (histLog.entity === 'FinishedJob') {
                              // Drukwerken History Row
                              const changes = parseChanges(histLog.oldValue || '', histLog.newValue || '');
                              const diffs = changes.filter(c => c.old !== c.new);

                              const getFieldDiff = (name: string) => {
                                const diff = diffs.find(c => c.field.toLowerCase() === name.toLowerCase());
                                if (!diff) {
                                  return <span className="text-gray-600">{changes.find(c => c.field.toLowerCase() === name.toLowerCase())?.new || '-'}</span>;
                                }
                                return (
                                  <div className="flex items-center gap-1 flex-wrap">
                                    <span className="line-through text-gray-400">{diff.old}</span>
                                    <span className="text-gray-400">→</span>
                                    <span className="text-blue-600 font-medium">{diff.new}</span>
                                  </div>
                                );
                              };

                              const rawVersieObj = changes.find(c => c.field.toLowerCase() === 'versie');
                              const rawVersie = rawVersieObj?.new || '-';

                              return (
                                <TableRow key={histLog.id} className={rowClass}>
                                  <TableCell className="text-xs text-gray-500 whitespace-nowrap align-top">
                                    {formatDateTime(histLog.timestamp)}
                                  </TableCell>
                                  <TableCell className="align-top">
                                    {getActionBadge(histLog.action)}
                                  </TableCell>
                                  <TableCell className="text-xs align-top font-medium">
                                    {(changes.find(c => c.field.toLowerCase() === 'order')?.new || '-') === '-'
                                      ? histLog.entityName.split(' - ')[0]
                                      : getFieldDiff('Order')}
                                  </TableCell>
                                  <TableCell className="text-xs align-top">
                                    <div className="flex flex-col">
                                      <span className="font-medium text-gray-900">{histLog.entityName.split(' - ')[1] || histLog.entityName}</span>
                                      {rawVersie !== '-' && (
                                        <span className="text-gray-500 mt-0.5">Versie: {getFieldDiff('Versie')}</span>
                                      )}
                                    </div>
                                  </TableCell>
                                  <TableCell className="text-xs align-top">
                                    {getFieldDiff('Blz')}
                                  </TableCell>
                                  <TableCell className="text-xs align-top">
                                    {getFieldDiff('Netto')}
                                  </TableCell>
                                  <TableCell className="text-xs align-top">
                                    {getFieldDiff('Groen')}
                                  </TableCell>
                                  <TableCell className="text-xs align-top">
                                    {getFieldDiff('Rood')}
                                  </TableCell>
                                  <TableCell className="text-xs align-top">
                                    {getFieldDiff('Delta %')}
                                  </TableCell>
                                  <TableCell className="text-xs text-gray-600 italic max-w-xs truncate align-top">
                                    {histLog.action === 'Updated' && diffs.length > 0 ? (
                                      diffs.filter(d => !['Order', 'Naam', 'Versie', 'Blz', 'Netto', 'Groen', 'Rood', 'Delta %'].includes(d.field)).map(d => `${d.field}: ${d.new}`).join(', ')
                                    ) : (
                                      histLog.details
                                    )}
                                  </TableCell>
                                </TableRow>
                              );
                            } else {
                              // Task / Default History Row
                              const histChanges = parseChanges(histLog.oldValue || '', histLog.newValue || '');
                              const lastMaintenance = histChanges.find(c => {
                                const f = c.field.toLowerCase();
                                return f.includes('laatste onderhoud') || f.includes('datum') || f === 'last_date';
                              })?.new || '-';
                              const nextMaintenance = histChanges.find(c => {
                                const f = c.field.toLowerCase();
                                return f.includes('volgend onderhoud') || f.includes('volgende datum') || f === 'next_date';
                              })?.new || '-';
                              const operators = histChanges.find(c => {
                                const f = c.field.toLowerCase();
                                return f.includes('operator') || f.includes('toegewezen') || f.includes('assigned_operator');
                              })?.new || '-';
                              const opmerkingen = histChanges.find(c => {
                                const f = c.field.toLowerCase();
                                return f.includes('opmerking');
                              })?.new || '-';

                              return (
                                <TableRow key={histLog.id} className={rowClass}>
                                  <TableCell className="text-xs text-gray-500 whitespace-nowrap">
                                    {formatDateTime(histLog.timestamp)}
                                  </TableCell>
                                  <TableCell className="text-xs font-medium text-gray-700">
                                    {histLog.entityName}
                                  </TableCell>
                                  <TableCell className="text-xs text-gray-600">
                                    {lastMaintenance}
                                  </TableCell>
                                  <TableCell className="text-xs text-gray-600">
                                    {nextMaintenance}
                                  </TableCell>
                                  <TableCell className="text-xs text-gray-600">
                                    {operators}
                                  </TableCell>
                                  <TableCell className="text-xs text-gray-600 italic max-w-xs truncate">
                                    {opmerkingen}
                                  </TableCell>
                                </TableRow>
                              );
                            }
                          })}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

            </div>
          )}
          <div className="flex justify-end mt-1">
            <Button variant="outline" onClick={() => setSelectedLog(null)}>Sluiten</Button>
          </div>
        </DialogContent>
      </Dialog>

      <style dangerouslySetInnerHTML={{
        __html: `
        ::-webkit-scrollbar { width: 0px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: hsl(var(--muted)); border-radius: 10px; }
      `}} />
    </div>
  );
}
