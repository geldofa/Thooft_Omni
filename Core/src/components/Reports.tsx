import { useState, useEffect, useMemo } from 'react';
import { pdf, PDFViewer } from '@react-pdf/renderer';
import {
  format,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  addDays,
  isBefore,
  getISOWeek
} from 'date-fns';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { cn } from './ui/utils';
import {
  Card,
  CardContent,
  CardFooter,
} from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';

import {
  Loader2, FileText, Download, Save, History, ArrowLeft,
  RefreshCw, Edit2, PlayCircle, Trash2, ChevronRight, PlusCircle,
  Check, Eye, Mail, AlertCircle
} from 'lucide-react';
import { Switch } from './ui/switch';
import { MaintenanceReportPDF, type MaintenanceTask } from './pdf/MaintenanceReportPDF';
import { pb, useAuth } from './AuthContext';
import { getStatusInfo } from '../utils/StatusUtils';
import { generatePresetReport, type ReportPreset as SharedReportPreset } from '../utils/generateReport';
import { toast } from 'sonner';

// ─── Column configuration ───────────────────────────────────

export interface ColumnConfig {
  id: string;
  label: string;
  field: keyof MaintenanceTask;
}

const ALL_COLUMNS: ColumnConfig[] = [
  { id: 'taskName', label: 'Taak', field: 'taskName' },
  { id: 'interval', label: 'Interval', field: 'interval' },
  { id: 'completedOn', label: 'Laatste onderhoud', field: 'completedOn' },
  { id: 'executedBy', label: 'Uitvoerder', field: 'executedBy' },
  { id: 'note', label: 'Opmerking', field: 'note' },
  { id: 'daysDiff', label: 'Dagen Over', field: 'daysDiff' },
];


// --- CONFIGURATION CONSTANTS ---
const ARCHIVE_COL_WIDTHS = {
  date: '140px',
  period: '120px',
  title: 'auto',
  type: '100px',
  trigger: '100px',
  actions: '100px'
};

// ─── Types ──────────────────────────────────────────────────

interface ReportsProps {
  tasks?: any[];
  presses?: any[];
}

export interface ReportPreset {
  id: string;
  name: string;
  description: string;
  period: string; // From maintenance_reports
  auto_generate: boolean;
  email_recipients: string;
  settings?: any; // Keep for possible future use, but main fields are now top-level
  last_run?: string;
  created?: string;
  updated?: string;
}

export interface GeneratedReport {
  id: string;
  title?: string; // Derived from maintenance_report expand
  file: string;   // Was 'document'
  generated_at: string; // Was 'created'
  trigger?: string; // 'manual' or 'auto'
  created_by?: string; // User name for manual triggers
  email_status?: 'sent' | 'failed' | 'none' | string;
  email_recipients?: string;
  email_error?: string;
  expand?: {
    maintenance_report?: {
      name: string;
      report_type?: string;
    }
  };
}

// ─── Constants ──────────────────────────────────────────────

const PERIOD_OPTIONS: Record<string, string[]> = {
  'Nu Nodig': ['Alles overtijd', '> 6 maanden', '> 1 jaar'],
  'Binnenkort': ['Deze Week', '14 Dagen', 'Deze Maand'],
  'Voltooid': ['Vandaag', 'Gisteren', 'Deze Week', 'Vorige Week', 'Deze Maand', 'Vorige Maand', 'Dit Jaar', 'Vorig Jaar']
};

// ─── Helpers ────────────────────────────────────────────────

function buildPeriodFilter(period: string, status: string): string {
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd HH:mm:ss');
  const todayStart = fmt(startOfDay(new Date()));

  if (status === 'Nu Nodig') {
    // Overdue = next_date before start of today
    if (period === 'Alles overtijd') return `next_date < "${todayStart}"`;
    if (period === '> 6 maanden') return `next_date < "${fmt(subMonths(startOfDay(new Date()), 6))}"`;
    if (period === '> 1 jaar') return `next_date < "${fmt(subYears(startOfDay(new Date()), 1))}"`;
  }

  if (status === 'Binnenkort') {
    // Upcoming = next_date from start of today onwards (NOT overdue)
    if (period === 'Deze Week') return `next_date >= "${todayStart}" && next_date <= "${fmt(endOfWeek(new Date(), { weekStartsOn: 1 }))}"`;
    if (period === '14 Dagen') return `next_date >= "${todayStart}" && next_date <= "${fmt(endOfDay(addDays(new Date(), 14)))}"`;
    if (period === 'Deze Maand') return `next_date >= "${todayStart}" && next_date <= "${fmt(endOfMonth(new Date()))}"`;
  }

  if (status === 'Voltooid') {
    let start, end;
    const ref = new Date();

    switch (period) {
      case 'Vandaag': start = startOfDay(ref); end = endOfDay(ref); break;
      case 'Gisteren': start = startOfDay(subDays(ref, 1)); end = endOfDay(subDays(ref, 1)); break;
      case 'Deze Week': start = startOfWeek(ref, { weekStartsOn: 1 }); end = endOfWeek(ref, { weekStartsOn: 1 }); break;
      case 'Vorige Week': {
        const prev = subWeeks(ref, 1);
        start = startOfWeek(prev, { weekStartsOn: 1 });
        end = endOfWeek(prev, { weekStartsOn: 1 });
        break;
      }
      case 'Deze Maand': start = startOfMonth(ref); end = endOfMonth(ref); break;
      case 'Vorige Maand': {
        const prev = subMonths(ref, 1);
        start = startOfMonth(prev);
        end = endOfMonth(prev);
        break;
      }
      case 'Dit Jaar': start = startOfYear(ref); end = endOfYear(ref); break;
      case 'Vorig Jaar': {
        const prev = subYears(ref, 1);
        start = startOfYear(prev);
        end = endOfYear(prev);
        break;
      }
      default: return '';
    }
    return `last_date >= "${fmt(start)}" && last_date <= "${fmt(end)}"`;
  }
  return '';
}

