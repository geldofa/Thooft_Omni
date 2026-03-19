import {
  format,
  startOfWeek,
  getISOWeek,
  startOfMonth,
  subDays,
  subWeeks,
  subMonths,
  subYears,
  getDay,
  startOfDay,
  isBefore
} from 'date-fns';

export const NL_MONTH_NAMES = [
  'Januari', 'Februari', 'Maart', 'April', 'Mei', 'Juni',
  'Juli', 'Augustus', 'September', 'Oktober', 'November', 'December'
];

export const NL_DAY_NAMES = [
  'Zondag', 'Maandag', 'Dinsdag', 'Woensdag', 'Donderdag', 'Vrijdag', 'Zaterdag'
];

export function detectPeriodType(selectedPeriod: string): 'day' | 'week' | 'month' | 'year' | null {
  if (['Vandaag', 'Gisteren'].includes(selectedPeriod)) return 'day';
  if (['Deze Week', 'Vorige Week'].includes(selectedPeriod)) return 'week';
  if (['Deze Maand', 'Vorige Maand', '14 Dagen'].includes(selectedPeriod)) return 'month';
  if (['Dit Jaar', 'Vorig Jaar'].includes(selectedPeriod)) return 'year';
  return null;
}

export function formatPeriodLabel(selectedPeriod: string): string {
  const ref = new Date();
  const type = detectPeriodType(selectedPeriod);
  if (!type) return selectedPeriod; // Return "Alles overtijd", "> 6 maanden", etc. as is

  switch (type) {
    case 'day': {
      const d = ['Gisteren'].includes(selectedPeriod) ? subDays(ref, 1) : ref;
      const dayName = NL_DAY_NAMES[getDay(d)];
      return `${dayName} ${format(d, 'dd/MM/yyyy')}`;
    }
    case 'week': {
      const d = ['Vorige Week'].includes(selectedPeriod) ? subWeeks(ref, 1) : ref;
      const weekStart = startOfWeek(d, { weekStartsOn: 1 });
      return `${format(weekStart, 'yyyy')} - W${String(getISOWeek(weekStart)).padStart(2, '0')}`;
    }
    case 'month': {
      const d = ['Vorige Maand'].includes(selectedPeriod) ? subMonths(ref, 1) : ref;
      const monthStart = startOfMonth(d);
      return `${format(monthStart, 'yyyy')} - ${NL_MONTH_NAMES[monthStart.getMonth()]}`;
    }
    case 'year': {
      const d = ['Vorig Jaar'].includes(selectedPeriod) ? subYears(ref, 1) : ref;
      return format(d, 'yyyy');
    }
  }
}

export function resolveTitleVariables(title: string, selectedPeriod: string): string {
  return title.replace(/\{periode\}/gi, formatPeriodLabel(selectedPeriod));
}

export function matchesStatus(nextDate: Date | null, status: string): boolean {
  const todayStart = startOfDay(new Date());
  if (status === 'Nu Nodig') return !!nextDate && isBefore(nextDate, todayStart);
  if (status === 'Binnenkort') return !!nextDate && !isBefore(nextDate, todayStart);
  return true;
}

export function buildReportFilename(
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
