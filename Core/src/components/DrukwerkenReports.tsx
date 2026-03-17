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
  RefreshCw, Edit2, PlayCircle, Trash2, PlusCircle,
  Eye, Mail, AlertCircle, BookOpen
} from 'lucide-react';
import { Switch } from './ui/switch';
import { DrukwerkenPDF, type DrukwerkTask } from './pdf/DrukwerkenPDF';
import { pb, useAuth, Press } from './AuthContext';
import { generatePresetReport, type ReportPreset as SharedReportPreset } from '../utils/generateReport';
import { toast } from 'sonner';
import { ConfirmationModal } from './ui/ConfirmationModal';
import { formatDisplayDateTime } from '../utils/dateUtils';

// ─── Types ──────────────────────────────────────────────────

interface DrukwerkenReportsProps {
  presses?: Press[];
}

export interface ReportPreset {
  id: string;
  name: string;
  description: string;
  period: string;
  auto_generate: boolean;
  email_recipients: string;
  settings?: any;
  last_run?: string;
  export_types?: string[];
  created?: string;
  updated?: string;
}

export interface GeneratedReport {
  id: string;
  title?: string;
  file: string;
  generated_at: string;
  trigger?: string;
  created_by?: string;
  email_status?: 'sent' | 'failed' | 'none' | string;
  email_recipients?: string;
  email_error?: string;
  expand?: {
    maintenance_report?: {
      name: string;
      export_types?: string[];
    }
  };
}

// ─── Constants ──────────────────────────────────────────────

const PERIOD_OPTIONS = ['Vandaag', 'Gisteren', 'Deze Week', 'Vorige Week', 'Deze Maand', 'Vorige Maand', 'Dit Jaar', 'Vorig Jaar'];

const ARCHIVE_COL_WIDTHS = {
  date: '140px',
  period: '120px',
  title: 'auto',
  trigger: '100px',
  actions: '100px'
};

// ─── Helpers ────────────────────────────────────────────────

function buildDrukwerkenPeriodFilter(period: string): string {
  const fmt = (d: Date) => d.toISOString().replace('T', ' ').split('.')[0];
  const ref = new Date();
  let start: Date, end: Date;

  switch (period) {
    case 'Vandaag': start = startOfDay(ref); end = endOfDay(ref); break;
    case 'Gisteren': start = startOfDay(subDays(ref, 1)); end = endOfDay(subDays(ref, 1)); break;
    case 'Deze Week': start = startOfWeek(ref, { weekStartsOn: 1 }); end = endOfWeek(ref, { weekStartsOn: 1 }); break;
    case 'Vorige Week': { const prev = subWeeks(ref, 1); start = startOfWeek(prev, { weekStartsOn: 1 }); end = endOfWeek(prev, { weekStartsOn: 1 }); break; }
    case 'Deze Maand': start = startOfMonth(ref); end = endOfMonth(ref); break;
    case 'Vorige Maand': { const prev = subMonths(ref, 1); start = startOfMonth(prev); end = endOfMonth(prev); break; }
    case 'Dit Jaar': start = startOfYear(ref); end = endOfYear(ref); break;
    case 'Vorig Jaar': { const prev = subYears(ref, 1); start = startOfYear(prev); end = endOfYear(prev); break; }
    default: return '';
  }
  return `date >= "${fmt(start)}" && date <= "${fmt(end)}"`;
}

function getNextRunDate(p: ReportPreset): Date | null {
  if (!p.auto_generate) return null;
  const now = new Date();
  const s = p.settings || {};
  const hour = s.schedule_hour ?? 0;
  const interval = p.period || 'week';

  let next = new Date(now);
  next.setHours(hour, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);

  if (interval === 'day') return next;
  if (interval === 'week') {
    const targetDay = s.schedule_weekday;
    if (targetDay === undefined) return next;
    const jsDayMap: Record<number, number> = { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 0 };
    const targetJsDay = jsDayMap[targetDay];
    while (next.getDay() !== targetJsDay) next.setDate(next.getDate() + 1);
    return next;
  }
  if (interval === 'month') {
    const dayType = s.schedule_day_type || 'first_day';
    const exactDay = s.schedule_exact_day || 1;
    const findMonthRun = (date: Date): Date => {
      let d = new Date(date.getFullYear(), date.getMonth(), 1, hour, 0, 0, 0);
      if (dayType === 'last_day') d = new Date(date.getFullYear(), date.getMonth() + 1, 0, hour, 0, 0, 0);
      else if (dayType === 'exact_day') d.setDate(exactDay);
      else if (dayType === 'first_weekday') { const fd = d.getDay(); if (fd === 6) d.setDate(3); else if (fd === 0) d.setDate(2); }
      return d;
    };
    let nextRun = findMonthRun(next);
    if (nextRun <= now) nextRun = findMonthRun(new Date(next.getFullYear(), next.getMonth() + 1, 1));
    return nextRun;
  }
  if (interval === 'year') {
    const month = s.schedule_month || 1;
    let nextRun = new Date(now.getFullYear(), month - 1, 1, hour, 0, 0, 0);
    if (nextRun <= now) nextRun.setFullYear(now.getFullYear() + 1);
    return nextRun;
  }
  return null;
}