function matchesStatus(nextDate: Date | null, status: string): boolean {
  const todayStart = startOfDay(new Date());

  if (status === 'Nu Nodig') {
    // Overdue: next_date is strictly before start of today
    return !!nextDate && isBefore(nextDate, todayStart);
  }
  if (status === 'Binnenkort') {
    // Upcoming: next_date is today or in the future (not overdue)
    if (!nextDate) return false;
    return !isBefore(nextDate, todayStart);
  }
  if (status === 'Voltooid') {
    // Completed: rely on buildPeriodFilter (uses last_date), allow all through here
    return true;
  }
  return true;
}

function formatInterval(val: number, unit: string) {
  if (val === 1) {
    if (unit === 'Dagen') return '1 Dag';
    if (unit === 'Weken') return '1 Week';
    if (unit === 'Maanden') return '1 Maand';
    if (unit === 'Jaren') return '1 Jaar';
  }
  return `${val} ${unit}`;
}

function formatDateNL(dateStr: string | null) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

function parseReportFileInfo(filename: string | undefined) {
  if (!filename) return null;

  // PocketBase appends a random hash, so we optionally match it before .pdf

  // Day: _YYYY_MM_DD
  let match = filename.match(/_(\d{4})_(\d{2})_(\d{2})(?:_[a-zA-Z0-9]+)?\.pdf$/i);
  if (match) return { type: 'day', year: match[1], date: `${match[3]}/${match[2]}/${match[1]}` };

  // Week: _YYYY_Www
  match = filename.match(/_(\d{4})_W(\d{2})(?:_[a-zA-Z0-9]+)?\.pdf$/i);
  if (match) return { type: 'week', year: match[1], week: `W${match[2]}` };

  // Month: _YYYY_MM
  match = filename.match(/_(\d{4})_(\d{2})(?:_[a-zA-Z0-9]+)?\.pdf$/i);
  if (match) return { type: 'month', year: match[1], month: match[2] };

  // Year: _YYYY
  match = filename.match(/_(\d{4})(?:_[a-zA-Z0-9]+)?\.pdf$/i);
  if (match) return { type: 'year', year: match[1] };

  return null;
}

function cleanReportFilename(filename: string | undefined) {
  if (!filename) return '';
  // Remove the .pdf extension and the last _hash added by PocketBase (usually 10 alphanumeric chars)
  return filename.replace(/(_[a-zA-Z0-9]{10})?\.pdf$/i, '');
}

// ─── Naming helper ──────────────────────────────────────────

function getNextRunDate(p: ReportPreset): Date | null {
  if (!p.auto_generate) return null;

  const now = new Date();
  const hour = p.settings?.schedule_hour ?? 0;
  const interval = p.period || 'week'; // Note: 'period' in DB stores 'day', 'week', etc.

  let next = new Date(now);
  next.setHours(hour, 0, 0, 0);

  // If next is in the past today, start from tomorrow
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }

  if (interval === 'day') {
    return next;
  }

  if (interval === 'week') {
    const targetDay = p.settings?.schedule_weekday; // 1 (Ma) to 7 (Zo)
    if (targetDay === undefined) return next;

    // Map UI 1-7 (Ma-Zo) to JS 1-0 (Mon-Sun)
    const jsDayMap: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 0 };
    const targetJsDay = jsDayMap[targetDay];

    while (next.getDay() !== targetJsDay) {
      next.setDate(next.getDate() + 1);
    }
    return next;
  }

  if (interval === 'month') {
    const dayType = p.settings?.schedule_day_type || 'first_day';
    const exactDay = p.settings?.schedule_exact_day || 1;

    const findMonthRun = (date: Date): Date => {
      let d = new Date(date.getFullYear(), date.getMonth(), 1, hour, 0, 0, 0);
      if (dayType === 'first_day') {
        // Already at 1st
      } else if (dayType === 'last_day') {
        d = new Date(date.getFullYear(), date.getMonth() + 1, 0, hour, 0, 0, 0);
      } else if (dayType === 'exact_day') {
        d.setDate(exactDay);
      } else if (dayType === 'first_weekday') {
        // First weekday logic: 
        // If 1st is Mon-Fri, that's it.
        // If 1st is Sat (6), then 3rd is Mon.
        // If 1st is Sun (0), then 2nd is Mon.
        const firstDay = d.getDay();
        if (firstDay === 6) d.setDate(3);
        else if (firstDay === 0) d.setDate(2);
      }
      return d;
    };

    let nextRun = findMonthRun(next);
    if (nextRun <= now) {
      nextRun = findMonthRun(new Date(next.getFullYear(), next.getMonth() + 1, 1));
    }
    return nextRun;
  }

  if (interval === 'year') {
    const month = p.settings?.schedule_month || 1;
    let nextRun = new Date(now.getFullYear(), month - 1, 1, hour, 0, 0, 0);
    if (nextRun <= now) {
      nextRun.setFullYear(now.getFullYear() + 1);
    }
    return nextRun;
  }

  return null;
}

function detectPeriodType(selectedPeriod: string): 'day' | 'week' | 'month' | 'year' {
  if (['Vandaag', 'Gisteren'].includes(selectedPeriod)) return 'day';
  if (['Deze Week', 'Vorige Week'].includes(selectedPeriod)) return 'week';
  if (['Deze Maand', 'Vorige Maand', '14 Dagen'].includes(selectedPeriod)) return 'month';
  if (['Dit Jaar', 'Vorig Jaar'].includes(selectedPeriod)) return 'year';
  return 'day'; // default for Alles overtijd, > 6 maanden, > 1 jaar
}

function buildReportFilename(
  pressName: string,
  reportType: string,
  periodType: 'day' | 'week' | 'month' | 'year',
  presetName?: string // if provided, use preset name instead of Press_Type
): string {
  const now = new Date();
  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
  const prefix = presetName ? sanitize(presetName) : `${sanitize(pressName)}_${sanitize(reportType)}`;
  const yyyy = format(now, 'yyyy');

  switch (periodType) {
    case 'day': return `${prefix}_${yyyy}_${format(now, 'MM')}_${format(now, 'dd')}.pdf`;
    case 'week': return `${prefix}_${yyyy}_W${String(getISOWeek(now)).padStart(2, '0')}.pdf`;
    case 'month': return `${prefix}_${yyyy}_${format(now, 'MM')}.pdf`;
    case 'year': return `${prefix}_${yyyy}.pdf`;
  }
}

