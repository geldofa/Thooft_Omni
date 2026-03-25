import { format, parse, isValid } from 'date-fns';
import { nl } from 'date-fns/locale';

/**
 * Parses a date string into a Date object.
 * Attempts to parse standard ISO formats, European (DD/MM/YYYY, DD-MM-YYYY),
 * and US (MM/DD/YYYY) formats gracefully.
 */
export function parseEuropeanDate(dateStr: string | null | undefined): Date | null {
    if (!dateStr) return null;
    if (typeof dateStr !== 'string') {
        const d = dateStr as any;
        if (d instanceof Date && !isNaN(d.getTime())) return d;
        return null;
    }

    const trimmed = dateStr.trim();
    if (!trimmed) return null;

    // First try standard JS parsing (handles ISO 8601 nicely like YYYY-MM-DD or YYYY-MM-DDTHH:mm:ssZ)
    let d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;

    // Try parsing DD/MM/YYYY or DD-MM-YYYY
    const euroPatterns = ['dd/MM/yyyy', 'dd-MM-yyyy', 'dd/MM/yy', 'dd-MM-yy'];
    for (const pattern of euroPatterns) {
        d = parse(trimmed, pattern, new Date());
        if (isValid(d)) return d;
    }

    // Fallback: MM/DD/YYYY
    d = parse(trimmed, 'MM/dd/yyyy', new Date());
    if (isValid(d)) return d;

    return null;
}

/**
 * Formats a given Date, ISO string, or European date string to 'dd/MM/yyyy'.
 * Example: '25/12/2026'
 */
export function formatDisplayDate(date: Date | string | null | undefined): string {
    const parsed = typeof date === 'string' ? parseEuropeanDate(date) : date;
    if (!parsed || !(parsed instanceof Date) || isNaN(parsed.getTime())) {
        return '—';
    }
    return format(parsed, 'dd/MM/yyyy');
}

/**
 * Formats a given Date, ISO string, or European date string to 'WII dd/MM/yyyy'.
 * Example: 'W52 25/12/2026'
 */
export function formatDisplayDateWithWeek(date: Date | string | null | undefined): string {
    const parsed = typeof date === 'string' ? parseEuropeanDate(date) : date;
    if (!parsed || !(parsed instanceof Date) || isNaN(parsed.getTime())) {
        return '—';
    }
    return `W${format(parsed, 'II')} ${format(parsed, 'dd/MM/yyyy')}`;
}

/**
 * Formats a given Date, ISO string, or European date string to 'dd/MM/yyyy HH:mm'.
 * Example: '25/12/2026 14:30'
 */
export function formatDisplayDateTime(date: Date | string | null | undefined): string {
    const parsed = typeof date === 'string' ? parseEuropeanDate(date) : date;
    if (!parsed || !(parsed instanceof Date) || isNaN(parsed.getTime())) {
        return '—';
    }
    return format(parsed, 'dd/MM/yyyy HH:mm');
}

/**
 * Formats a given Date, ISO string, or European date string to 'HH:mm:ss'.
 */
export function formatDisplayTime(date: Date | null | undefined): string {
    if (!date || isNaN(date.getTime())) return '—';
    return format(date, 'HH:mm:ss');
}

/**
 * Formats a given Date for report labels (e.g. '25 December 2026')
 */
export function formatDisplayDateLong(date: Date | string | null | undefined): string {
    const parsed = typeof date === 'string' ? parseEuropeanDate(date) : date;
    if (!parsed || !(parsed instanceof Date) || isNaN(parsed.getTime())) {
        return '—';
    }
    return format(parsed, 'dd MMMM yyyy', { locale: nl });
}

/**
 * Formats a filename friendly date string.
 * Default format: 'yyyyMMdd'
 */
export function formatFileDate(date: Date | null | undefined, pattern: string = 'yyyyMMdd'): string {
    if (!date || isNaN(date.getTime())) return '';
    return format(date, pattern);
}