function detectPeriodType(selectedPeriod: string): 'day' | 'week' | 'month' | 'year' {
  if (['Vandaag', 'Gisteren'].includes(selectedPeriod)) return 'day';
  if (['Deze Week', 'Vorige Week'].includes(selectedPeriod)) return 'week';
  if (['Deze Maand', 'Vorige Maand'].includes(selectedPeriod)) return 'month';
  if (['Dit Jaar', 'Vorig Jaar'].includes(selectedPeriod)) return 'year';
  return 'week';
}

function buildReportFilename(pressName: string, periodType: 'day' | 'week' | 'month' | 'year', presetName?: string): string {
  const now = new Date();
  const sanitize = (s: string) => s.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_');
  const prefix = presetName ? sanitize(presetName) : `${sanitize(pressName)}_Drukwerken`;
  const yyyy = format(now, 'yyyy');
  switch (periodType) {
    case 'day': return `${prefix}_${yyyy}_${format(now, 'MM')}_${format(now, 'dd')}.pdf`;
    case 'week': return `${prefix}_${yyyy}_W${String(getISOWeek(now)).padStart(2, '0')}.pdf`;
    case 'month': return `${prefix}_${yyyy}_${format(now, 'MM')}.pdf`;
    case 'year': return `${prefix}_${yyyy}.pdf`;
  }
}

function parseReportFileInfo(filename: string | undefined) {
  if (!filename) return null;
  let match = filename.match(/_(\\d{4})_(\\d{2})_(\\d{2})(?:_[a-zA-Z0-9]+)?\\.pdf$/i);
  if (match) return { type: 'day', year: match[1], date: `${match[3]}/${match[2]}/${match[1]}` };
  match = filename.match(/_(\\d{4})_W(\\d{2})(?:_[a-zA-Z0-9]+)?\\.pdf$/i);
  if (match) return { type: 'week', year: match[1], week: `W${match[2]}` };
  match = filename.match(/_(\\d{4})_(\\d{2})(?:_[a-zA-Z0-9]+)?\\.pdf$/i);
  if (match) return { type: 'month', year: match[1], month: match[2] };
  match = filename.match(/_(\\d{4})(?:_[a-zA-Z0-9]+)?\\.pdf$/i);
  if (match) return { type: 'year', year: match[1] };
  return null;
}

function cleanReportFilename(filename: string | undefined) {
  if (!filename) return '';
  return filename.replace(/(_[a-zA-Z0-9]{10})?\.pdf$/i, '');
}

// ─── Component ──────────────────────────────────────────────

