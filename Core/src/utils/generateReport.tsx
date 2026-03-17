import { pdf } from '@react-pdf/renderer';
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
import { MaintenanceReportPDF, type MaintenanceTask, type ColumnDef } from '../components/pdf/MaintenanceReportPDF';
import { pb } from '../lib/pocketbase';
import { getStatusInfo } from './StatusUtils';
import { formatDisplayDate, formatDisplayDateTime } from './dateUtils';
import { DrukwerkenPDF, type DrukwerkTask } from '../components/pdf/DrukwerkenPDF';

// ─── Types (re-exported for consumers) ──────────────────────────────────────

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

// ─── Column config (matches Reports.tsx) ────────────────────────────────────

const ALL_COLUMNS: ColumnDef[] = [
  { id: 'taskName', label: 'Taak', field: 'taskName' },
  { id: 'interval', label: 'Interval', field: 'interval' },
  { id: 'completedOn', label: 'Laatste onderhoud', field: 'completedOn' },
  { id: 'executedBy', label: 'Uitvoerder', field: 'executedBy' },
  { id: 'note', label: 'Opmerking', field: 'note' },
  { id: 'daysDiff', label: 'Dagen Over', field: 'daysDiff' },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

function buildPeriodFilter(period: string, status: string): string {
  const fmt = (d: Date) => format(d, 'yyyy-MM-dd HH:mm:ss');
  const todayStart = fmt(startOfDay(new Date()));

  if (status === 'Nu Nodig') {
    if (period === 'Alles overtijd') return `next_date < "${todayStart}"`;
    if (period === '> 6 maanden') return `next_date < "${fmt(subMonths(startOfDay(new Date()), 6))}"`;
    if (period === '> 1 jaar') return `next_date < "${fmt(subYears(startOfDay(new Date()), 1))}"`;
  }
  if (status === 'Binnenkort') {
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
      case 'Vorige Week': { const p = subWeeks(ref, 1); start = startOfWeek(p, { weekStartsOn: 1 }); end = endOfWeek(p, { weekStartsOn: 1 }); break; }
      case 'Deze Maand': start = startOfMonth(ref); end = endOfMonth(ref); break;
      case 'Vorige Maand': { const p = subMonths(ref, 1); start = startOfMonth(p); end = endOfMonth(p); break; }
      case 'Dit Jaar': start = startOfYear(ref); end = endOfYear(ref); break;
      case 'Vorig Jaar': { const p = subYears(ref, 1); start = startOfYear(p); end = endOfYear(p); break; }
      default: return '';
    }
    return `last_date >= "${fmt(start)}" && last_date <= "${fmt(end)}"`;
  }
  return '';
}

function matchesStatus(nextDate: Date | null, status: string): boolean {
  const todayStart = startOfDay(new Date());
  if (status === 'Nu Nodig') return !!nextDate && isBefore(nextDate, todayStart);
  if (status === 'Binnenkort') return !!nextDate && !isBefore(nextDate, todayStart);
  return true;
}

function formatInterval(val: number, unit: string) {
  if (!val) return '-';
  return `${val} ${unit}`;
}


export function detectPeriodType(selectedPeriod: string): 'day' | 'week' | 'month' | 'year' {
  if (['Vandaag', 'Gisteren'].includes(selectedPeriod)) return 'day';
  if (['Deze Week', 'Vorige Week'].includes(selectedPeriod)) return 'week';
  if (['Deze Maand', 'Vorige Maand', '14 Dagen'].includes(selectedPeriod)) return 'month';
  if (['Dit Jaar', 'Vorig Jaar'].includes(selectedPeriod)) return 'year';
  return 'day';
}

