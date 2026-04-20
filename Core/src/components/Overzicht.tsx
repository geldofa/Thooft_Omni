import React from 'react';
import {
  Zap,
  AlertCircle,
  CheckCircle2,
  Layers,
  BarChart3,
  Wrench,
  Clock,
} from 'lucide-react';
import { format, startOfWeek, subWeeks, startOfMonth, subMonths, getISOWeek } from 'date-fns';
import { nl } from 'date-fns/locale';
import { pb } from './AuthContext';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { cn } from './ui/utils';

// --- Types ---

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

export const PressBreakdownText = ({
  metrics,
  isLarge = false,
  showPercent = false,
}: {
  metrics: PressMetric[];
  isLarge?: boolean;
  showPercent?: boolean;
}) => {
  if (!metrics || metrics.length === 0) return <div className="h-[14px]" />;
  return (
    <div className="flex items-center gap-x-2 gap-y-1 flex-wrap min-h-[14px]">
      {metrics.map((m, i) => (
        <div key={i} className="flex items-baseline gap-1 leading-none text-muted-foreground">
          <span
            className={cn(
              'font-semibold uppercase tracking-tighter opacity-60',
              isLarge ? 'text-[10px]' : 'text-[9px]',
            )}
          >
            {m.press}:
          </span>
          <span className={cn('font-semibold tracking-tight', isLarge ? 'text-[11px]' : 'text-[10px]')}>
            {showPercent ? `${m.value}%` : m.value.toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
};

export const ProductionCard = ({ data }: { data: any }) => (
  <Card className="p-3 bg-card border shadow-sm flex flex-col gap-2 relative overflow-hidden group hover:border-primary/50 transition-colors">
    <div className="flex items-center gap-3 relative z-10">
      <div
        className={cn(
          'size-10 rounded-xl flex items-center justify-center shrink-0',
          data.status === 'critical' ? 'bg-red-500/10' : 'bg-primary/5',
        )}
      >
        <data.icon
          className={cn('w-5 h-5', data.status === 'critical' ? 'text-red-500' : 'text-primary')}
        />
      </div>
      <div className="min-w-0 flex-1 flex flex-col gap-0.5">
        <div className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider truncate">
          {data.label}
        </div>
        <div className="flex items-baseline gap-2">
          <div className="text-xl font-black leading-none tracking-tight">{data.mainValue}</div>
          {data.sideValue && (
            <div className="text-[10px] font-bold text-muted-foreground opacity-60 leading-none">
              {data.sideValue}
            </div>
          )}
        </div>
        <div className="mt-0.5">
          <PressBreakdownText
            metrics={data.pressBreakdown}
            showPercent={
              data.label === 'Productie' || data.label === 'Verlies' || data.label === 'Delta'
            }
          />
        </div>
      </div>
    </div>
  </Card>
);

export const MaintenanceCard = ({
  title,
  count,
  breakdown,
  colorScheme,
}: {
  title: string;
  count: number;
  breakdown: PressMetric[];
  colorScheme: 'amber' | 'red' | 'green';
}) => {
  const colors = {
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-500', icon: Clock },
    red: { bg: 'bg-red-500/10', text: 'text-red-500', icon: AlertCircle },
    green: { bg: 'bg-green-500/10', text: 'text-green-500', icon: CheckCircle2 },
  };
  const Cfg = colors[colorScheme];
  return (
    <Card className="p-3 bg-card border shadow-sm flex flex-col gap-2 hover:border-primary/50 transition-colors">
      <div className="flex items-center gap-3">
        <div className={cn('size-10 rounded-xl flex items-center justify-center shrink-0', Cfg.bg)}>
          <Cfg.icon className={cn('w-5 h-5', Cfg.text)} />
        </div>
        <div className="min-w-0 flex-1 flex flex-col gap-0.5">
          <div className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider truncate">
            {title}
          </div>
          <div className="text-xl font-black leading-none">{count}</div>
          <div className="mt-0.5">
            <PressBreakdownText metrics={breakdown} />
          </div>
        </div>
      </div>
    </Card>
  );
};

// --- Chip component ---

const Chip = ({
  value,
  colorClass,
}: {
  value: string | number;
  colorClass: string;
}) => (
  <span
    className={cn(
      'inline-flex items-center justify-end px-2 py-0.5 rounded text-[10px] font-black font-mono tracking-tight shrink-0',
      // min-width to comfortably hold 8 digits (e.g. "12.345.678")
      'min-w-[5.5rem] text-right',
      colorClass,
    )}
  >
    {typeof value === 'number' ? value.toLocaleString('nl-BE') : value}
  </span>
);

// --- Day separator ---

const DaySeparator = ({ date, isFirst = false }: { date: Date; isFirst?: boolean }) => (
  <div className={cn('flex items-end gap-1 mb-0.5 opacity-50 select-none', isFirst ? '!mt-2' : 'mt-3')}>
    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest whitespace-nowrap">
      {format(date, 'EEEE d MMM', { locale: nl }).toUpperCase()}
    </span>
    <div className="flex-1 border-b border-muted-foreground/30 h-[1.5px] mb-[1.5px] opacity-20" />
  </div>
);

// --- Main Component ---

export const Overzicht = () => {
  const [rangeJobs, setRangeJobs] = React.useState<any[]>([]);
  const [completedTasks, setCompletedTasks] = React.useState<any[]>([]);
  const [counters, setCounters] = React.useState<any[]>([]);
  const [timeRange, setTimeRange] = React.useState<'week' | 'lastWeek' | 'month' | 'lastMonth'>('week');
  const [yearlyStats, setYearlyStats] = React.useState({
    jobsCount: 0,
    versionsCount: 0,
    totalNetto: 0,
    pressJobs: [] as PressMetric[],
    pressNetto: [] as PressMetric[],
  });
  const [maintenanceStats, setMaintenanceStats] = React.useState({
    overdueInRange: { count: 0, pressBreakdown: [] as PressMetric[] },
    alreadyOverdue: { count: 0, pressBreakdown: [] as PressMetric[] },
    completedInRange: { count: 0, pressBreakdown: [] as PressMetric[] },
  });
  const [isOnline, setIsOnline] = React.useState(navigator.onLine);

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

  // Track actual PocketBase realtime connectivity, not just browser network state.
  // The SSE client emits an 'error' event on disconnect; we mark online again
  // the first time a realtime message arrives after a drop.
  React.useEffect(() => {
    const es: EventSource | undefined = (pb.realtime as any)?._eventSource;
    if (!es) return;

    const handleError = () => setIsOnline(false);
    const handleOpen = () => setIsOnline(true);

    es.addEventListener('error', handleError);
    es.addEventListener('open', handleOpen);
    return () => {
      es.removeEventListener('error', handleError);
      es.removeEventListener('open', handleOpen);
    };
  }, []);

  React.useEffect(() => {
    fetchData();
    fetchMaintenanceData();

    pb.collection('drukwerken').subscribe('*', () => {
      setIsOnline(true);
      fetchData();
    });
    pb.collection('onderhoud').subscribe('*', () => {
      setIsOnline(true);
      fetchMaintenanceData();
    });

    return () => {
      pb.collection('drukwerken').unsubscribe('*').catch(() => { });
      pb.collection('onderhoud').unsubscribe('*').catch(() => { });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeRange]);

  const getRangeBounds = (range: 'week' | 'lastWeek' | 'month' | 'lastMonth') => {
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
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
      start = startOfMonth(subMonths(today, 1));
      end = startOfMonth(today);
    }
    return { start, end };
  };

  const fetchData = async (range: 'week' | 'lastWeek' | 'month' | 'lastMonth' = timeRange) => {
    try {
      const { start, end } = getRangeBounds(range);
      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = end ? format(end, 'yyyy-MM-dd') : null;
      const yearStr = format(new Date(now.getFullYear(), 0, 1), 'yyyy-MM-dd');

      const rangeFilter = endStr
        ? `((voltooid_op >= "${startStr}" && voltooid_op < "${endStr}") || (date >= "${startStr}" && date < "${endStr}"))`
        : `(voltooid_op >= "${startStr}" || date >= "${startStr}")`;

      const yearFilter = `(voltooid_op >= "${yearStr}" || date >= "${yearStr}")`;

      const fetchJobsResilient = async (filter: string) => {
        try {
          return await pb.collection('drukwerken').getFullList({
            filter,
            sort: '-voltooid_op,-created',
            expand: 'pers',
          });
        } catch (err: any) {
          if (err.status === 400 && filter.includes('voltooid_op')) {
            const fallbackFilter = filter.replace(/voltooid_op/g, 'date');
            return await pb.collection('drukwerken').getFullList({
              filter: fallbackFilter,
              sort: '-created',
              expand: 'pers',
            });
          }
          throw err;
        }
      };

      const [rangeJobsRaw, yearJobsRaw] = await Promise.all([
        fetchJobsResilient(rangeFilter),
        fetchJobsResilient(yearFilter),
      ]);

      // Filter: only versions where (groen + rood) > 0
      const rangeJobs = rangeJobsRaw.filter(
        (item) => (item.groen || 0) + (item.rood || 0) > 0,
      );
      const yearJobs = yearJobsRaw.filter(
        (item) => (item.groen || 0) + (item.rood || 0) > 0,
      );

      setRangeJobs(rangeJobs);
      processProduction(rangeJobs);
      processYearlyStats(yearJobs);
    } catch (err) {
      console.error('Overzicht fetch failed:', err);
      setIsOnline(false);
      setRangeJobs([]);
      processProduction([]);
      processYearlyStats([]);
    }
  };

  const fetchMaintenanceData = async (
    range: 'week' | 'lastWeek' | 'month' | 'lastMonth' = timeRange,
  ) => {
    try {
      const tasks = await pb.collection('onderhoud').getFullList({ expand: 'pers,assigned_operator' });
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const { start: rangeStart, end } = getRangeBounds(range);
      const rangeEnd = end
        ? new Date(end.getTime() - 1)
        : new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      const overdueThisRange: any[] = [];
      const alreadyOverdue: any[] = [];
      const completedThisRange: any[] = [];

      tasks.forEach((task) => {
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
        items.forEach((item) => {
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
        return sortPressMetrics(
          Object.entries(pressMap).map(([press, count]) => ({ press, value: count })),
        );
      };

      setCompletedTasks(completedThisRange);
      setMaintenanceStats({
        overdueInRange: {
          count: overdueThisRange.length,
          pressBreakdown: getPressBreakdown(overdueThisRange),
        },
        alreadyOverdue: {
          count: alreadyOverdue.length,
          pressBreakdown: getPressBreakdown(alreadyOverdue),
        },
        completedInRange: {
          count: completedThisRange.length,
          pressBreakdown: getPressBreakdown(completedThisRange),
        },
      });
    } catch (err) {
      console.error('Overzicht Maintenance fetch failed:', err);
      setIsOnline(false);
    }
  };

  /**
   * Productie: sum of netto_oplage for all versions where (groen + rood) > 0, in period.
   * Verlies:   ((groen + rood) - netto_oplage) as % of netto_oplage, absolute value.
   * Delta:     ((groen + rood) - max_bruto) as % of max_bruto, absolute value.
   */
  const processProduction = (items: any[]) => {
    if (!items || items.length === 0) {
      setCounters([
        { label: 'Productie', mainValue: '0', status: 'nominal', icon: AlertCircle, pressBreakdown: [] },
        {
          label: 'Verlies',
          mainValue: '0.0%',
          sideValue: '0',
          status: 'nominal',
          icon: AlertCircle,
          pressBreakdown: [],
        },
        {
          label: 'Delta',
          mainValue: '0.0%',
          sideValue: '0',
          status: 'nominal',
          icon: AlertCircle,
          pressBreakdown: [],
        },
      ]);
      return;
    }

    let totalOplage = 0;
    let totalGroen = 0;
    let totalRood = 0;
    let totalMaxBruto = 0;

    const pressMap: Record<string, { oplage: number; groen: number; rood: number; maxBruto: number }> =
      {};

    items.forEach((item) => {
      const press = item.expand?.pers?.naam || item.pers || 'Onbekend';
      const oplage = item.netto_oplage || 0;
      const groen = item.groen || 0;
      const rood = item.rood || 0;
      const maxBruto = item.max_bruto || 0;

      if (!pressMap[press]) pressMap[press] = { oplage: 0, groen: 0, rood: 0, maxBruto: 0 };
      pressMap[press].oplage += oplage;
      pressMap[press].groen += groen;
      pressMap[press].rood += rood;
      pressMap[press].maxBruto += maxBruto;

      totalOplage += oplage;
      totalGroen += groen;
      totalRood += rood;
      totalMaxBruto += maxBruto;
    });

    const totalBruto = totalGroen + totalRood;

    // Verlies: excess over netto_oplage
    const verliesAbs = totalBruto - totalOplage;
    const verliesPct = totalOplage > 0 ? (verliesAbs / totalOplage) * 100 : 0;

    // Delta: difference from max_bruto
    const deltaAbs = totalBruto - totalMaxBruto;
    const deltaPct = totalMaxBruto > 0 ? (deltaAbs / totalMaxBruto) * 100 : 0;

    const pressVerlies = sortPressMetrics(
      Object.entries(pressMap).map(([press, d]) => ({
        press,
        value: d.oplage > 0 ? Math.round(((d.groen + d.rood - d.oplage) / d.oplage) * 100) : 0,
      })),
    );
    const pressDelta = sortPressMetrics(
      Object.entries(pressMap).map(([press, d]) => ({
        press,
        value:
          d.maxBruto > 0 ? Math.round(((d.groen + d.rood - d.maxBruto) / d.maxBruto) * 100) : 0,
      })),
    );
    const pressOplage = sortPressMetrics(
      Object.entries(pressMap).map(([press, d]) => ({
        press,
        value: totalOplage > 0 ? Math.round((d.oplage / totalOplage) * 100) : 0,
      })),
    );

    const fmtPct = (v: number) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;

    setCounters([
      {
        label: 'Productie',
        mainValue: totalOplage.toLocaleString('nl-BE'),
        status: 'nominal',
        icon: AlertCircle,
        pressBreakdown: pressOplage,
      },
      {
        label: 'Verlies',
        mainValue: `${verliesPct.toFixed(1)}%`,
        sideValue: verliesAbs.toLocaleString('nl-BE'),
        status: verliesPct > 5 ? 'warning' : 'nominal',
        icon: AlertCircle,
        pressBreakdown: pressVerlies,
      },
      {
        label: 'Delta',
        mainValue: fmtPct(deltaPct),
        sideValue: deltaAbs.toLocaleString('nl-BE'),
        status: Math.abs(deltaPct) > 1 ? (deltaAbs > 0 ? 'critical' : 'warning') : 'nominal',
        icon: AlertCircle,
        pressBreakdown: pressDelta,
      },
    ]);
  };

  /**
   * Jobs 2026: unique ordernr count AND version count where (groen + rood) > 0.
   * Netto 2026: sum of netto_oplage where (groen + rood) > 0.
   */
  const processYearlyStats = (items: any[]) => {
    const uniqueOrders = new Set<string>();
    const orderByPress: Record<string, Set<string>> = {};
    const nettoByPress: Record<string, number> = {};
    let totalNetto = 0;

    items.forEach((item) => {
      const press = item.expand?.pers?.naam || item.pers || 'Onbekend';
      const orderId = String(item.order_nummer || item.id);
      const netto = item.netto_oplage || 0;

      uniqueOrders.add(orderId);
      if (!orderByPress[press]) orderByPress[press] = new Set();
      orderByPress[press].add(orderId);
      nettoByPress[press] = (nettoByPress[press] || 0) + netto;
      totalNetto += netto;
    });

    const jobsCount = uniqueOrders.size;
    const versionsCount = items.length;

    setYearlyStats({
      jobsCount,
      versionsCount,
      totalNetto,
      pressJobs: sortPressMetrics(
        Object.entries(orderByPress).map(([press, orders]) => ({
          press,
          value: jobsCount > 0 ? Math.round((orders.size / jobsCount) * 100) : 0,
        })),
      ),
      pressNetto: sortPressMetrics(
        Object.entries(nettoByPress).map(([press, netto]) => ({
          press,
          value: totalNetto > 0 ? Math.round((netto / totalNetto) * 100) : 0,
        })),
      ),
    });
  };

  // --- Press chip color map (matches WeekPlanner PERS_COLORS) ---
  const getPressChipClass = (press: string): string => {
    const p = press.toLowerCase();
    if (p.includes('lithoman')) return 'bg-blue-500 text-white';
    if (p.includes('c818')) return 'bg-emerald-500 text-white';
    if (p.includes('c80')) return 'bg-purple-500 text-white';
    return 'bg-muted/60 border border-muted/30 text-muted-foreground';
  };

  // --- Render Orders: group by day, chips for oplage/groen/rood ---

  const renderOrders = () => {
    if (rangeJobs.length === 0) {
      return (
        <div className="text-[11px] text-muted-foreground/50 text-center py-8 select-none">
          Geen orders gevonden voor deze periode
        </div>
      );
    }

    // Group by day (voltooid_op date)
    const groups = new Map<string, any[]>();
    rangeJobs.forEach((item) => {
      const raw = item.voltooid_op || item.date || '';
      const dayStr = raw.split('T')[0].replace(' ', '-').substring(0, 10);
      if (!dayStr) return;
      if (!groups.has(dayStr)) groups.set(dayStr, []);
      groups.get(dayStr)!.push(item);
    });

    // Sort days descending
    const sortedDays = Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));

    const nodes: React.ReactNode[] = [];

    sortedDays.forEach(([dayStr, items], dayIdx) => {
      const dayDate = new Date(dayStr + 'T12:00:00');
      nodes.push(<DaySeparator key={`d-${dayStr}`} date={dayDate} isFirst={dayIdx === 0} />);

      // Sort items within day by voltooid_op desc
      const sorted = [...items].sort((a, b) => {
        const aTs = a.voltooid_op || a.date || '';
        const bTs = b.voltooid_op || b.date || '';
        return bTs.localeCompare(aTs);
      });

      sorted.forEach((item) => {
        const oplage = item.netto_oplage || 0;
        const groen = item.groen || 0;
        const rood = item.rood || 0;
        const press = item.expand?.pers?.naam || item.pers || '';
        const versie = item.versie || item.version || '';
        const orderNr = item.order_nummer ? `DT${item.order_nummer}` : '';
        const klant = item.klant_order_beschrijving || item.klant || '';
        const rawTs = item.voltooid_op || item.date || '';
        const timeLabel = rawTs ? format(new Date(rawTs), 'HH:mm') : '';

        // Build description label (without the order number or versie — shown separately)
        let label = klant || '';
        // Strip press prefix from label if present
        if (press) {
          const prefixVariants = [
            'MAN LITHOMAN - ',
            'LITHOMAN - ',
            'KBA C818 - ',
            'C818 - ',
            'C80 - ',
          ];
          for (const pfx of prefixVariants) {
            if (label.toUpperCase().startsWith(pfx.toUpperCase())) {
              label = label.slice(pfx.length);
              break;
            }
          }
        }

        nodes.push(
          <div
            key={item.id}
            className="flex items-center gap-2 py-1 border-l-2 border-muted pl-2.5 hover:bg-muted/40 transition-colors rounded-r"
          >
            {/* Completion time — fixed width, far left */}
            <span className="text-[10px] font-mono text-muted-foreground/50 shrink-0 w-[2rem] text-right">
              {timeLabel}
            </span>

            {/* Press badge — fixed-width container so order nr always aligns */}
            <div className="w-[2.5rem] shrink-0 flex items-center">
              {press && (
                <span
                  className={cn(
                    'text-[9px] font-black uppercase tracking-tight px-1.5 py-0.5 rounded whitespace-nowrap',
                    getPressChipClass(press),
                  )}
                >
                  {press}
                </span>
              )}
            </div>

            {/* Order number — fixed width, right-aligned, monospace */}
            <span className="text-[10px] font-black font-mono text-muted-foreground shrink-0 w-[4.5rem] text-right">
              {orderNr}
            </span>

            {/* Description + version chip — flex-1 group so label truncates before chips */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-[11px] font-semibold truncate min-w-0">{label}</span>
              {versie && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-normal font-mono tracking-tight shrink-0 bg-muted/60 border border-muted/30 text-muted-foreground whitespace-nowrap">
                  {versie}
                </span>
              )}
            </div>

            {/* Right-aligned chips */}
            <div className="flex items-center gap-1.5 shrink-0 ml-auto">
              <Chip
                value={oplage}
                colorClass="bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 dark:text-yellow-400"
              />
              <Chip
                value={groen}
                colorClass="bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400"
              />
              <Chip
                value={rood}
                colorClass={
                  rood > 0
                    ? 'bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400'
                    : 'bg-muted/40 border border-muted/20 text-muted-foreground/40'
                }
              />
            </div>
          </div>,
        );
      });
    });

    return nodes;
  };

  // --- Render Onderhoud: group by day, 1 row per completed task, press name chip ---

  const renderOnderhoud = () => {
    if (completedTasks.length === 0) {
      return (
        <div className="text-[11px] text-muted-foreground/50 text-center py-8 select-none">
          Geen onderhoud afgerond in deze periode
        </div>
      );
    }

    // Group by last_date day
    const groups = new Map<string, any[]>();
    completedTasks.forEach((task) => {
      const raw = task.last_date || '';
      const dayStr = raw.split('T')[0].replace(' ', '-').substring(0, 10);
      if (!dayStr) return;
      if (!groups.has(dayStr)) groups.set(dayStr, []);
      groups.get(dayStr)!.push(task);
    });

    const sortedDays = Array.from(groups.entries()).sort((a, b) => b[0].localeCompare(a[0]));

    const nodes: React.ReactNode[] = [];

    sortedDays.forEach(([dayStr, tasks], dayIdx) => {
      const dayDate = new Date(dayStr + 'T12:00:00');
      nodes.push(<DaySeparator key={`d-${dayStr}`} date={dayDate} isFirst={dayIdx === 0} />);

      // Sort by last_date desc within day
      const sorted = [...tasks].sort((a, b) =>
        (b.last_date || '').localeCompare(a.last_date || ''),
      );

      sorted.forEach((task) => {
        const parentTask = task.task || 'Onbekend';
        const subTask = task.subtask && task.subtask !== task.task ? task.subtask : null;
        const pressName =
          task.expand?.pers?.naam || task.expand?.pers?.name || task.pers || null;
        const rawTs = task.last_date || '';
        const timeLabel = rawTs ? format(new Date(rawTs), 'HH:mm') : '';

        // Collect operator names — 1 chip per operator
        const expandedOps = task.expand?.assigned_operator;
        const operatorNames: string[] = expandedOps
          ? (Array.isArray(expandedOps) ? expandedOps : [expandedOps]).map(
            (o: any) => o.naam || o.name || 'Onbekend',
          )
          : [];

        nodes.push(
          <div
            key={task.id}
            className="flex items-center gap-2 py-1 border-l-2 border-muted pl-2.5 hover:bg-muted/40 transition-colors rounded-r"
          >
            {/* Completion time */}
            <span className="text-[10px] font-mono text-muted-foreground/50 shrink-0 w-[2rem] text-right">
              {timeLabel}
            </span>

            {/* Press chip — fixed-width container, press color */}
            <div className="w-[5.5rem] shrink-0 flex items-center">
              {pressName && (
                <span
                  className={cn(
                    'text-[9px] font-black uppercase tracking-tight px-1.5 py-0.5 rounded whitespace-nowrap',
                    getPressChipClass(pressName),
                  )}
                >
                  {pressName}
                </span>
              )}
            </div>

            {/* Parent task + optional subtask chip */}
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-[11px] font-semibold truncate min-w-0">{parentTask}</span>
              {subTask && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-normal font-mono tracking-tight shrink-0 bg-muted/60 border border-muted/30 text-muted-foreground whitespace-nowrap">
                  {subTask}
                </span>
              )}
            </div>

            {/* Operator chips — 1 per person */}
            {operatorNames.length > 0 && (
              <div className="flex items-center gap-1 shrink-0">
                {operatorNames.map((name, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-black tracking-tight bg-muted/60 border border-muted/30 text-muted-foreground whitespace-nowrap"
                  >
                    {name}
                  </span>
                ))}
              </div>
            )}
          </div>,
        );
      });
    });

    return nodes;
  };

  // --- Column header chips for Orders ---
  const ChipHeader = ({ label, colorClass }: { label: string; colorClass: string }) => (
    <span
      className={cn(
        'inline-flex items-center justify-center min-w-[5.5rem] px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest shrink-0',
        colorClass,
      )}
    >
      {label}
    </span>
  );

  return (
    <div className="px-6 pt-4 pb-4 flex flex-col gap-4 h-[calc(100vh-80px)] overflow-hidden bg-background/50 font-sans">
      <div className="flex flex-col gap-0 shrink-0">
        {/* HEADER: KPI Strip */}
        <div className="flex items-stretch gap-6 shrink-0">
          <div className="flex-1 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-1">
              <div className="p-2 bg-primary/10 rounded-xl">
                <BarChart3 className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tight leading-none uppercase">
                  Overzicht
                </h1>
                <div className="flex items-center gap-2 mt-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  {isOnline ? (
                    <span className="text-green-600 flex items-center gap-1">
                      <div className="size-1.5 rounded-full bg-green-500 animate-pulse" />
                      LIVE
                    </span>
                  ) : (
                    <span className="text-red-500 flex items-center gap-1">
                      <div className="size-1.5 rounded-full bg-red-500" />
                      OFFLINE
                    </span>
                  )}
                </div>
              </div>
              {/* Period selector */}
              <Card className="ml-29 flex-shrink-0 bg-card border shadow-sm overflow-hidden self-center p-0 h-full">
                <div className="grid grid-cols-2 h-full min-w-[220px]">
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

          {/* Jobs & Netto yearly KPI cards */}
          <div className="grid grid-cols-3 gap-4 w-[calc(50%-12px)]">
            <Card className="p-3 bg-card border shadow-sm h-full flex flex-col justify-center col-start-2">
              <div className="flex items-center gap-3">
                <div className="size-10 bg-primary/5 rounded flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider truncate">
                    Jobs {now.getFullYear()}
                  </div>
                  <div className="flex items-baseline gap-2">
                    <div className="text-lg font-black leading-tight">
                      {yearlyStats.jobsCount.toLocaleString('nl-BE')}
                    </div>
                    <div className="text-[10px] font-bold text-muted-foreground uppercase">
                      {yearlyStats.versionsCount} versies
                    </div>
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
                  <div className="text-[11px] text-muted-foreground font-bold uppercase tracking-wider truncate">
                    Netto {now.getFullYear()}
                  </div>
                  <div className="text-lg font-black leading-tight">
                    {yearlyStats.totalNetto.toLocaleString('nl-BE')}
                  </div>
                  <PressBreakdownText metrics={yearlyStats.pressNetto} isLarge showPercent />
                </div>
              </div>
            </Card>
          </div>
        </div>

        {/* MIDDLE: Productie & Onderhoud cards */}
        <div className="flex gap-6 shrink-0 mt-[-14px]">
          <div className="flex-1 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest text-muted-foreground">
              <Zap className="w-3.5 h-3.5" /> Productie ({getActiveRangeLabel()})
            </div>
            <div className="grid grid-cols-3 gap-4">
              {counters.map((c, i) => (
                <ProductionCard key={i} data={c} />
              ))}
            </div>
          </div>
          <div className="flex-1 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-widest text-muted-foreground">
              <Wrench className="w-3.5 h-3.5" /> Onderhoud ({getActiveRangeLabel()})
            </div>
            <div className="grid grid-cols-3 gap-4">
              <MaintenanceCard
                title={
                  timeRange === 'week'
                    ? 'Vervalt deze week'
                    : timeRange === 'lastWeek'
                      ? 'Verviel vorige week'
                      : timeRange === 'month'
                        ? 'Vervalt deze maand'
                        : 'Verviel vorige maand'
                }
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
                title={
                  timeRange === 'week'
                    ? 'Afgerond deze week'
                    : timeRange === 'lastWeek'
                      ? 'Afgerond vorige week'
                      : timeRange === 'month'
                        ? 'Afgerond deze maand'
                        : 'Afgerond vorige maand'
                }
                count={maintenanceStats.completedInRange.count}
                breakdown={maintenanceStats.completedInRange.pressBreakdown}
                colorScheme="green"
              />
            </div>
          </div>
        </div>
      </div>

      {/* BOTTOM: Orders & Onderhoud streams */}
      <div className="flex-1 flex gap-6 overflow-hidden min-h-0">
        {/* Orders */}
        <Card className="flex-1 flex flex-col overflow-hidden bg-card border shadow-sm min-h-0 gap-0">
          <div className="py-2 px-4 border-b flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Orders
              </span>
            </div>
            {/* Column headers for chips */}
            <div className="flex items-center gap-1.5">
              <ChipHeader
                label="Oplage"
                colorClass="bg-yellow-500/10 border border-yellow-500/20 text-yellow-700 dark:text-yellow-400"
              />
              <ChipHeader
                label="Groen"
                colorClass="bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400"
              />
              <ChipHeader
                label="Rood"
                colorClass="bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400"
              />
            </div>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
            <div className="flex flex-col">{renderOrders()}</div>
          </div>
        </Card>

        {/* Onderhoud */}
        <Card className="flex-1 flex flex-col overflow-hidden bg-card border shadow-sm min-h-0 gap-0">
          <div className="py-2 px-4 border-b flex items-center shrink-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Onderhoud
            </span>
          </div>
          <div className="flex-1 min-h-0 overflow-y-auto px-4 pb-4">
            <div className="flex flex-col">{renderOnderhoud()}</div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Overzicht;