export function DrukwerkenReports({ presses }: DrukwerkenReportsProps) {
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
    is_automated: boolean;
    email_recipients: string;
    schedule_interval: string;
    schedule_hour: number;
    schedule_weekday: number;
    schedule_day_type: string;
    schedule_exact_day: number;
    schedule_month: number;
    settings: {
      selectedPress: string;
      selectedPeriod: string;
      fontSize: number;
      marginH: number;
      marginV: number;
    };
  }>({
    name: 'Nieuw Sjabloon',
    description: '',
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
      selectedPeriod: 'Deze Week',
      fontSize: 8,
      marginH: 15,
      marginV: 10
    }
  });

  const [tasks, setTasks] = useState<DrukwerkTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [machineList, setMachineList] = useState<Press[]>(presses || []);
  const [pressNames, setPressNames] = useState<string[]>(['Alle persen']);
  const [presetToDelete, setPresetToDelete] = useState<ReportPreset | null>(null);
  const [archiveToDelete, setArchiveToDelete] = useState<GeneratedReport | null>(null);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const selectedPress = activeConfig.settings.selectedPress;
  const selectedPeriod = activeConfig.settings.selectedPeriod;

  const activePresses = useMemo(() =>
    machineList.filter((p: Press) => p.active && !p.archived),
  [machineList]);

  // Fetch press names
  useEffect(() => {
    if (presses) {
      const active = presses.filter(p => p.active && !p.archived);
      setPressNames(['Alle persen', ...active.map(p => p.name)]);
      setMachineList(presses);
    } else {
      (async () => {
        const records = await pb.collection('persen').getFullList({ sort: 'naam' });
        const mapped = records.map((r: any) => ({
          id: r.id, name: r.naam, active: r.active !== false, archived: r.archived === true
        }));
        setMachineList(mapped as Press[]);
        setPressNames(['Alle persen', ...mapped.filter((p: any) => p.active && !p.archived).map((p: any) => p.name)]);
      })();
    }
  }, [presses]);

  // Dashboard data fetch
  const fetchData = async () => {
    setIsDataLoading(true);
    try {
      const [pList, aList] = await Promise.all([
        pb.collection('maintenance_reports').getFullList<ReportPreset>({
          filter: 'export_types ?~ "drukwerken"',
          sort: 'name'
        }),
        pb.collection('report_files').getFullList<GeneratedReport>({
          filter: 'maintenance_report.export_types ?~ "drukwerken"',
          sort: '-generated_at',
          expand: 'maintenance_report'
        })
      ]);
      setPresets(pList);
      setArchive(aList);
    } catch (e) {
      console.error('[DrukwerkenReports] Fetch failed:', e);
      toast.error("Fout bij ophalen gegevens (Controleer collecties)");
    } finally {
      setIsDataLoading(false);
    }
  };

  useEffect(() => { if (currentView === 'dashboard') fetchData(); }, [currentView]);

  // Editor: open preset or create new
  const openEditor = (preset: ReportPreset | null) => {
    if (preset) {
      setActivePreset(preset);
      const s = preset.settings || {};
      setActiveConfig({
        name: preset.name,
        description: preset.description || '',
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
          selectedPeriod: s.selectedPeriod || 'Deze Week',
          fontSize: s.fontSize ?? 8,
          marginH: s.marginH ?? 15,
          marginV: s.marginV ?? 10,
        },
      });
    } else {
      setActivePreset(null);
      setActiveConfig({
        name: 'Nieuw Sjabloon',
        description: '',
        is_automated: false,
        email_recipients: '',
        schedule_interval: 'week',
        schedule_hour: 8,
        schedule_weekday: 1,
        schedule_day_type: 'first_day',
        schedule_exact_day: 1,
        schedule_month: 1,
        settings: { selectedPress: 'Alle persen', selectedPeriod: 'Deze Week', fontSize: 8, marginH: 15, marginV: 10 },
      });
    }
    setCurrentView('editor');
  };

  const updateSetting = (k: string, v: any) => setActiveConfig(p => ({ ...p, settings: { ...p.settings, [k]: v } }));

  // Preview data fetching
  useEffect(() => {
    if (currentView !== 'editor') return;
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      try {
        const filters: string[] = [];
        if (selectedPress !== 'Alle persen') {
          const p = activePresses.find((ap: Press) => ap.name === selectedPress);
          if (p) filters.push(`pers = "${p.id}"`);
        }
        const pFilter = buildDrukwerkenPeriodFilter(selectedPeriod);
        if (pFilter) filters.push(pFilter);

        const records = await pb.collection('drukwerken').getFullList({
          filter: filters.join(' && ') || undefined,
          expand: 'pers',
          sort: 'date',
        });

        const mapped: DrukwerkTask[] = records.map((r: any) => ({
          id: r.id,
          date: r.date.split(' ')[0],
          order_nummer: r.order_nummer,
          klant_order_beschrijving: r.klant_order_beschrijving,
          versie: r.versie,
          blz: r.blz,
          ex_omw: r.ex_omw,
          netto_oplage: r.netto_oplage,
          opstart: r.opstart,
          k_4_4: r.k_4_4,
          k_4_0: r.k_4_0,
          k_1_0: r.k_1_0,
          k_1_1: r.k_1_1,
          k_4_1: r.k_4_1,
          max_bruto: r.max_bruto,
          groen: r.groen,
          rood: r.rood,
          delta: r.delta,
          delta_percent: r.delta_percent,
          pers_name: r.expand?.pers?.naam || 'Onbekend'
        }));
        if (!cancelled) setTasks(mapped);
      } finally { if (!cancelled) setIsLoading(false); }
    })();
    return () => { cancelled = true; };
  }, [selectedPress, selectedPeriod, currentView, activePresses]);

  // Save preset
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
      };
      const p: Record<string, any> = {
        name: activeConfig.name,
        description: activeConfig.description,
        period: activeConfig.schedule_interval || 'week',
        auto_generate: activeConfig.is_automated,
        email_recipients: activeConfig.email_recipients,
        schedule_hour: activeConfig.schedule_hour,
        schedule_weekdays: activeConfig.schedule_interval === 'week'
          ? [(activeConfig.schedule_weekday === 7 ? 0 : activeConfig.schedule_weekday).toString()]
          : [],
        schedule_day: activeConfig.schedule_exact_day,
        schedule_month_type: activeConfig.schedule_day_type,
        export_types: ['drukwerken'],
        settings: fullSettings
      };
      if (activePreset) await pb.collection('maintenance_reports').update(activePreset.id, p);
      else await pb.collection('maintenance_reports').create(p);
      toast.success("Sjabloon opgeslagen");
      setCurrentView('dashboard');
    } catch (e) { console.error(e); toast.error("Opslaan mislukt"); } finally { setIsSaving(false); }
  };

  // Generate & archive
  const handleGenerateAndSave = async () => {
    if (!activeConfig.name.trim()) return toast.error("Naam verplicht");
    setIsSaving(true);
    try {
      const b = await pdf(
        <DrukwerkenPDF
          reportTitle={selectedPress === 'Alle persen' ? activeConfig.name : `${activeConfig.name} - ${selectedPress}`}
          selectedPeriod={selectedPeriod}
          tasks={tasks}
          fontSize={activeConfig.settings.fontSize}
          marginH={activeConfig.settings.marginH}
          marginV={activeConfig.settings.marginV}
          generatedAt={formatDisplayDateTime(new Date())}
        />
      ).toBlob();
      const periodType = detectPeriodType(selectedPeriod);
      const filename = buildReportFilename(selectedPress, periodType, activeConfig.name);
      const f = new FormData();
      f.append('file', b, filename);
      if (activePreset) f.append('maintenance_report', activePreset.id);
      f.append('generated_at', new Date().toISOString());
      f.append('trigger', 'manual');
      f.append('created_by', user?.name || user?.username || 'Onbekend');
      await pb.collection('report_files').create(f);
      toast.success("Rapport opgeslagen in archief");
      setCurrentView('dashboard');
    } catch (e) { console.error(e); toast.error("Fout bij genereren"); } finally { setIsSaving(false); }
  };

  // Generate preset directly from dashboard
  const generatePresetNow = async (preset: ReportPreset) => {
    toast.info(`Genereren: ${preset.name}...`);
    try {
      await generatePresetReport(preset as SharedReportPreset, 'manual', user?.name || user?.username || 'Onbekend');
      toast.success(`Rapport "${preset.name}" opgeslagen`);
      fetchData();
    } catch (e) {
      console.error(e);
      toast.error("Fout bij direct genereren");
    }
  };

  // ─── Dashboard ──────────────────────────────────────────────

  if (currentView === 'dashboard') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto h-[calc(100vh-8rem)] flex flex-col">
        <div className="flex items-center justify-between shrink-0">
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-sky-600" /> Drukwerken
          </h1>
          <Button onClick={() => openEditor(null)} className="bg-sky-600 hover:bg-sky-700 text-white gap-2">
            <PlusCircle className="w-4 h-4" /> Nieuw Sjabloon
          </Button>
        </div>

        {/* Preset Cards Grid */}
        <div
          className="grid gap-6"
          style={{ gridTemplateColumns: `repeat(${windowWidth < 640 ? 1 : windowWidth < 1200 ? 2 : presets.length <= 2 ? 2 : 4}, minmax(0, 1fr))` }}
        >
          {presets.map(p => {
            const nextRun = getNextRunDate(p);
            const settings = p.settings || {};
            return (
              <Card key={p.id} className="hover:shadow-lg transition-all hover:-translate-y-1 duration-200 border-sky-100 flex flex-col h-full bg-white overflow-hidden shadow-sm">
                <div className="flex flex-col flex-1">
                  {/* Top Part: Icon + Title & Description */}
                  <div className="p-3 flex gap-2 items-start border-b border-slate-50">
                    <div className="p-1.5 rounded-lg bg-sky-50 text-sky-600 shrink-0">
                      {p.auto_generate ? <RefreshCw className="w-6 h-6 animate-spin-slow" /> : <BookOpen className="w-6 h-6" />}
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-[14px] font-bold text-slate-800 leading-tight line-clamp-1">{p.name}</h3>
                      <p className="text-[10px] mt-0.5 text-slate-500 font-medium line-clamp-1 leading-relaxed">{p.description || 'Geen beschrijving'}</p>
                    </div>
                  </div>

                  {/* Middle Part: Settings in 2 columns */}
                  <div className="pt-3 px-3 pb-1 bg-slate-50/20">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                      <div className="flex flex-col gap-0.5 text-[10px]">
                        <span className="text-slate-400 font-bold uppercase tracking-wider">Pers</span>
                        <span className="font-semibold text-slate-700 truncate">{settings.selectedPress || 'Alle Persen'}</span>
                      </div>
                      <div className="flex flex-col gap-0.5 text-[10px]">
                        <span className="text-slate-400 font-bold uppercase tracking-wider">Periode</span>
                        <span className="font-semibold text-slate-600 italic truncate">"{settings.selectedPeriod || 'N.v.t.'}"</span>
                      </div>
                      {p.auto_generate && (
                        <div className="flex flex-col gap-0.5 text-[10px] col-span-2">
                          <span className="text-sky-400 font-bold uppercase tracking-wider flex items-center gap-1">
                            <RefreshCw className="w-2.5 h-2.5" /> Volgende Run
                          </span>
                          <span className="font-black text-sky-600">{nextRun ? formatDisplayDateTime(nextRun) : 'Onbekend'}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <CardFooter className="py-2 px-3 flex gap-2 border-t bg-slate-50/50 shrink-0">
                  <Button variant="outline" size="sm" onClick={() => openEditor(p)} className="flex-1 gap-1 h-8 rounded-lg border-sky-100 text-sky-700 hover:bg-sky-50/50 text-[11px]"><Edit2 className="w-3 h-3" /> Config</Button>
                  <Button size="sm" onClick={() => generatePresetNow(p)} className="flex-1 gap-1 h-8 rounded-lg bg-sky-600 hover:bg-sky-700 text-white shadow-md shadow-sky-100 text-[11px]"><PlayCircle className="w-3 h-3" /> Nu Run</Button>
                  <Button variant="ghost" size="sm" onClick={() => setPresetToDelete(p)} className="h-8 w-8 p-0 text-red-300 hover:text-red-600 hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>

        {/* Archive Table */}
        <div className="mt-0 flex-1 flex flex-col min-h-0">
          <div className="flex items-center justify-between mb-2 shrink-0">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2 px-1"><History className="w-5 h-5 text-sky-600" /> Archief (Historiek)</h2>
            <Button variant="ghost" size="sm" onClick={fetchData} disabled={isDataLoading} className="gap-2">{isDataLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Ververs</Button>
          </div>
          <Card className="flex-1 min-h-0 border-sky-100 shadow-sm overflow-hidden flex flex-col">
            <div className="flex-1 overflow-auto bg-white/50 backdrop-blur-sm">
            <Table>
              <TableHeader className="bg-slate-50/50 text-[10px] uppercase tracking-wider font-black text-slate-500">
                <TableRow>
                  <TableHead style={{ width: ARCHIVE_COL_WIDTHS.date }}>Datum / Tijd</TableHead>
                  <TableHead style={{ width: ARCHIVE_COL_WIDTHS.period }}>Periode</TableHead>
                  <TableHead style={{ width: ARCHIVE_COL_WIDTHS.title }}>Configuratie</TableHead>
                  <TableHead style={{ width: ARCHIVE_COL_WIDTHS.trigger }} className="text-center">Trigger</TableHead>
                  <TableHead style={{ width: ARCHIVE_COL_WIDTHS.actions }} className="text-center">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archive.length > 0 ? archive.map(r => (
                  <TableRow key={r.id} className="group hover:bg-sky-50/30 transition-colors">
                    <TableCell style={{ width: ARCHIVE_COL_WIDTHS.date }} className="text-xs font-medium text-slate-500 whitespace-nowrap">{formatDisplayDateTime(new Date(r.generated_at))}</TableCell>

                    <TableCell style={{ width: ARCHIVE_COL_WIDTHS.period }} className="py-3">
                      {(() => {
                        const parsed = parseReportFileInfo(r.file);
                        if (!parsed) return <span className="text-slate-300 italic text-[10px]">Geen info</span>;
                        return (
                          <div className="flex flex-row items-center gap-1.5 overflow-hidden">
                            <Badge variant="outline" className="bg-sky-50/50 text-sky-700 border-sky-100 text-[9px] px-1.5 py-0 h-4 font-bold shrink-0">
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
                        <div className="flex items-center gap-2 shrink-0">
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

                    <TableCell style={{ width: ARCHIVE_COL_WIDTHS.trigger }} className="text-center">
                      {r.trigger === 'auto' ? (
                        <Badge className={cn("text-[10px] px-1.5 h-5", "bg-green-100 text-green-700")}>Auto</Badge>
                      ) : (
                        <div className="flex flex-col items-center gap-0.5">
                          <Badge className={cn("text-[10px] px-1.5 h-5", "bg-blue-100 text-blue-700")}>Manual</Badge>
                          {r.created_by && (
                            <span className="text-[10px] text-slate-400 truncate max-w-[100px]" title={r.created_by}>{r.created_by}</span>
                          )}
                        </div>
                      )}
                    </TableCell>

                    <TableCell style={{ width: ARCHIVE_COL_WIDTHS.actions }} className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <a href={pb.files.getURL(r, r.file)} target="_blank" rel="noopener noreferrer">
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Bekijk PDF">
                            <Eye className="w-4 h-4" />
                          </Button>
                        </a>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Download PDF" onClick={async () => {
                          const url = pb.files.getURL(r, r.file);
                          const res = await fetch(url);
                          const blob = await res.blob();
                          const blobUrl = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = blobUrl;
                          a.download = r.file || 'rapport.pdf';
                          a.click();
                          URL.revokeObjectURL(blobUrl);
                        }}>
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-red-300 hover:text-red-500" title="Verwijder" onClick={() => setArchiveToDelete(r)}>
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
            </div>
          </Card>
        </div>

        <ConfirmationModal
          open={!!presetToDelete}
          onOpenChange={(v) => !v && setPresetToDelete(null)}
          title="Sjabloon verwijderen?"
          description={`Weet je zeker dat je het sjabloon "${presetToDelete?.name}" wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`}
          confirmText="Verwijderen"
          variant="destructive"
          onConfirm={async () => {
            if (presetToDelete) {
              await pb.collection('maintenance_reports').delete(presetToDelete.id);
              fetchData();
              toast.success("Sjabloon verwijderd");
            }
          }}
        />

        <ConfirmationModal
          open={!!archiveToDelete}
          onOpenChange={(v) => !v && setArchiveToDelete(null)}
          title="Rapport verwijderen?"
          description="Weet je zeker dat je dit rapport uit het archief wilt verwijderen?"
          confirmText="Verwijderen"
          variant="destructive"
          onConfirm={async () => {
            if (archiveToDelete) {
              await pb.collection('report_files').delete(archiveToDelete.id);
              fetchData();
              toast.success("Rapport verwijderd");
            }
          }}
        />
      </div>
    );
  }

  // ─── Editor ─────────────────────────────────────────────────

  return (
    <div className="w-full h-full mx-auto flex flex-col gap-6 overflow-auto pb-4">
      <div className="flex items-center justify-between shrink-0">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-sky-600" /> Configuratie
        </h1>
        <Button variant="ghost" onClick={() => setCurrentView('dashboard')} className="text-slate-500 gap-2"><ArrowLeft className="w-4 h-4" /> Terug</Button>
      </div>

      <div className="flex flex-row gap-6 items-start w-full h-[calc(100vh-170px)]">
        <div className="flex-1 min-w-[400px] h-full">
          <Card className="flex flex-col h-full border-sky-100 shadow-sm overflow-auto">
            <CardContent className="space-y-6 flex-1 pt-6">
              <div className="space-y-4 pt-4">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase text-muted-foreground font-bold">Naam</Label>
                  <Input value={activeConfig.name} onChange={e => setActiveConfig(prev => ({ ...prev, name: e.target.value }))} placeholder="Bijv. Wekelijks Drukwerken" />
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
                            selectedPress === p ? "bg-sky-600 border-sky-600 shadow-sm" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                          )}
                        >
                          {p}
                        </Button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Periode</Label>
                    <div className="flex flex-wrap gap-2">
                      {PERIOD_OPTIONS.map(o => (
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
                              activeConfig.schedule_interval === opt.value ? "bg-sky-600 border-sky-600 shadow-sm" : "border-slate-200 text-slate-500 hover:bg-slate-50"
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
                                activeConfig.schedule_month === i + 1 ? "bg-sky-600 border-sky-600 shadow-sm" : "border-slate-200 text-slate-500 hover:bg-slate-50"
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
                                activeConfig.schedule_weekday === i + 1 ? "bg-sky-600 border-sky-600 shadow-sm" : "border-slate-200 text-slate-500 hover:bg-slate-50"
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
                                activeConfig.schedule_day_type === opt.value ? "bg-sky-600 border-sky-600 shadow-sm" : "border-slate-200 text-slate-500 hover:bg-slate-50"
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
                              type="number" min={1} max={31}
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
                              activeConfig.schedule_hour === h ? "bg-sky-600 border-sky-600 shadow-sm" : "border-slate-200 text-slate-500 hover:bg-slate-50"
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
                  <FileText className={cn("w-3 h-3 transition-transform", isAdvancedOpen && "rotate-90")} />
                </Button>
                {isAdvancedOpen && (
                  <div className="grid grid-cols-2 gap-2 mt-2 p-2 bg-slate-50 rounded border animate-in fade-in duration-200">
                    <div className="space-y-1"><Label className="text-[9px] uppercase">Font</Label><Input type="number" value={activeConfig.settings.fontSize} onChange={e => updateSetting('fontSize', Number(e.target.value))} className="h-7 text-[10px]" /></div>
                    <div className="space-y-1"><Label className="text-[9px] uppercase">Marge H</Label><Input type="number" value={activeConfig.settings.marginH} onChange={e => updateSetting('marginH', Number(e.target.value))} className="h-7 text-[10px]" /></div>
                    <div className="space-y-1"><Label className="text-[9px] uppercase">Marge V</Label><Input type="number" value={activeConfig.settings.marginV} onChange={e => updateSetting('marginV', Number(e.target.value))} className="h-7 text-[10px]" /></div>
                  </div>
                )}
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-2 pt-4 border-t bg-slate-50/50">
              <div className="flex gap-2 w-full">
                <Button variant="outline" onClick={() => setCurrentView('dashboard')} className="flex-1 h-9 text-xs">Annuleren</Button>
                <Button onClick={handleSavePreset} disabled={isSaving} className="flex-1 h-9 text-xs bg-sky-600 hover:bg-sky-700 text-white gap-1">{isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />} Sjabloon Opslaan</Button>
              </div>
              <Button onClick={handleGenerateAndSave} disabled={isSaving || tasks.length === 0} className="w-full h-10 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-700 hover:to-blue-700 text-white font-bold gap-2">
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlayCircle className="w-4 h-4" />} Genereer & Archiveer Nu
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Right Panel - Live Preview */}
        <div className="h-full shrink-0 flex justify-center bg-transparent">
          <div className="relative h-full bg-slate-100 rounded-xl border border-sky-100 overflow-hidden shadow-sm flex items-center justify-center" style={{ aspectRatio: '1 / 1.414' }}>
            {isLoading ? (
              <div className="flex flex-col items-center gap-3"><Loader2 className="w-8 h-8 animate-spin text-sky-500" /><span className="text-sm text-slate-400">Preview wordt gegenereerd...</span></div>
            ) : tasks.length > 0 ? (
              <PDFViewer width="100%" height="100%" className="border-none">
                <DrukwerkenPDF
                  reportTitle={selectedPress === 'Alle persen' ? activeConfig.name : `${activeConfig.name} - ${selectedPress}`}
                  selectedPeriod={selectedPeriod}
                  tasks={tasks}
                  fontSize={activeConfig.settings.fontSize}
                  marginH={activeConfig.settings.marginH}
                  marginV={activeConfig.settings.marginV}
                  generatedAt={formatDisplayDateTime(new Date())}
                />
              </PDFViewer>
            ) : (
              <div className="text-center p-8"><BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-sm text-slate-400 font-medium">Geen data voor deze selectie.</p></div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
