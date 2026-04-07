import React from 'react';
import {
  Zap,
  Activity,
  AlertCircle,
  CheckCircle2,
  Layers,
  BarChart3,
  Wrench,
  Clock,
  ChevronRight,
  History,
  Plus
} from 'lucide-react';
import { format, startOfWeek, subWeeks, startOfMonth, subMonths, getISOWeek } from 'date-fns';
import { nl } from 'date-fns/locale';
import { pb } from './AuthContext';
import { Card } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { cn } from './ui/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter
} from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";

// --- Types & Interfaces ---

interface ActivityEvent {
  id: string;
  timestamp: Date;
  user: string;
  action: string;
  entity: string;
  entityName: string;
  details: string;
  newValue: string;
  oldValue: string;
  entityId: string;
  status: 'info' | 'success' | 'warning' | 'error';
}

interface PressMetric {
  press: string;
  value: number;
}

// --- Utilities & Subcomponents ---

export const sortPressMetrics = (metrics: PressMetric[]): PressMetric[] => {
  return [...metrics].sort((a, b) => {
    const order = ['Lithoman', 'C818', 'C80'];
    const idxA = order.indexOf(a.press);
    const idxB = order.indexOf(b.press);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.press.localeCompare(b.press);
  });
};

export const PressBreakdownText = ({ metrics, isLarge = false, showPercent = false }: { metrics: PressMetric[], isLarge?: boolean, showPercent?: boolean }) => {
  if (!metrics || metrics.length === 0) return <div className="h-[14px]"></div>;

  return (
    <div className="flex items-center gap-x-2 gap-y-1 flex-wrap min-h-[14px]">
      {metrics.map((m, i) => (
        <div key={i} className="flex items-baseline gap-1 leading-none text-muted-foreground">
          <span className={cn("font-semibold uppercase tracking-tighter opacity-60", isLarge ? "text-[10px]" : "text-[9px]")}>{m.press}:</span>
          <span className={cn("font-semibold tracking-tight", isLarge ? "text-[11px]" : "text-[10px]")}>
            {showPercent ? `${m.value}%` : m.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

export const ProductionCard = ({ data }: { data: any }) => {
  return (
    <Card className="p-3 bg-card border shadow-sm flex flex-col gap-2 relative overflow-hidden group hover:border-primary/50 transition-colors">
      <div className="flex items-center gap-3 relative z-10">
        <div className={cn(
          "size-10 rounded-xl flex items-center justify-center shrink-0",
          data.status === 'critical' ? "bg-red-500/10" : "bg-primary/5"
        )}>
          <data.icon className={cn(
            "w-5 h-5",
            data.status === 'critical' ? "text-red-500" : "text-primary"
          )} />
        </div>
        <div className="min-w-0 flex-1 flex flex-col gap-0.5">
          <div className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider truncate">{data.label}</div>
          <div className="flex items-baseline gap-2">
            <div className="text-xl font-black leading-none tracking-tight">{data.mainValue}</div>
            {data.sideValue && <div className="text-[10px] font-bold text-muted-foreground opacity-60 leading-none">{data.sideValue}</div>}
          </div>
          <div className="mt-0.5">
            <PressBreakdownText metrics={data.pressBreakdown} showPercent={data.label === 'Productie' || data.label === 'Verlies' || data.label === 'Delta'} />
          </div>
        </div>
      </div>
    </Card>
  );
};

export const MaintenanceCard = ({ title, count, breakdown, colorScheme }: { title: string, count: number, breakdown: PressMetric[], colorScheme: 'amber' | 'red' | 'green' }) => {
  const colors = {
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', icon: Clock },
    red: { bg: 'bg-red-500/10', text: 'text-red-500', icon: AlertCircle },
    green: { bg: 'bg-green-500/10', text: 'text-green-500', icon: CheckCircle2 }
  };
  const Cfg = colors[colorScheme];

  return (
    <Card className="p-3 bg-card border shadow-sm flex flex-col gap-2 hover:border-primary/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={cn("size-10 rounded-xl flex items-center justify-center shrink-0", Cfg.bg)}>
          <Cfg.icon className={cn("w-5 h-5", Cfg.text)} />
        </div>
        <div className="min-w-0 flex-1 flex flex-col gap-0.5">
          <div className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider truncate">{title}</div>
          <div className="text-xl font-black leading-none">{count}</div>
          <div className="mt-0.5">
            <PressBreakdownText metrics={breakdown} />
          </div>
        </div>
      </div>
    </Card>
  );
};

// --- Main Component ---

export const Overzicht = () => {
  const [activities, setActivities] = React.useState<ActivityEvent[]>([]);
  const [counters, setCounters] = React.useState<any[]>([]);
  const [timeRange, setTimeRange] = React.useState<'week' | 'lastWeek' | 'month' | 'lastMonth'>('week');
  const [selectedLog, setSelectedLog] = React.useState<ActivityEvent | null>(null);
  const [expandedOrders, setExpandedOrders] = React.useState<Set<string>>(new Set());
  const [showOldOrders, setShowOldOrders] = React.useState(false);
  const [jobDates, setJobDates] = React.useState<Record<string, string>>({});
  const [currentRangeStart, setCurrentRangeStart] = React.useState<string>('');
  const [yearlyStats, setYearlyStats] = React.useState({
    jobsCount: 0,
    versionsCount: 0,
    totalNetto: 0,
    pressJobs: [] as PressMetric[],
    pressNetto: [] as PressMetric[]
  });
  const [maintenanceStats, setMaintenanceStats] = React.useState({
    overdueInRange: { count: 0, pressBreakdown: [] as PressMetric[] },
    alreadyOverdue: { count: 0, pressBreakdown: [] as PressMetric[] },
    completedInRange: { count: 0, pressBreakdown: [] as PressMetric[] }
  });

  const now = new Date();
  const weekLabel = `Deze week (W${getISOWeek(now)})`;
  const lastWeekLabel = `W${getISOWeek(subWeeks(now, 1))}`;
  const monthLabel = format(now, 'MMMM', { locale: nl });
  const lastMonthLabel = format(subMonths(now, 1), 'MMMM', { locale: nl });

  const getActiveRangeLabel = () => {
    if (timeRange === 'week') return 'deze week';
    if (timeRange === 'lastWeek') return 'vorige week';
    if (timeRange === 'month') return 'deze maand';
    return 'vorige maand';
  };

  React.useEffect(() => {
    fetchData();
    fetchMaintenanceData();

    // Subscribe to changes
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
          oldValue: r.oldValue || r.oldvalue || '',
          entityId: r.entity_id || r.entityId || '',
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

  const getStatusFromAction = (action: string): 'info' | 'success' | 'warning' | 'error' => {
    const a = action?.toLowerCase() || '';
    if (a.includes('error') || a.includes('fail')) return 'error';
    if (a.includes('delet') || a.includes('remove')) return 'warning';
    if (a.includes('creat') || a.includes('complet') || a.includes('finish')) return 'success';
    return 'info';
  };

  const fetchData = async (range: 'week' | 'lastWeek' | 'month' | 'lastMonth' = timeRange) => {
    try {
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const yearStr = format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd');

      let start: Date;
      let end: Date | null = null;

      if (range === 'week') {
        start = startOfWeek(today, { weekStartsOn: 1 });
      } else if (range === 'lastWeek') {
        start = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
        end = startOfWeek(today, { weekStartsOn: 1 });
      } else if (range === 'month') {
        start = startOfMonth(today);
      } else {
        // lastMonth
        start = startOfMonth(subMonths(today, 1));
        end = startOfMonth(today);
      }

      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = end ? format(end, 'yyyy-MM-dd') : null;

      const rangeFilter = endStr
        ? `((voltooid_op >= "${startStr}" && voltooid_op < "${endStr}") || (date >= "${startStr}" && date < "${endStr}"))`
        : `(voltooid_op >= "${startStr}" || date >= "${startStr}")`;

      const yearFilter = `(voltooid_op >= "${yearStr}" || date >= "${yearStr}")`;
      const logsFilter = endStr
        ? `created >= "${startStr}" && created < "${endStr}"`
        : `created >= "${startStr}"`;

      const fetchJobsResilient = async (filter: string) => {
        try {
          return await pb.collection('drukwerken').getFullList({
            filter: filter,
            sort: '-created',
            expand: 'pers'
          });
        } catch (err: any) {
          if (err.status === 400 && filter.includes('voltooid_op')) {
            const fallbackFilter = filter.replace(/voltooid_op/g, 'date');
            return await pb.collection('drukwerken').getFullList({
              filter: fallbackFilter,
              sort: '-created',
              expand: 'pers'
            });
          }
          throw err;
        }
      };

      const [rangeJobsRaw, logs, yearJobsRaw] = await Promise.all([
        fetchJobsResilient(rangeFilter),
        pb.collection('activity_logs').getList(1, 500, { filter: logsFilter, sort: '-created' }),
        fetchJobsResilient(yearFilter)
      ]);

      const rangeJobs = rangeJobsRaw.filter(item => (item.groen || 0) !== 0 || (item.rood || 0) !== 0);
      const yearJobs = yearJobsRaw.filter(item => (item.groen || 0) !== 0 || (item.rood || 0) !== 0);

      processProduction(rangeJobs, startStr);
      processActivities(logs.items);
      processYearlyStats(yearJobs, yearStr);

      const dates: Record<string, string> = {};
      rangeJobsRaw.forEach(j => {
        if (j.voltooid_op) dates[j.id] = j.voltooid_op.split(' ')[0];
        else if (j.date) dates[j.id] = j.date.split(' ')[0];
      });
      setJobDates(dates);
      setCurrentRangeStart(startStr);
    } catch (err) {
      console.error("OSINT fetch failed:", err);
      processProduction([], "");
      processYearlyStats([], "");
    }
  };

  const fetchMaintenanceData = async (range: 'week' | 'lastWeek' | 'month' | 'lastMonth' = timeRange) => {
    try {
      const tasks = await pb.collection('onderhoud').getFullList({ expand: 'pers' });
      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

      let rangeStart: Date;
      let rangeEnd: Date;

      if (range === 'week') {
        rangeStart = startOfWeek(today, { weekStartsOn: 1 });
        rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      } else if (range === 'lastWeek') {
        rangeStart = startOfWeek(subWeeks(today, 1), { weekStartsOn: 1 });
        rangeEnd = new Date(startOfWeek(today, { weekStartsOn: 1 }));
        rangeEnd.setMilliseconds(-1);
      } else if (range === 'month') {
        rangeStart = startOfMonth(today);
        rangeEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      } else {
        rangeStart = startOfMonth(subMonths(today, 1));
        rangeEnd = startOfMonth(today);
        rangeEnd.setMilliseconds(-1);
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

  const processProduction = (items: any[], rangeStartStr: string) => {
    const pressMap: Record<string, { green: number, red: number, planned: number }> = {};
    let totalGreen = 0, totalRed = 0, totalPlanned = 0;

    if (!items || items.length === 0) {
      setCounters([
        { label: 'Productie', mainValue: '0', status: 'nominal', icon: AlertCircle, pressBreakdown: [] },
        { label: 'Verlies', mainValue: '0.0%', sideValue: '0', status: 'nominal', icon: AlertCircle, pressBreakdown: [] },
        { label: 'Delta', mainValue: '0.0%', sideValue: '0', status: 'nominal', icon: AlertCircle, pressBreakdown: [] }
      ]);
      return;
    }

    items.forEach(item => {
      const prodDate = item.voltooid_op?.split(' ')[0] || item.date?.split(' ')[0];
      if (prodDate && rangeStartStr && prodDate < rangeStartStr) return;

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

    let totalProdNetto = 0;
    items.forEach(item => {
      if ((item.groen || 0) > 0) totalProdNetto += (item.netto_oplage || 0);
    });

    const lossPercentage = totalGreen > 0 ? (totalRed / totalGreen * 100).toFixed(1) : '0.0';

    setCounters([
      { label: 'Productie', mainValue: totalProdNetto.toLocaleString(), pressBreakdown: pressGreen, status: totalGreen < totalPlanned ? 'warning' : 'nominal', icon: AlertCircle },
      { label: 'Verlies', mainValue: `${lossPercentage}%`, sideValue: totalRed.toLocaleString(), pressBreakdown: pressLoss, status: parseFloat(lossPercentage) > 5 ? 'warning' : 'nominal', icon: AlertCircle },
      { label: 'Delta', mainValue: displayDelta, sideValue: totalDelta.toLocaleString(), pressBreakdown: pressDelta, status: Math.abs(deltaPercentage) > 0.01 ? (totalDelta > 0 ? 'critical' : 'warning') : 'nominal', icon: AlertCircle }
    ]);
  };

  const processYearlyStats = (items: any[], yearStartStr: string) => {
    const orderNumbers = new Set<string>();
    const orderByPress: Record<string, Set<string>> = {};
    const nettoMap: Record<string, number> = {};
    let totalNetto = 0, versionsCount = 0;

    items.forEach(item => {
      const groen = item.groen || 0;
      if (groen <= 0) return;
      const prodDate = item.voltooid_op?.split(' ')[0] || item.date?.split(' ')[0];
      if (!prodDate || (yearStartStr && prodDate < yearStartStr)) return;

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

  const getOrderKey = (item: ActivityEvent) => {
    if (item.newValue) {
      const parts = item.newValue.split('|||');
      const orderPart = parts.find(p => p.startsWith('Order:'));
      if (orderPart) return orderPart.split(':')[1].trim();
    }
    const match = item.entityName?.match(/DT\s*(\d+)/i);
    return match ? match[1] : (item.entityName || 'Onbekend');
  };

  const getVersie = (item: ActivityEvent) => {
    if (item.newValue) {
      const parts = item.newValue.split('|||');
      const vPart = parts.find(p => p.startsWith('Versie:'));
      if (vPart) return vPart.split(':')[1].trim();
    }
    return '';
  };

  const orderActivities = React.useMemo(() => {
    const raw = activities.filter(a => {
      const e = a.entity?.toLowerCase() || '';
      const d = a.details?.toLowerCase() || '';
      return e.includes('job') || e.includes('druk') || d.includes('druk') || d.includes('order') || e === 'finishedjob';
    });
    const latestPerJob = new Map<string, ActivityEvent>();
    raw.forEach(a => {
      const id = `${getOrderKey(a)}|${getVersie(a)}`;
      if (!latestPerJob.has(id)) latestPerJob.set(id, a);
      else if (a.timestamp > latestPerJob.get(id)!.timestamp) latestPerJob.set(id, a);
    });
    return Array.from(latestPerJob.values()).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [activities]);

  const groupedOrders = React.useMemo(() => {
    const groups = new Map<string, ActivityEvent[]>();
    orderActivities.forEach(a => {
      const dayStr = format(a.timestamp, 'yyyy-MM-dd');
      if (!showOldOrders && a.entityId && currentRangeStart) {
        const prodDate = jobDates[a.entityId];
        if (prodDate && prodDate !== dayStr) return;
        if (a.entity === 'FinishedJob' && !prodDate) return;
      }
      const key = `${dayStr}|${getOrderKey(a)}`;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(a);
    });
    return Array.from(groups.entries()).sort((a, b) => {
      const maxA = Math.max(...a[1].map(x => x.timestamp.getTime()));
      const maxB = Math.max(...b[1].map(x => x.timestamp.getTime()));
      return maxB - maxA;
    });
  }, [orderActivities, showOldOrders, jobDates, currentRangeStart]);

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
            <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap">{format(itemDate, 'EEEE d MMM', { locale: nl }).toUpperCase()}</span>
            <div className="flex-1 border-b border-muted-foreground/30 h-[1.5px] mb-[1.5px] opacity-20"></div>
          </div>
        );
        lastDateStr = itemDayStr;
      }

      const isExpanded = expandedOrders.has(orderKey);
      const toggleOrder = (e: React.MouseEvent) => {
        e.stopPropagation();
        setExpandedOrders(prev => {
          const next = new Set(prev);
          if (next.has(orderKey)) next.delete(orderKey); else next.add(orderKey);
          return next;
        });
      };

      const renderSingleItem = (item: ActivityEvent, isChild = false) => {
        let groen = 0, rood = 0, typeLabel = '';
        if (item.newValue) {
          item.newValue.split('|||').forEach(p => {
            const [f, v] = p.split(':').map(s => s.trim());
            const numV = Number(v?.replace(/[.,]/g, '')) || 0;
            if (f === 'Groen') groen = numV; else if (f === 'Rood') rood = numV;
            else if (['4/4', '4/0', '1/0', '1/1', '4/1'].includes(f) && numV > 0) typeLabel = f;
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
          <div key={item.id} className={cn("text-[11px] border-l-2 pl-2.5 py-0.5 flex items-center gap-3 hover:bg-muted/50 transition-colors rounded-r cursor-pointer group", isChild ? "ml-6 border-muted/20" : "border-muted hover:border-primary")} onClick={() => setSelectedLog(item)}>
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
              <div className="flex items-center gap-2 overflow-hidden">
                <span className="font-bold truncate">{item.action === 'Deleted' ? `VERWIJDERD: ${textStr}` : textStr}</span>
                {item.entity === 'FinishedJob' && item.newValue && (
                  <div className="flex items-center gap-2 text-muted-foreground shrink-0">
                    <div className="w-px h-3 bg-muted-foreground/20"></div>
                    <div className="flex items-center gap-1.5">
                      <Badge variant="outline" className="h-4 px-1.5 text-[9px] font-bold border-muted-foreground/20">{typeLabel || 'Druk'}</Badge>
                      <span className="font-black text-primary">{groen.toLocaleString()}</span>
                      <span className="text-[9px] font-bold uppercase opacity-50">G</span>
                      {rood > 0 && (
                        <>
                          <span className="font-black text-red-500">{rood.toLocaleString()}</span>
                          <span className="text-[9px] font-bold uppercase opacity-50">R</span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
            {isChild && <div className="flex-1"></div>}
            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity pr-2">
              <ChevronRight className="w-3 h-3 text-muted-foreground" />
            </div>
          </div>
        );
      };
      flatList.push(
        <div key={orderKey} className="relative group">
          {events.length > 1 && (
            <button onClick={toggleOrder} className="absolute left-[54px] top-[4px] z-10 w-3.5 h-3.5 rounded bg-muted/50 hover:bg-muted border border-muted-foreground/10 flex items-center justify-center transition-colors">
              <Plus className={cn("w-2.5 h-2.5 transition-transform", isExpanded && "rotate-45")} />
            </button>
          )}
          {renderSingleItem(latestEvent)}
          {isExpanded && <div className="flex flex-col">{events.slice(1).map(child => renderSingleItem(child, true))}</div>}
        </div>
      );
    });
    return flatList;
  };

  const parseChanges = (oldStr: string, newStr: string) => {
    if (!oldStr && !newStr) return [];
    const split = (s: string) => s.includes('|||') ? s.split('|||') : s.split(' · ');
    const oldParts = split(oldStr), newParts = split(newStr);
    const fieldNames = new Set<string>(), oldMap = new Map<string, string>(), newMap = new Map<string, string>();
    const parse = (part: string, map: Map<string, string>) => {
      const i = part.indexOf(': ');
      if (i !== -1) { const f = part.substring(0, i); map.set(f, part.substring(i + 2)); fieldNames.add(f); }
    };
    oldParts.forEach(p => parse(p, oldMap)); newParts.forEach(p => parse(p, newMap));
    return Array.from(fieldNames).map(f => ({ field: f, old: oldMap.get(f) || '-', new: newMap.get(f) || '-' }));
  };

  const formatDateTime = (date: Date) => {
    const d = new Date(date);
    const dayName = format(d, 'EEEE d MMMM', { locale: nl });
    return `${dayName} om ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const getActionBadge = (action: string) => {
    if (action === 'Created') return <Badge className="bg-green-500 uppercase tracking-widest font-black text-[9px]">Aangemaakt</Badge>;
    if (action === 'Updated') return <Badge className="bg-blue-500 uppercase tracking-widest font-black text-[9px]">Bijgewerkt</Badge>;
    if (action === 'Deleted') return <Badge className="bg-red-500 uppercase tracking-widest font-black text-[9px]">Verwijderd</Badge>;
    return <Badge variant="secondary" className="uppercase tracking-widest font-black text-[9px]">{action}</Badge>;
  };

  return (
    <div className="p-6 flex flex-col gap-4 h-[calc(100vh-56px)] overflow-hidden bg-background/50 font-sans">
      <div className="flex flex-col gap-0 shrink-0">
        {/* HEADER: KPI Strip */}
        <div className="flex items-stretch gap-6 shrink-0">
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-primary/10 rounded-xl"><BarChart3 className="w-6 h-6 text-primary" /></div>
              <div>
                <h1 className="text-2xl font-black tracking-tight leading-none uppercase">Overzicht</h1>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  <span className="text-green-600 flex items-center gap-1"><div className="size-1.5 rounded-full bg-green-500 animate-pulse"></div>LIVE</span>
                </div>
              </div>
              <Card className="ml-29 flex-shrink-0 bg-card border shadow-sm overflow-hidden self-center p-0 h-full">
                <div className="grid grid-cols-2 h-full min-w-[220px]">
                  {/* Current Row */}
                  <Button
                    variant={timeRange === 'week' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-auto py-3 px-4 font-bold text-[12px] uppercase tracking-tight flex items-center justify-center whitespace-nowrap rounded-none border-b border-r"
                    onClick={() => setTimeRange('week')}
                  >
                    {weekLabel}
                  </Button>
                  <Button
                    variant={timeRange === 'month' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-auto py-3 px-4 font-bold text-[12px] uppercase tracking-tight flex items-center justify-center whitespace-nowrap rounded-none border-b"
                    onClick={() => setTimeRange('month')}
                  >
                    {monthLabel}
                  </Button>

                  {/* Previous Row */}
                  <Button
                    variant={timeRange === 'lastWeek' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-auto py-2 px-4 font-bold text-[10px] uppercase tracking-tight flex items-center justify-center opacity-70 whitespace-nowrap rounded-none border-r"
                    onClick={() => setTimeRange('lastWeek')}
                  >
                    {lastWeekLabel}
                  </Button>
                  <Button
                    variant={timeRange === 'lastMonth' ? 'secondary' : 'ghost'}
                    size="sm"
                    className="h-auto py-2 px-4 font-bold text-[10px] uppercase tracking-tight flex items-center justify-center opacity-70 whitespace-nowrap rounded-none"
                    onClick={() => setTimeRange('lastMonth')}
                  >
                    {lastMonthLabel}
                  </Button>
                </div>
              </Card>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4 w-[calc(50%-12px)]">
            <Card className="p-3 bg-card border shadow-sm h-full flex flex-col justify-center col-start-2">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-primary/5 rounded flex items-center justify-center shrink-0"><Layers className="w-5 h-5 text-primary" /></div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider truncate">Jobs {new Date().getFullYear()}</div>
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
                <div className="size-10 bg-green-500/5 rounded flex items-center justify-center shrink-0"><CheckCircle2 className="w-5 h-5 text-green-500" /></div>
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
        <div className="flex gap-6 shrink-0 mt-[-14px]">
          <div className="flex-1 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest text-muted-foreground"><Zap className="w-3.5 h-3.5" /> Productie ({getActiveRangeLabel()})</div>
            <div className="grid grid-cols-3 gap-4">{counters.map((c, i) => <ProductionCard key={i} data={c} />)}</div>
          </div>
          <div className="flex-1 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest text-muted-foreground"><Wrench className="w-3.5 h-3.5" /> Onderhoud ({getActiveRangeLabel()})</div>
            <div className="grid grid-cols-3 gap-4">
              <MaintenanceCard title={timeRange === 'week' || timeRange === 'lastWeek' ? (timeRange === 'week' ? "Vervalt deze week" : "Verviel vorige week") : (timeRange === 'month' ? "Vervalt deze maand" : "Verviel vorige maand")} count={maintenanceStats.overdueInRange.count} breakdown={maintenanceStats.overdueInRange.pressBreakdown} colorScheme="amber" />
              <MaintenanceCard title="Achterstallig" count={maintenanceStats.alreadyOverdue.count} breakdown={maintenanceStats.alreadyOverdue.pressBreakdown} colorScheme="red" />
              <MaintenanceCard title={timeRange === 'week' || timeRange === 'lastWeek' ? (timeRange === 'week' ? "Afgerond deze week" : "Afgerond vorige week") : (timeRange === 'month' ? "Afgerond deze maand" : "Afgerond vorige maand")} count={maintenanceStats.completedInRange.count} breakdown={maintenanceStats.completedInRange.pressBreakdown} colorScheme="green" />
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM: Activities */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        <Card className="flex-1 flex flex-col overflow-hidden bg-card border shadow-sm min-h-0">
          <div className="py-2 px-4 border-b flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2"><Activity className="w-3.5 h-3.5 text-primary" /><span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Orders</span></div>
            <div className="flex items-center gap-2"><label className="flex items-center gap-1.5 cursor-pointer group"><span className="text-[9px] font-bold text-muted-foreground group-hover:text-foreground transition-colors uppercase tracking-tighter">Aangepaste jobs</span><div onClick={() => setShowOldOrders(!showOldOrders)} className={cn("w-7 h-4 rounded-full transition-colors relative flex items-center px-0.5", showOldOrders ? "bg-primary" : "bg-muted-foreground/30")}><div className={cn("w-3 h-3 bg-white rounded-full shadow-sm transition-transform", showOldOrders ? "translate-x-3" : "translate-x-0")} /></div></label></div>
          </div>
          <ScrollArea className="flex-1 p-4"><div className="flex flex-col">{renderOrderStream(groupedOrders)}</div></ScrollArea>
        </Card>
        <Card className="flex-1 flex flex-col overflow-hidden bg-card border shadow-sm min-h-0">
          <div className="py-2 px-4 border-b flex items-center shrink-0"><div className="flex items-center gap-2"><History className="w-3.5 h-3.5 text-primary" /><span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Onderhoud</span></div></div>
          <ScrollArea className="flex-1 p-4"><div className="flex flex-col gap-0.5">{activities.filter(a => { const e = a.entity?.toLowerCase() || ''; const d = a.details?.toLowerCase() || ''; return e.includes('maintenance') || e.includes('onderhoud') || d.includes('onderhoud') || d.includes('task'); }).map((a, i) => (
            <div key={i} className="text-[11px] border-l-2 border-muted pl-2.5 py-1.5 hover:bg-muted/50 transition-colors rounded-r cursor-pointer group" onClick={() => setSelectedLog(a)}>
              <div className="flex items-center gap-2 mb-1"><span className="text-muted-foreground font-mono">[{format(a.timestamp, 'HH:mm')}]</span>{getActionBadge(a.action)}<span className="ml-auto text-[10px] opacity-40">{format(a.timestamp, 'MMM d')}</span></div>
              <div className="flex items-center gap-2"><span className="font-bold truncate">{a.entityName}</span><div className="text-[10px] text-muted-foreground truncate opacity-70">{a.details}</div></div>
            </div>
          ))}</div></ScrollArea>
        </Card>
      </div>

      <Dialog open={!!selectedLog} onOpenChange={(o) => !o && setSelectedLog(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-0 overflow-hidden">
          {selectedLog && (
            <>
              <DialogHeader className="p-6 border-b shrink-0">
                <div className="flex items-center justify-between mb-2"><Badge className={cn("uppercase tracking-widest font-black text-[10px]", selectedLog.status === 'success' ? "bg-green-500" : selectedLog.status === 'warning' ? "bg-amber-500" : selectedLog.status === 'error' ? "bg-red-500" : "bg-blue-500")}>{selectedLog.entity || 'Event'}</Badge><span className="text-[11px] font-mono text-muted-foreground">ID: {selectedLog.id}</span></div>
                <div className="flex items-center gap-3"><div className="p-2 bg-primary/10 rounded-lg"><Activity className="w-5 h-5 text-primary" /></div><div><DialogTitle className="text-xl font-black leading-tight">{selectedLog.entityName || 'Event Details'}</DialogTitle><div className="text-xs text-muted-foreground opacity-70 mt-0.5">{formatDateTime(selectedLog.timestamp)} door <span className="font-bold text-foreground">{selectedLog.user}</span></div></div></div>
              </DialogHeader>
              <ScrollArea className="flex-1 px-6 py-4"><div className="space-y-6">
                <div><h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-2"><div className="w-1 h-3 bg-primary rounded-full"></div>Beschrijving</h4><div className="p-4 rounded-xl bg-muted/30 border border-muted"><p className="text-sm leading-relaxed font-semibold text-foreground">{selectedLog.details || 'Geen details beschikbaar'}</p></div></div>
                {(selectedLog.oldValue || selectedLog.newValue) && (
                  <div>
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">Wijzigingen</h4>
                    <div className="rounded-xl border overflow-hidden bg-card shadow-sm">
                      <table className="w-full text-left border-collapse">
                        <thead className="bg-muted/30"><tr className="border-b"><th className="py-2 px-4 text-[9px] font-black uppercase tracking-wider text-muted-foreground">Veld</th><th className="py-2 px-4 text-[9px] font-black uppercase tracking-wider text-muted-foreground">Oud</th><th className="py-2 px-4 text-[9px] font-black uppercase tracking-wider text-muted-foreground">Nieuw</th></tr></thead>
                        <tbody className="divide-y">{parseChanges(selectedLog.oldValue, selectedLog.newValue).map((change, i) => (
                          <tr key={i} className="hover:bg-muted/30 transition-colors"><td className="py-3 px-4 font-black text-[10px] text-primary uppercase">{change.field}</td><td className="py-3 px-4 text-xs font-mono opacity-60 line-through">{change.old}</td><td className="py-3 px-4 text-xs font-bold">{change.new}</td></tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div></ScrollArea>
              <DialogFooter className="p-4 border-t bg-muted/20 shrink-0"><Button variant="outline" className="font-bold text-xs uppercase" onClick={() => setSelectedLog(null)}>Sluiten</Button></DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Overzicht;