function buildReportFilename(
  pressName: string,
  reportType: string,
  periodType: 'day' | 'week' | 'month' | 'year',
  presetName?: string
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

// ─── Main export: generate a PDF for a given preset ─────────────────────────

export async function generatePresetReport(
  preset: ReportPreset,
  trigger: 'manual' | 'auto' = 'manual',
  createdBy: string = 'Systeem'
): Promise<void> {
  const s = preset.settings || {
    selectedPress: 'Alle persen',
    selectedPeriod: 'Alles overtijd',
    selectedStatus: 'Nu Nodig'
  };

  const exportTypes = preset.export_types || ['taken'];
  const reportType = exportTypes.includes('drukwerken') ? 'drukwerken' : 'taken';

  if (reportType === 'taken') {
    // 1. Build filters and fetch data
    const filters: string[] = [];
    if (s.selectedPress && s.selectedPress !== 'Alle persen') {
      filters.push(`pers.naam = "${s.selectedPress}"`);
    }
    const periodClause = buildPeriodFilter(s.selectedPeriod, s.selectedStatus);
    if (periodClause) filters.push(periodClause);

    const records = await pb.collection('onderhoud').getFullList({
      filter: filters.join(' && ') || undefined,
      expand: 'category,pers,assigned_operator,assigned_team'
    });

    // 2. Map to MaintenanceTask[]
    const mapped: MaintenanceTask[] = [];
    for (const r of records as any[]) {
      const nDate = r.next_date ? new Date(r.next_date) : null;
      if (!matchesStatus(nDate, s.selectedStatus)) continue;

      let dDiff = 0;
      if (nDate) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        dDiff = Math.ceil((nDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      }

      const ops = Array.isArray(r.expand?.assigned_operator) ? r.expand.assigned_operator : r.expand?.assigned_operator ? [r.expand.assigned_operator] : [];
      const tms = Array.isArray(r.expand?.assigned_team) ? r.expand.assigned_team : r.expand?.assigned_team ? [r.expand.assigned_team] : [];
      const exBy = [...ops, ...tms].map((o: any) => o.naam || o.name || 'Onbekend').join(', ') || '-';

      mapped.push({
        id: r.id,
        category: r.expand?.category?.naam || 'Overig',
        press: r.expand?.pers?.naam || 'Onbekend',
        parentTask: r.task || '-',
        taskName: r.subtask || r.task || '-',
        interval: formatInterval(r.interval || 0, r.interval_unit || 'Dagen'),
        completedOn: formatDisplayDate(r.last_date),
        executedBy: exBy,
        note: r.opmerkingen || '',
        statusKey: getStatusInfo(nDate).key,
        daysDiff: dDiff
      });
    }

    // 3. Generate PDF
    const periodType = (preset.period as 'day' | 'week' | 'month' | 'year') || detectPeriodType(s.selectedPeriod);
    const filename = buildReportFilename(s.selectedPress || 'AllePersen', 'Taken', periodType, preset.name);
    const selectedColumnIds: string[] = s.selectedColumns || ALL_COLUMNS.map(c => c.id);
    const visibleColumns = ALL_COLUMNS.filter(c => selectedColumnIds.includes(c.id));

    const blob = await pdf(
      <MaintenanceReportPDF
        reportTitle={preset.name}
        tasks={mapped as any}
        selectedPress={s.selectedPress}
        selectedPeriod={s.selectedPeriod}
        selectedStatus={s.selectedStatus}
        generatedAt={formatDisplayDateTime(new Date())}
        columns={visibleColumns}
        fontSize={s.fontSize || 9}
        marginH={s.marginH || 15}
        marginV={s.marginV || 10}
        columnWidths={s.columnWidths || {}}
      />
    ).toBlob();

    // 4. Upload to PocketBase
    const fd = new FormData();
    fd.append('file', blob, filename);
    fd.append('maintenance_report', preset.id);
    fd.append('generated_at', new Date().toISOString());
    fd.append('trigger', trigger);
    fd.append('created_by', createdBy);
    await pb.collection('report_files').create(fd);
  } else if (reportType === 'drukwerken') {
    // 1. Build filters and fetch data
    const filters: string[] = [];
    if (s.selectedPress && s.selectedPress !== 'Alle persen') {
      filters.push(`pers.naam = "${s.selectedPress}"`);
    }
    
    // We need to replicate buildPeriodFilter logic for Drukwerken if needed
    // or use a simplified version because Drukwerken doesn't have next_date/status
    const fmt = (d: Date) => d.toISOString().replace('T', ' ').split('.')[0];
    const ref = new Date();
    let start: Date | null = null;
    let end: Date | null = null;

    switch (s.selectedPeriod) {
      case 'Vandaag': start = startOfDay(ref); end = endOfDay(ref); break;
      case 'Gisteren': start = startOfDay(subDays(ref, 1)); end = endOfDay(subDays(ref, 1)); break;
      case 'Deze Week': start = startOfWeek(ref, { weekStartsOn: 1 }); end = endOfWeek(ref, { weekStartsOn: 1 }); break;
      case 'Vorige Week': { const p = subWeeks(ref, 1); start = startOfWeek(p, { weekStartsOn: 1 }); end = endOfWeek(p, { weekStartsOn: 1 }); break; }
      case 'Deze Maand': start = startOfMonth(ref); end = endOfMonth(ref); break;
      case 'Vorige Maand': { const p = subMonths(ref, 1); start = startOfMonth(p); end = endOfMonth(p); break; }
      case 'Dit Jaar': start = startOfYear(ref); end = endOfYear(ref); break;
      case 'Vorig Jaar': { const p = subYears(ref, 1); start = startOfYear(p); end = endOfYear(p); break; }
    }

    if (start && end) {
      filters.push(`date >= "${fmt(start)}" && date <= "${fmt(end)}"`);
    }

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

    // 2. Generate PDF
    const periodType = detectPeriodType(s.selectedPeriod);
    const filename = buildReportFilename(s.selectedPress || 'AllePersen', 'Drukwerken', periodType, preset.name);
    
    const blob = await pdf(
      <DrukwerkenPDF
        reportTitle={preset.name}
        selectedPeriod={s.selectedPeriod}
        tasks={mapped}
        generatedAt={formatDisplayDateTime(new Date())}
        fontSize={s.fontSize || 8}
        marginH={s.marginH || 15}
        marginV={s.marginV || 10}
      />
    ).toBlob();

    // 3. Upload to PocketBase
    const fd = new FormData();
    fd.append('file', blob, filename);
    fd.append('maintenance_report', preset.id);
    fd.append('generated_at', new Date().toISOString());
    fd.append('trigger', trigger);
    fd.append('created_by', createdBy);
    await pb.collection('report_files').create(fd);
  }
}