// ─── Component ──────────────────────────────────────────────

export function Reports(_props: ReportsProps) {
  const { user } = useAuth();
  const [currentView, setCurrentView] = useState<'dashboard' | 'editor'>('dashboard');
  const [presets, setPresets] = useState<ReportPreset[]>([]);
  const [archive, setArchive] = useState<GeneratedReport[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [activePreset, setActivePreset] = useState<ReportPreset | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);

  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [activeConfig, setActiveConfig] = useState<{
    name: string;
    description: string;
    report_type: string;
    is_automated: boolean;
    email_recipients: string;
    schedule_interval: string;
    schedule_hour: number;
    schedule_weekday: number;
    schedule_day_type: string;
    schedule_exact_day: number;
    schedule_month: number;
    settings: any;
    columnWidths: Record<string, string>;
  }>({
    name: 'Nieuw Sjabloon',
    description: '',
    report_type: 'taken',
    is_automated: false,
    email_recipients: '',
    schedule_interval: 'week',
    schedule_hour: 8,
    schedule_weekday: 1,
    schedule_day_type: 'first_day',
    schedule_exact_day: 1,
    schedule_month: 1,
    settings: {
      selectedPress: 'Alle persen',
      selectedPeriod: 'Alles overtijd',
      selectedStatus: 'Nu Nodig',
    },
    columnWidths: {},
  });

  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pressNames, setPressNames] = useState<string[]>(['Alle persen']);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(ALL_COLUMNS.map(c => c.id));
  const [fontSize, setFontSize] = useState(9);
  const [marginH, setMarginH] = useState(30);
  const [marginV, setMarginV] = useState(10);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const reportTitle = activeConfig.name || "Onderhoudsrapport";
  const selectedPress = activeConfig.settings.selectedPress;
  const selectedPeriod = activeConfig.settings.selectedPeriod;
  const selectedStatus = activeConfig.settings.selectedStatus;

  const statusOptions = ['Nu Nodig', 'Binnenkort', 'Voltooid'];
  const statusColors: Record<string, string> = {
    'Nu Nodig': 'bg-red-500 hover:bg-red-600',
    'Binnenkort': 'bg-orange-500 hover:bg-orange-600',
    'Voltooid': 'bg-emerald-500 hover:bg-emerald-600'
  };

  const fetchData = async () => {
    setIsDataLoading(true);
    try {
      const [pList, aList] = await Promise.all([
        pb.collection('maintenance_reports').getFullList<ReportPreset>({ sort: 'name' }),
        pb.collection('report_files').getFullList<GeneratedReport>({
          sort: '-generated_at',
          expand: 'maintenance_report'
        })
      ]);
      setPresets(pList);
      setArchive(aList);
    } catch (e) {
      console.error('[Reports] Fetch failed:', e);
      toast.error("Fout bij ophalen gegevens (Controleer collecties)");
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => { if (currentView === 'dashboard') fetchData(); }, [currentView]);

  // Auto catch-up is now handled globally by useAutoReports in App.tsx

  useEffect(() => {
    (async () => {
      const records = await pb.collection('persen').getFullList({ sort: 'naam' });
      setPressNames(['Alle persen', ...records.filter((r: any) => r.active !== false && r.archived !== true).map((r: any) => r.naam)]);
    })();
  }, []);

  const openEditor = (preset: ReportPreset | null) => {
    if (preset) {
      setActivePreset(preset);
      const s = preset.settings || {};
      setActiveConfig({
        name: preset.name,
        description: preset.description || '',
        report_type: 'taken',
        is_automated: preset.auto_generate,
        email_recipients: preset.email_recipients || '',
        schedule_interval: preset.period || 'week',
        schedule_hour: s.schedule_hour ?? 8,
        schedule_weekday: s.schedule_weekday ?? 1,
        schedule_day_type: s.schedule_day_type || 'first_day',
        schedule_exact_day: s.schedule_exact_day ?? 1,
        schedule_month: s.schedule_month ?? 1,
        settings: {
          selectedPress: s.selectedPress || 'Alle persen',
          selectedPeriod: s.selectedPeriod || 'Alles overtijd',
          selectedStatus: s.selectedStatus || 'Nu Nodig'
        },
        columnWidths: s.columnWidths || {},
      });
      setSelectedColumns(s.selectedColumns || ALL_COLUMNS.map(c => c.id));
      setFontSize(s.fontSize ?? 9);
      setMarginH(s.marginH ?? 30);
      setMarginV(s.marginV ?? 10);
    } else {
      setActivePreset(null);
      setActiveConfig({
        name: 'Nieuw Sjabloon',
        description: '',
        report_type: 'taken',
        is_automated: false,
        email_recipients: '',
        schedule_interval: 'week',
        schedule_hour: 8,
        schedule_weekday: 1,
        schedule_day_type: 'first_day',
        schedule_exact_day: 1,
        schedule_month: 1,
        settings: { selectedPress: 'Alle persen', selectedPeriod: 'Alles overtijd', selectedStatus: 'Nu Nodig' },
        columnWidths: {},
      });
      setSelectedColumns(ALL_COLUMNS.map(c => c.id));
      setFontSize(9);
      setMarginH(30);
      setMarginV(10);
    }
    setCurrentView('editor');
  };

  const updateSetting = (k: string, v: any) => setActiveConfig(p => ({ ...p, settings: { ...p.settings, [k]: v } }));



  const visibleColumns = useMemo(() => {
    return ALL_COLUMNS
      .filter(c => selectedColumns.includes(c.id))
      .map(c => {
        if (c.id === 'completedOn') {
          return { ...c, label: selectedStatus === 'Voltooid' ? 'Voltooid op' : 'Laatste onderhoud' };
        }
        return c;
      });
  }, [selectedColumns, selectedStatus]);

  useEffect(() => {
    if (currentView !== 'editor' || activeConfig.report_type !== 'taken') return;
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const filters: string[] = [];
        if (selectedPress !== 'Alle persen') filters.push(`pers.naam = "${selectedPress}"`);
        const pClause = buildPeriodFilter(selectedPeriod, selectedStatus);
        if (pClause) filters.push(pClause);

        const records = await pb.collection('onderhoud').getFullList({ filter: filters.join(' && ') || undefined, expand: 'category,pers,assigned_operator,assigned_team' });
        const mapped: MaintenanceTask[] = [];
        for (const r of records as any[]) {
          const nDate = r.next_date ? new Date(r.next_date) : null;
          if (!matchesStatus(nDate, selectedStatus)) continue;
          let dDiff = 0;
          if (nDate) {
            const today = new Date(); today.setHours(0, 0, 0, 0);
            dDiff = Math.ceil((nDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          }
          const ops = Array.isArray(r.expand?.assigned_operator) ? r.expand.assigned_operator : r.expand?.assigned_operator ? [r.expand.assigned_operator] : [];
          const tms = Array.isArray(r.expand?.assigned_team) ? r.expand.assigned_team : r.expand?.assigned_team ? [r.expand.assigned_team] : [];
          const exBy = [...ops, ...tms].map((o: any) => o.naam || o.name || 'Onbekend').join(', ') || '-';
          const pressName = r.expand?.pers?.naam || 'Onbekend';

          mapped.push({
            id: r.id, category: r.expand?.category?.naam || 'Overig', press: pressName, parentTask: r.task || '-', taskName: r.subtask || r.task || '-',
            interval: formatInterval(r.interval || 0, r.interval_unit || 'Dagen'), completedOn: formatDateNL(r.last_date),
            executedBy: exBy, note: r.opmerkingen || '', statusKey: getStatusInfo(nDate).key, daysDiff: dDiff
          });
        }
        if (!cancelled) setTasks(mapped);
      } finally { if (!cancelled) setIsLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [selectedPress, selectedPeriod, selectedStatus, currentView, activeConfig.report_type]);

  const handleGenerateAndSave = async () => {
    if (!activeConfig.name.trim()) return toast.error("Naam verplicht");
    setIsSaving(true);
    try {
      const b = await pdf(<MaintenanceReportPDF tasks={tasks} reportTitle={reportTitle} selectedPress={selectedPress} selectedPeriod={selectedPeriod} selectedStatus={selectedStatus} generatedAt={new Date().toLocaleDateString('nl-NL')} columns={visibleColumns} fontSize={fontSize} marginH={marginH} marginV={marginV} columnWidths={activeConfig.columnWidths} />).toBlob();
      const periodType = detectPeriodType(selectedPeriod);
      const filename = buildReportFilename(selectedPress, activeConfig.report_type, periodType);
      const f = new FormData();
      f.append('file', b, filename);
      if (activePreset) {
        f.append('maintenance_report', activePreset.id);
      }
      f.append('generated_at', new Date().toISOString());
      f.append('trigger', 'manual');
      f.append('created_by', user?.name || user?.username || 'Onbekend');

      await pb.collection('report_files').create(f);
      toast.success("Rapport opgeslagen in archief");
      setCurrentView('dashboard');
    } catch (e) { console.error(e); toast.error("Fout bij genereren"); } finally { setIsSaving(false); }
  };

  const handleSavePreset = async () => {
    if (!activeConfig.name.trim()) return toast.error("Naam verplicht");
    setIsSaving(true);
    try {
      const fullSettings = {
        ...activeConfig.settings,
        schedule_hour: activeConfig.schedule_hour,
        schedule_weekday: activeConfig.schedule_weekday,
        schedule_day_type: activeConfig.schedule_day_type,
        schedule_exact_day: activeConfig.schedule_exact_day,
        schedule_month: activeConfig.schedule_month,
        fontSize,
        marginH,
        marginV,
        selectedColumns,
        columnWidths: activeConfig.columnWidths,
      };
      const p: Record<string, any> = {
        name: activeConfig.name,
        description: activeConfig.description,
        period: activeConfig.schedule_interval || 'week',
        auto_generate: activeConfig.is_automated,
        email_recipients: activeConfig.email_recipients,
        schedule_hour: activeConfig.schedule_hour,
        // Normalize Sunday (7 in UI -> 0 for JS/DB)
        schedule_weekdays: activeConfig.schedule_interval === 'week' ? [(activeConfig.schedule_weekday === 7 ? 0 : activeConfig.schedule_weekday).toString()] : [],
        schedule_day: activeConfig.schedule_exact_day,
        schedule_month_type: activeConfig.schedule_day_type,
        settings: fullSettings
      };
      if (activePreset) await pb.collection('maintenance_reports').update(activePreset.id, p);
      else await pb.collection('maintenance_reports').create(p);
      toast.success("Sjabloon opgeslagen");
      setCurrentView('dashboard');
    } catch (e) { console.error(e); toast.error("Opslaan mislukt"); } finally { setIsSaving(false); }
  };

  const generatePresetNow = async (preset: ReportPreset, trigger: 'manual' | 'auto' = 'manual') => {
    if (trigger === 'manual') toast.info(`Genereren: ${preset.name}...`);
    try {
      await generatePresetReport(preset as SharedReportPreset, trigger, user?.name || user?.username || 'Onbekend');
      if (trigger === 'manual') toast.success(`Rapport "${preset.name}" opgeslagen`);
      fetchData();
    } catch (e) {
      console.error(e);
      if (trigger === 'manual') toast.error("Fout bij direct genereren");
    }
  };

  if (currentView === 'dashboard') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
        <div className="flex items-center justify-between shrink-0">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-6 h-6 text-indigo-600" /> Rapporten & Automatisatie
          </h1>
          <Button onClick={() => openEditor(null)} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
            <PlusCircle className="w-4 h-4" /> Nieuw Sjabloon
          </Button>
        </div>

        {/* Outer grid: 1 col < 640px, 2 col 640-1199px, 2 or 4 col >= 1200px based on preset count */}
        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: `repeat(${windowWidth < 640 ? 1 : windowWidth < 1200 ? 2 : presets.length <= 2 ? 2 : 4}, minmax(0, 1fr))` }}
        >
          {presets.map(p => {
            const nextRun = getNextRunDate(p);
            const settings = p.settings || {};
            // Each card is ~half the viewport at 2-col, ~quarter at 4-col. Stack inner layout below ~560px card width.
            const cardWidth = windowWidth < 640 ? windowWidth : windowWidth < 1200 ? windowWidth / 2 : windowWidth / (presets.length <= 2 ? 2 : 4);
            const innerStacked = cardWidth < 480;
            return (
              <Card key={p.id} className="hover:shadow-lg transition-all hover:-translate-y-1 duration-200 border-indigo-100 flex flex-col h-full bg-white overflow-hidden shadow-sm">
                <div style={{ display: 'grid', gridTemplateColumns: innerStacked ? '1fr' : '3fr 2fr', flex: 1 }}>
                  <div className="p-4 pr-3 flex flex-col justify-start border-r border-slate-50 min-w-0">
                    <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 w-fit mb-3">
                      {p.auto_generate ? <RefreshCw className="w-5 h-5 animate-spin-slow" /> : <FileText className="w-5 h-5" />}
                    </div>
                    <h3 className="text-[14px] font-bold text-slate-800 leading-tight line-clamp-2">{p.name}</h3>
                    <p className="text-[11px] mt-1.5 text-slate-500 font-medium line-clamp-2 leading-relaxed">{p.description || 'Geen beschrijving'}</p>
                  </div>

                  <div className={cn("p-4 pl-3 flex flex-col justify-center bg-slate-50/20 min-w-0", innerStacked && "border-t border-slate-50")}>
                    <div className="space-y-2.5">
                      <div className={cn("flex text-[10px]", innerStacked ? "flex-col gap-0.5" : "justify-between items-center")}>
                        <span className="text-slate-400 font-bold uppercase tracking-wider">Pers</span>
                        <span className="font-semibold text-slate-700 truncate">{settings.selectedPress || 'Alle Persen'}</span>
                      </div>
                      <div className={cn("flex text-[10px]", innerStacked ? "flex-col gap-0.5" : "justify-between items-center")}>
                        <span className="text-slate-400 font-bold uppercase tracking-wider">Status</span>
                        <Badge variant="outline" className={cn("text-[9px] h-4 font-bold border-none px-1.5 w-fit",
                          settings.selectedStatus === 'Nu Nodig' ? "bg-red-50 text-red-600" :
                            settings.selectedStatus === 'Binnenkort' ? "bg-orange-50 text-orange-600" :
                              "bg-green-50 text-green-600"
                        )}>{settings.selectedStatus || 'N.v.t.'}</Badge>
                      </div>
                      <div className={cn("flex text-[10px]", innerStacked ? "flex-col gap-0.5" : "justify-between items-center")}>
                        <span className="text-slate-400 font-bold uppercase tracking-wider">Periode</span>
                        <span className="font-semibold text-slate-600 italic truncate">"{settings.selectedPeriod || 'N.v.t.'}"</span>
                      </div>
                      {p.auto_generate && (
                        <div className="pt-2 border-t border-slate-200/50 mt-1">
                          <div className={cn("flex text-[10px]", innerStacked ? "flex-col gap-0.5" : "justify-between items-center")}>
                            <span className="text-indigo-400 font-bold uppercase tracking-wider flex items-center gap-1">
                              <RefreshCw className="w-2.5 h-2.5" /> Volgende Run
                            </span>
                            <span className="font-black text-indigo-600">{nextRun ? nextRun.toLocaleString('nl-NL', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : 'Onbekend'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <CardFooter className="pt-3 flex gap-2 border-t bg-slate-50/50 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => openEditor(p)} className="flex-1 gap-1 h-9 rounded-lg border-indigo-100 text-indigo-700 hover:bg-indigo-50/50"><Edit2 className="w-3.5 h-3.5" /> Configuratie</Button>
                  <Button size="sm" onClick={() => generatePresetNow(p)} className="flex-1 gap-1 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-100"><PlayCircle className="w-3.5 h-3.5" /> Nu Run</Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><History className="w-5 h-5 text-indigo-600" /> Archief (Historiek)</h2>
            <Button variant="ghost" size="sm" onClick={fetchData} disabled={isDataLoading} className="gap-2">{isDataLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Ververs</Button>
          </div>
          <Card className="overflow-hidden border-indigo-100 shadow-sm">
            <Table>
              <TableHeader className="bg-slate-50/50 text-[10px] uppercase tracking-wider font-black text-slate-500">
                <TableRow>
                  <TableHead style={{ width: ARCHIVE_COL_WIDTHS.date }}>Datum / Tijd</TableHead>
                  <TableHead style={{ width: ARCHIVE_COL_WIDTHS.period }}>Periode</TableHead>
                  <TableHead style={{ width: ARCHIVE_COL_WIDTHS.title }}>Configuratie</TableHead>
                  <TableHead style={{ width: ARCHIVE_COL_WIDTHS.type }} className="text-center">Type</TableHead>
                  <TableHead style={{ width: ARCHIVE_COL_WIDTHS.trigger }} className="text-center">Trigger</TableHead>
                  <TableHead style={{ width: ARCHIVE_COL_WIDTHS.actions }} className="text-center">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archive.length > 0 ? archive.map(r => (
                  <TableRow key={r.id} className="group hover:bg-indigo-50/30 transition-colors">
                    <TableCell style={{ width: ARCHIVE_COL_WIDTHS.date }} className="text-xs font-medium text-slate-500 whitespace-nowrap">{new Date(r.generated_at).toLocaleString('nl-NL')}</TableCell>

                    {/* Dedicated Column for Period Chips */}
                    <TableCell style={{ width: ARCHIVE_COL_WIDTHS.period }} className="py-3">
                      {(() => {
                        const parsed = parseReportFileInfo(r.file);
                        if (!parsed) return <span className="text-slate-300 italic text-[10px]">Geen info</span>;
                        return (
                          <div className="flex flex-row items-center gap-1.5 overflow-hidden">
                            <Badge variant="outline" className="bg-indigo-50/50 text-indigo-700 border-indigo-100 text-[9px] px-1.5 py-0 h-4 font-bold shrink-0">
                              {parsed.year}
                            </Badge>
                            {parsed.type === 'day' && (
                              <Badge variant="outline" className="bg-blue-50/50 text-blue-700 border-blue-100 text-[9px] px-1.5 py-0 h-4 font-bold shrink-0">
                                {parsed.date}
                              </Badge>
                            )}
                            {parsed.type === 'week' && (
                              <Badge variant="outline" className="bg-emerald-50/50 text-emerald-700 border-emerald-100 text-[9px] px-1.5 py-0 h-4 font-bold shrink-0">
                                {parsed.week}
                              </Badge>
                            )}
                            {parsed.type === 'month' && (
                              <Badge variant="outline" className="bg-orange-50/50 text-orange-700 border-orange-100 text-[9px] px-1.5 py-0 h-4 font-bold shrink-0">
                                Maand {parsed.month}
                              </Badge>
                            )}
                          </div>
                        );
                      })()}
                    </TableCell>

                    <TableCell style={{ width: ARCHIVE_COL_WIDTHS.title }} className="py-3">
                      <div className="flex items-center justify-between gap-4 w-full">
                        {/* Left Side: Title + Handmatig Badge if applicable */}
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-700 text-[13px]">
                            {r.expand?.maintenance_report?.name || "Eenmalige Export"}
                          </span>
                          {!r.expand?.maintenance_report && (
                            <Badge variant="outline" className="text-[9px] uppercase tracking-wider h-5 px-1.5 bg-slate-50 text-slate-500 border-slate-200">
                              Handmatig
                            </Badge>
                          )}
                        </div>

                        {/* Right Side: Mailing Info & Raw Filename */}
                        <div className="flex items-center gap-2 shrink-0">
                          {/* Mailing Chips */}
                          {r.email_status === 'sent' && (
                            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-100 text-[10px] px-2 h-5 font-bold flex gap-1.5 items-center max-w-[250px] overflow-hidden">
                              <Mail className="w-3 h-3 shrink-0" />
                              <span className="shrink-0 uppercase tracking-tighter">Mailed to:</span>
                              <span className="font-normal opacity-80 truncate" title={r.email_recipients}>{r.email_recipients}</span>
                            </Badge>
                          )}
                          {r.email_status === 'failed' && (
                            <Badge variant="outline" className="bg-red-50 text-red-700 border-red-100 text-[10px] px-2 h-5 font-bold flex gap-1.5 items-center" title={r.email_error}>
                              <AlertCircle className="w-3 h-3 shrink-0" />
                              <span className="uppercase tracking-tighter">Mail Fout</span>
                            </Badge>
                          )}

                          <div className="flex items-center gap-1.5">
                            <Badge variant="secondary" className="bg-red-50 text-red-600 border-transparent text-[9px] px-1 h-4 rounded font-black tracking-wide">
                              PDF
                            </Badge>
                            <span className="text-[11px] text-slate-400 font-mono" title={r.file}>
                              {cleanReportFilename(r.file)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell style={{ width: ARCHIVE_COL_WIDTHS.type }} className="text-center"><Badge variant="outline" className="capitalize text-[10px] bg-white">{r.expand?.maintenance_report?.report_type || 'taken'}</Badge></TableCell>
                    <TableCell style={{ width: ARCHIVE_COL_WIDTHS.trigger }} className="text-center">
                      {r.trigger === 'auto' ? (
                        <Badge className={cn("text-[10px] px-1.5 h-5", "bg-green-100 text-green-700")}>
                          Auto
                        </Badge>
                      ) : (
                        <div className="flex flex-col items-center gap-0.5">
                          <Badge className={cn("text-[10px] px-1.5 h-5", "bg-blue-100 text-blue-700")}>
                            Manual
                          </Badge>
                          {r.created_by && (
                            <span className="text-[10px] text-slate-400 truncate max-w-[100px]" title={r.created_by}>{r.created_by}</span>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell style={{ width: ARCHIVE_COL_WIDTHS.actions }} className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Bekijk PDF" onClick={() => window.open(pb.files.getURL(r, r.file), '_blank')}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Download PDF" onClick={() => {
                          const url = pb.files.getURL(r, r.file);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = r.file || 'rapport.pdf';
                          document.body.appendChild(a);
                          a.click();
                          document.body.removeChild(a);
                        }}>
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-300 hover:text-red-500" title="Verwijder" onClick={async () => { if (confirm('Rapport verwijderen?')) { await pb.collection('report_files').delete(r.id); fetchData(); } }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )) : (
                  <TableRow><TableCell colSpan={5} className="h-32 text-center text-muted-foreground italic">Nog geen rapporten in het archief.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full mx-auto flex flex-col gap-6 overflow-auto pb-4">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <FileText className="w-6 h-6 text-indigo-600" /> Configuratie
        </h1>
        <Button variant="ghost" onClick={() => setCurrentView('dashboard')} className="text-slate-500 gap-2"><ArrowLeft className="w-4 h-4" /> Terug</Button>
      </div>

      <div className="flex flex-row gap-6 items-start w-full h-[calc(100vh-170px)]">
        <div className="flex-1 min-w-[400px] h-full">
          <Card className="flex flex-col h-full border-indigo-100 shadow-sm overflow-auto">
            <CardContent className="space-y-6 flex-1 pt-6">
              <div className="space-y-4 pt-4 ">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase text-muted-foreground font-bold">Naam</Label>
                  <Input value={activeConfig.name} onChange={e => setActiveConfig(prev => ({ ...prev, name: e.target.value }))} placeholder="Bijv. Wekelijks Onderhoud" />
                </div>
                <div className="space-y-6 pt-4 border-t">
                  <div className="space-y-3">
                    <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Pers Selectie</Label>
                    <div className="flex flex-wrap gap-2">
                      {pressNames.map(p => (
                        <Button
                          key={p}
                          variant={selectedPress === p ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateSetting('selectedPress', p)}
                          className={cn(
                            "rounded-full px-4 h-8 text-xs transition-all",
                            selectedPress === p ? "bg-indigo-600 border-indigo-600 shadow-sm" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          {p}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Status</Label>
                    <div className="flex flex-wrap gap-2">
                      {statusOptions.map(s => (
                        <Button
                          key={s}
                          variant={selectedStatus === s ? "default" : "outline"}
                          size="sm"
                          onClick={() => {
                            const firstPeriod = PERIOD_OPTIONS[s]?.[0] || '';
                            setActiveConfig(prev => ({
                              ...prev,
                              settings: { ...prev.settings, selectedStatus: s, selectedPeriod: firstPeriod }
                            }));
                          }}
                          className={cn(
                            "rounded-full px-4 h-8 text-xs font-bold transition-all",
                            selectedStatus === s ? statusColors[s] : "border-slate-200 text-slate-500 hover:bg-slate-50"
                          )}
                        >
                          {s}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Periode</Label>
                    <div className="flex flex-wrap gap-2">
                      {(PERIOD_OPTIONS[selectedStatus] || []).map(o => (
                        <Button
                          key={o}
                          variant={selectedPeriod === o ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateSetting('selectedPeriod', o)}
                          className={cn(
                            "rounded-full px-4 h-8 text-xs transition-all",
                            selectedPeriod === o ? "bg-slate-800 border-slate-800" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                          )}
                        >
                          {o}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3 pt-4 border-t border-dashed">
                    <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Zichtbare Kolommen</Label>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {ALL_COLUMNS.map(c => {
                        const active = selectedColumns.includes(c.id);
                        return (
                          <div key={c.id} className="flex flex-col gap-1.5 p-2 bg-white rounded-lg border border-slate-100 shadow-sm transition-all hover:border-indigo-100">
                            <Button
                              variant={active ? "default" : "outline"}
                              size="sm"
                              onClick={() => {
                                setSelectedColumns(prev =>
                                  prev.includes(c.id)
                                    ? (prev.length > 1 ? prev.filter(id => id !== c.id) : prev)
                                    : [...prev, c.id]
                                );
                              }}
                              className={cn(
                                "h-8 text-[10px] font-bold uppercase tracking-tight gap-1.5 transition-all w-full",
                                active ? "bg-indigo-600 border-indigo-600 text-white" : "border-slate-200 text-slate-400 opacity-60"
                              )}
                            >
                              {active ? <Check className="w-3 h-3" /> : <PlusCircle className="w-3 h-3" />}
                              {c.id === 'completedOn' ? (selectedStatus === 'Voltooid' ? 'Voltooid op' : 'Laatste onderhoud') : c.label}
                            </Button>
                            {active && (
                              <div className="flex items-center gap-2 px-1 animate-in fade-in slide-in-from-top-1 duration-200">
                                <Label className="text-[9px] uppercase text-slate-400 font-black whitespace-nowrap">Breedte %</Label>
                                <Input
                                  type="number"
                                  min={5}
                                  max={90}
                                  value={activeConfig.columnWidths[c.id] || ''}
                                  onChange={e => {
                                    const val = e.target.value;
                                    setActiveConfig(prev => ({
                                      ...prev,
                                      columnWidths: { ...prev.columnWidths, [c.id]: val }
                                    }));
                                  }}
                                  placeholder="Auto"
                                  className="h-6 text-[10px] px-1 py-0 w-full bg-slate-50 border-slate-200 text-center font-bold"
                                />
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4 pt-4 border-t">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-bold">Automatisatie</Label>
                    <p className="text-[10px] text-muted-foreground italic">Genereer en verstuur automatisch per e-mail.</p>
                  </div>
                  <Switch checked={activeConfig.is_automated} onCheckedChange={v => setActiveConfig(p => ({ ...p, is_automated: v }))} />
                </div>
                {activeConfig.is_automated && (
                  <div className="space-y-4 animate-in slide-in-from-top-2 duration-200">
                    {/* Interval */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Export Interval</Label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { value: 'day', label: 'Dagelijks' },
                          { value: 'week', label: 'Wekelijks' },
                          { value: 'month', label: 'Maandelijks' },
                          { value: 'year', label: 'Jaarlijks' },
                        ].map(opt => (
                          <Button
                            key={opt.value}
                            variant={activeConfig.schedule_interval === opt.value ? "default" : "outline"}
                            size="sm"
                            onClick={() => setActiveConfig(p => ({ ...p, schedule_interval: opt.value }))}
                            className={cn(
                              "rounded-full px-4 h-8 text-xs transition-all",
                              activeConfig.schedule_interval === opt.value ? "bg-indigo-600 border-indigo-600 shadow-sm" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                            )}
                          >
                            {opt.label}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Month (yearly only) */}
                    {activeConfig.schedule_interval === 'year' && (
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Maand</Label>
                        <div className="flex flex-wrap gap-1.5">
                          {['Jan', 'Feb', 'Mrt', 'Apr', 'Mei', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dec'].map((m, i) => (
                            <Button
                              key={i}
                              variant={activeConfig.schedule_month === i + 1 ? "default" : "outline"}
                              size="sm"
                              onClick={() => setActiveConfig(p => ({ ...p, schedule_month: i + 1 }))}
                              className={cn(
                                "rounded-full px-3 h-7 text-[10px] transition-all",
                                activeConfig.schedule_month === i + 1 ? "bg-indigo-600 border-indigo-600 shadow-sm" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                              )}
                            >
                              {m}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Day of week (weekly only) */}
                    {activeConfig.schedule_interval === 'week' && (
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Dag</Label>
                        <div className="flex flex-wrap gap-2">
                          {['Ma', 'Di', 'Wo', 'Do', 'Vr', 'Za', 'Zo'].map((d, i) => (
                            <Button
                              key={i}
                              variant={activeConfig.schedule_weekday === i + 1 ? "default" : "outline"}
                              size="sm"
                              onClick={() => setActiveConfig(p => ({ ...p, schedule_weekday: i + 1 }))}
                              className={cn(
                                "rounded-full px-3 h-8 text-xs transition-all",
                                activeConfig.schedule_weekday === i + 1 ? "bg-indigo-600 border-indigo-600 shadow-sm" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                              )}
                            >
                              {d}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Day type (monthly & yearly) */}
                    {(activeConfig.schedule_interval === 'month' || activeConfig.schedule_interval === 'year') && (
                      <div className="space-y-1.5">
                        <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Dag</Label>
                        <div className="flex flex-wrap gap-2">
                          {[
                            { value: 'first_day', label: 'Eerste dag' },
                            { value: 'first_monday', label: 'Eerste maandag' },
                            { value: 'last_day', label: 'Laatste dag' },
                            { value: 'exact_day', label: 'Vaste dag' },
                          ].map(opt => (
                            <Button
                              key={opt.value}
                              variant={activeConfig.schedule_day_type === opt.value ? "default" : "outline"}
                              size="sm"
                              onClick={() => setActiveConfig(p => ({ ...p, schedule_day_type: opt.value }))}
                              className={cn(
                                "rounded-full px-4 h-8 text-xs transition-all",
                                activeConfig.schedule_day_type === opt.value ? "bg-indigo-600 border-indigo-600 shadow-sm" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                              )}
                            >
                              {opt.label}
                            </Button>
                          ))}
                        </div>
                        {activeConfig.schedule_day_type === 'exact_day' && (
                          <div className="flex items-center gap-2 mt-2">
                            <Label className="text-xs text-muted-foreground whitespace-nowrap">Dag nr.</Label>
                            <Input
                              type="number"
                              min={1}
                              max={31}
                              value={activeConfig.schedule_exact_day}
                              onChange={e => setActiveConfig(p => ({ ...p, schedule_exact_day: Math.min(31, Math.max(1, Number(e.target.value))) }))}
                              className="h-8 w-20 text-xs"
                            />
                          </div>
                        )}
                      </div>
                    )}

                    {/* Hour */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Uur</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {Array.from({ length: 24 }, (_, i) => i).map(h => (
                          <Button
                            key={h}
                            variant={activeConfig.schedule_hour === h ? "default" : "outline"}
                            size="sm"
                            onClick={() => setActiveConfig(p => ({ ...p, schedule_hour: h }))}
                            className={cn(
                              "rounded-full w-7 h-7 text-[10px] p-0 transition-all",
                              activeConfig.schedule_hour === h ? "bg-indigo-600 border-indigo-600 shadow-sm" : "border-slate-200 text-slate-500 hover:bg-slate-50"
                            )}
                          >
                            {String(h).padStart(2, '0')}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Recipients */}
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Ontvangers (comma-separated)</Label>
                      <Input value={activeConfig.email_recipients} onChange={e => setActiveConfig(p => ({ ...p, email_recipients: e.target.value }))} placeholder="admin@thooft.be" className="h-8 text-xs" />
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-2">
                <Button variant="ghost" size="sm" onClick={() => setIsAdvancedOpen(!isAdvancedOpen)} className="w-full justify-between h-8 text-[10px] font-bold uppercase text-slate-400">
                  <span>Extra PDF Opties</span>
                  <ChevronRight className={cn("w-3 h-3 transition-transform", isAdvancedOpen && "rotate-90")} />
                </Button>
                {isAdvancedOpen && (
                  <div className="grid grid-cols-2 gap-2 mt-2 p-2 bg-slate-50 rounded border animate-in fade-in duration-200">
                    <div className="space-y-1"><Label className="text-[9px] uppercase">Font</Label><Input type="number" value={fontSize} onChange={e => setFontSize(Number(e.target.value))} className="h-7 text-[10px]" /></div>
                    <div className="space-y-1"><Label className="text-[9px] uppercase">Marge H</Label><Input type="number" value={marginH} onChange={e => setMarginH(Number(e.target.value))} className="h-7 text-[10px]" /></div>
                    <div className="space-y-1"><Label className="text-[9px] uppercase">Marge V</Label><Input type="number" value={marginV} onChange={e => setMarginV(Number(e.target.value))} className="h-7 text-[10px]" /></div>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2 pt-4 border-t bg-slate-50/50">
              <div className="flex gap-2 w-full">
                <Button variant="outline" onClick={() => setCurrentView('dashboard')} className="flex-1 h-9 text-xs">Annuleren</Button>
                <Button onClick={handleSavePreset} disabled={isSaving} className="flex-1 h-9 text-xs bg-indigo-600 hover:bg-indigo-700 text-white gap-1">{isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Sjabloon Opslaan</Button>
              </div>
              <Button onClick={handleGenerateAndSave} disabled={isSaving || tasks.length === 0} className="w-full h-10 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold gap-2">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />} Genereer & Archiveer Nu
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Right Panel - Live Preview */}
        <div className="h-full shrink-0 flex justify-center bg-transparent">
          <div className="relative h-full bg-slate-100 rounded-xl border border-indigo-100 overflow-hidden shadow-sm flex items-center justify-center" style={{ aspectRatio: '1 / 1.414' }}>
            {isLoading ? (
              <div className="flex flex-col items-center gap-3"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /><span className="text-sm text-slate-400">Preview wordt gegenereerd...</span></div>
            ) : activeConfig.report_type === 'taken' ? (
              <PDFViewer width="100%" height="100%" className="border-none">
                <MaintenanceReportPDF tasks={tasks} reportTitle={reportTitle} selectedPress={selectedPress} selectedPeriod={selectedPeriod} selectedStatus={selectedStatus} generatedAt={new Date().toLocaleDateString('nl-NL')} columns={visibleColumns} fontSize={fontSize} marginH={marginH} marginV={marginV} columnWidths={activeConfig.columnWidths} />
              </PDFViewer>
            ) : (
              <div className="text-center p-8"><FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-sm text-slate-400 font-medium">Layout voor "{activeConfig.report_type}" volgt spoedig.</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}