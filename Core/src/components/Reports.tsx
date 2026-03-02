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
  isBefore
} from 'date-fns';
import { PageHeader } from './PageHeader';
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
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Settings2, Loader2, FileText, Download, Save, History, ArrowLeft, RefreshCw, Edit2, PlayCircle, Trash2, ChevronRight, PlusCircle, Check } from 'lucide-react';
import { Switch } from './ui/switch';
import { MaintenanceReportPDF, type MaintenanceTask } from './pdf/MaintenanceReportPDF';
import { pb } from './AuthContext';
import { getStatusInfo } from '../utils/StatusUtils';
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
  created?: string;
  updated?: string;
}

export interface GeneratedReport {
  id: string;
  title?: string; // Derived from maintenance_report expand
  file: string;   // Was 'document'
  generated_at: string; // Was 'created'
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
  if (!val) return '-';
  return `${val} ${unit}`;
}

function formatDateNL(dateStr: string | null) {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('nl-NL');
}

// ─── Component ──────────────────────────────────────────────

export function Reports(_props: ReportsProps) {
  const [currentView, setCurrentView] = useState<'dashboard' | 'editor'>('dashboard');
  const [presets, setPresets] = useState<ReportPreset[]>([]);
  const [archive, setArchive] = useState<GeneratedReport[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [activePreset, setActivePreset] = useState<ReportPreset | null>(null);
  const [isSaving, setIsSaving] = useState(false);

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
    }
  });

  const [tasks, setTasks] = useState<MaintenanceTask[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [pressNames, setPressNames] = useState<string[]>(['Alle persen']);
  const [selectedColumns, setSelectedColumns] = useState<string[]>(ALL_COLUMNS.map(c => c.id));
  const [fontSize, setFontSize] = useState(9);
  const [marginH, setMarginH] = useState(30);
  const [marginV, setMarginV] = useState(20);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const reportTitle = activeConfig.name;
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
        settings: { selectedPress: s.selectedPress || 'Alle persen', selectedPeriod: s.selectedPeriod || 'Alles overtijd', selectedStatus: s.selectedStatus || 'Nu Nodig' }
      });
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
        settings: { selectedPress: 'Alle persen', selectedPeriod: 'Alles overtijd', selectedStatus: 'Nu Nodig' }
      });
    }
    setCurrentView('editor');
  };

  const updateSetting = (k: string, v: any) => setActiveConfig(p => ({ ...p, settings: { ...p.settings, [k]: v } }));

  const handleTypeChange = (t: string) => {
    let s = t === 'taken' ? { selectedPress: 'Alle persen', selectedPeriod: 'Laatste 7 dagen', selectedStatus: 'Nu Nodig' } : {};
    setActiveConfig(p => ({ ...p, report_type: t, settings: s }));
  };

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
      const b = await pdf(<MaintenanceReportPDF tasks={tasks} reportTitle={reportTitle} selectedPress={selectedPress} selectedPeriod={selectedPeriod} selectedStatus={selectedStatus} generatedAt={new Date().toLocaleDateString('nl-NL')} columns={visibleColumns} fontSize={fontSize} marginH={marginH} marginV={marginV} />).toBlob();
      const f = new FormData();
      f.append('file', b, `${activeConfig.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`);
      // We don't have a direct 'title' field in report_files, it links to a maintenance_report.
      // If we are generating from an activePreset, we link it.
      if (activePreset) {
        f.append('maintenance_report', activePreset.id);
      }
      f.append('generated_at', new Date().toISOString());

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
      };
      const p: Record<string, any> = {
        name: activeConfig.name,
        description: activeConfig.description,
        period: activeConfig.schedule_interval || 'week',
        auto_generate: activeConfig.is_automated,
        email_recipients: activeConfig.email_recipients,
        schedule_hour: activeConfig.schedule_hour,
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

  const generatePresetNow = async (preset: ReportPreset) => {
    toast.info(`Genereren: ${preset.name}...`);
    try {
      const s = preset.settings || { selectedPress: 'Alle persen', selectedPeriod: 'Laatste 7 dagen', selectedStatus: 'Nu Nodig' };
      const f: string[] = [];
      if (s.selectedPress && s.selectedPress !== 'Alle persen') f.push(`pers.naam = "${s.selectedPress}"`);
      const pC = buildPeriodFilter(s.selectedPeriod, s.selectedStatus);
      if (pC) f.push(pC);
      const records = await pb.collection('onderhoud').getFullList({ filter: f.join(' && ') || undefined, expand: 'category,pers' });
      const mapped = records.map((r: any) => ({
        id: r.id, taskName: r.subtask || r.task || '-', completedOn: formatDateNL(r.last_date), interval: formatInterval(r.interval || 0, r.interval_unit || 'Dagen'), note: r.opmerkingen || '', daysDiff: 0, next_date: r.next_date
      })).filter(t => matchesStatus(t.next_date ? new Date(t.next_date) : null, s.selectedStatus));

      const b = await pdf(<MaintenanceReportPDF tasks={mapped as any} reportTitle={preset.name} selectedPress={s.selectedPress} selectedPeriod={s.selectedPeriod} selectedStatus={s.selectedStatus} generatedAt={new Date().toLocaleDateString('nl-NL')} columns={ALL_COLUMNS} />).toBlob();
      const fd = new FormData();
      fd.append('file', b, `${preset.name.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.pdf`);
      fd.append('maintenance_report', preset.id);
      fd.append('generated_at', new Date().toISOString());
      await pb.collection('report_files').create(fd);
      toast.success(`Rapport "${preset.name}" opgeslagen`);
      fetchData();
    } catch (e) { console.error(e); toast.error("Fout bij direct genereren"); }
  };

  if (currentView === 'dashboard') {
    return (
      <div className="w-full h-full mx-auto flex flex-col gap-6 overflow-auto pb-4">
        <div className="flex items-center justify-between shrink-0">
          <PageHeader title="Rapporten & Automatisatie" description="Beheer sjablonen en bekijk het archief." icon={FileText} iconColor="text-indigo-600" iconBgColor="bg-indigo-50" className="mb-0" />
          <Button onClick={() => openEditor(null)} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
            <PlusCircle className="w-4 h-4" /> Nieuw Sjabloon
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {presets.map(p => (
            <Card key={p.id} className="hover:shadow-lg transition-transform hover:-translate-y-1 duration-200 border-indigo-100">
              <CardHeader className="pb-3 text-center">
                <div className="mx-auto p-3 rounded-full bg-indigo-50 text-indigo-600 w-fit mb-2">
                  <History className="w-6 h-6" />
                </div>
                <CardTitle className="text-lg">{p.name}</CardTitle>
                <CardDescription className="line-clamp-2 min-h-[40px]">{p.description || 'Geen beschrijving'}</CardDescription>
              </CardHeader>
              <CardFooter className="pt-3 flex gap-2 border-t bg-slate-50/50">
                <Button variant="outline" size="sm" onClick={() => openEditor(p)} className="flex-1 gap-1"><Edit2 className="w-3.5 h-3.5" /> Bewerk</Button>
                <Button size="sm" onClick={() => generatePresetNow(p)} className="flex-1 gap-1 bg-indigo-600 hover:bg-indigo-700 text-white"><PlayCircle className="w-3.5 h-3.5" /> Genereer</Button>
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2"><History className="w-5 h-5 text-indigo-600" /> Archief (Historiek)</h2>
            <Button variant="ghost" size="sm" onClick={fetchData} disabled={isDataLoading} className="gap-2">{isDataLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Ververs</Button>
          </div>
          <Card className="overflow-hidden border-indigo-100 shadow-sm">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  <TableHead>Datum / Tijd</TableHead>
                  <TableHead>Titel</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Trigger</TableHead>
                  <TableHead className="text-right">Acties</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {archive.length > 0 ? archive.map(r => (
                  <TableRow key={r.id} className="group hover:bg-indigo-50/30 transition-colors">
                    <TableCell className="text-xs font-medium text-slate-500 whitespace-nowrap">{new Date(r.generated_at).toLocaleString('nl-NL')}</TableCell>
                    <TableCell className="font-semibold text-slate-700">{r.expand?.maintenance_report?.name || r.file}</TableCell>
                    <TableCell><Badge variant="outline" className="capitalize text-[10px] bg-white">{r.expand?.maintenance_report?.report_type || 'taken'}</Badge></TableCell>
                    <TableCell className="text-center">
                      <Badge className={cn("text-[10px] px-1.5 h-5", "bg-blue-100 text-blue-700")}>
                        Manual
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="Open PDF" onClick={() => window.open(pb.files.getURL(r, r.file), '_blank')}>
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
        <PageHeader title={activePreset ? "Sjabloon Bewerken" : "Nieuw Sjabloon"} description="Pas filters aan en configureer automatisatie." icon={Settings2} iconColor="text-indigo-600" iconBgColor="bg-indigo-50" className="mb-0" />
        <Button variant="ghost" onClick={() => setCurrentView('dashboard')} className="text-slate-500 gap-2"><ArrowLeft className="w-4 h-4" /> Terug</Button>
      </div>

      <div className="flex flex-row gap-6 items-start w-full h-[calc(100vh-210px)]">
        <div className="flex-1 min-w-[400px] h-full">
          <Card className="flex flex-col h-full border-indigo-100 shadow-sm overflow-auto">
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Configuratie</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6 flex-1">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase text-muted-foreground font-bold">Naam</Label>
                  <Input value={activeConfig.name} onChange={e => setActiveConfig(prev => ({ ...prev, name: e.target.value }))} placeholder="Bijv. Wekelijks Onderhoud" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs uppercase text-muted-foreground font-bold">Type Export</Label>
                  <Select value={activeConfig.report_type} onValueChange={handleTypeChange}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="taken">Onderhoudstaken</SelectItem>
                      <SelectItem value="drukwerken">Drukwerken</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {activeConfig.report_type === 'taken' && (
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
                    <div className="flex flex-wrap gap-2">
                      {ALL_COLUMNS.map(c => {
                        const active = selectedColumns.includes(c.id);
                        return (
                          <Button
                            key={c.id}
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
                              "h-8 text-[10px] font-bold uppercase tracking-tight gap-1.5 transition-all rounded-md",
                              active ? "bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100" : "border-slate-200 text-slate-400 opacity-60"
                            )}
                          >
                            {active ? <Check className="w-3 h-3" /> : <div className="w-3 h-3 border rounded-sm border-slate-300" />}
                            {c.id === 'completedOn' ? (selectedStatus === 'Voltooid' ? 'Voltooid op' : 'Laatste onderhoud') : c.label}
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

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
                  <div className="grid grid-cols-3 gap-2 mt-2 p-2 bg-slate-50 rounded border animate-in fade-in duration-200">
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

        <div className="w-[810px] h-full relative group">
          <div className="absolute inset-0 bg-slate-100 rounded-xl border border-indigo-100 overflow-hidden shadow-inner flex items-center justify-center">
            {isLoading ? (
              <div className="flex flex-col items-center gap-3"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /><span className="text-sm text-slate-400">Preview wordt gegenereerd...</span></div>
            ) : activeConfig.report_type === 'taken' ? (
              <PDFViewer width="100%" height="100%" className="border-none">
                <MaintenanceReportPDF tasks={tasks} reportTitle={reportTitle} selectedPress={selectedPress} selectedPeriod={selectedPeriod} selectedStatus={selectedStatus} generatedAt={new Date().toLocaleDateString('nl-NL')} columns={visibleColumns} fontSize={fontSize} marginH={marginH} marginV={marginV} />
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