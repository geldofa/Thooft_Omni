import { useState, useEffect, useCallback } from 'react';
import { pb } from './AuthContext';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from './ui/dialog';
import {
    Table,
    TableHeader,
    TableBody,
    TableRow,
    TableHead,
} from './ui/table';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { FileText, Clock, Download, Eye, Search, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { DateRange } from 'react-day-picker';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { cn } from './ui/utils';

interface GeneratedReport {
    id: string;
    name: string;
    configName: string;
    createdAt: string;
    file: string;
    created?: string;
    generated_at?: string;
    expand?: {
        maintenance_report?: {
            name: string;
        };
    };
}

interface AllExportsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

function formatDate(iso: string): string {
    if (!iso) return '-';
    const d = new Date(iso);
    const date = d.toLocaleDateString('nl-NL', { day: '2-digit', month: 'short', year: 'numeric' });
    const time = d.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit', hour12: false });
    return `${date} ${time}`;
}

function getBadgeStyle(configName: string): React.CSSProperties {
    if (configName === 'Manueel') {
        return { backgroundColor: '#ede9fe', color: '#6d28d9', borderColor: '#ddd6fe' };
    }
    if (configName.toLowerCase().includes('week')) {
        return { backgroundColor: '#dbeafe', color: '#1d4ed8', borderColor: '#bfdbfe' };
    }
    if (configName.toLowerCase().includes('maand')) {
        return { backgroundColor: '#d1fae5', color: '#047857', borderColor: '#a7f3d0' };
    }
    if (configName.toLowerCase().includes('jaar')) {
        return { backgroundColor: '#fef3c7', color: '#b45309', borderColor: '#fde68a' };
    }
    return { backgroundColor: '#f3f4f6', color: '#374151', borderColor: '#e5e7eb' };
}

export function AllExportsDialog({ open, onOpenChange }: AllExportsDialogProps) {
    const [reports, setReports] = useState<GeneratedReport[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    // Filters
    const [searchQuery, setSearchQuery] = useState('');
    const [typeFilter, setTypeFilter] = useState('all');
    const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

    const fetchReports = useCallback(async () => {
        if (!open) return;

        setIsLoading(true);
        try {
            // Fetch a larger chunk for the full history view
            const result = await pb.collection('report_files').getList<GeneratedReport>(1, 200, {
                sort: '-generated_at',
                expand: 'maintenance_report'
            });

            const mapped = result.items.map(item => ({
                ...item,
                name: item.file,
                configName: item.expand?.maintenance_report?.name || 'Manueel',
                createdAt: item.generated_at || item.created || '',
            }));
            setReports(mapped);
        } catch (error) {
            console.error("Error fetching all reports:", error);
        } finally {
            setIsLoading(false);
        }
    }, [open]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]);

    // Derived unique types for filter dropdown
    const uniqueTypes = Array.from(new Set(reports.map(r => r.configName)));

    // Client-side filtering
    const filteredReports = reports.filter(r => {
        const matchesSearch = r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            r.configName.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesType = typeFilter === 'all' || r.configName === typeFilter;

        // Date filtering
        let matchesDate = true;
        if (dateRange?.from) {
            const reportDate = new Date(r.createdAt);
            reportDate.setHours(0, 0, 0, 0);

            const from = new Date(dateRange.from);
            from.setHours(0, 0, 0, 0);
            if (reportDate < from) matchesDate = false;

            if (dateRange.to) {
                const to = new Date(dateRange.to);
                to.setHours(23, 59, 59, 999);
                if (reportDate > to) matchesDate = false;
            }
        }

        return matchesSearch && matchesType && matchesDate;
    });

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-7xl w-[95vw] h-[95vh] flex flex-col p-0 gap-0 border-0 overflow-hidden bg-gray-50/50">
                <DialogHeader className="p-6 bg-white border-b shrink-0 flex flex-row items-center justify-between">
                    <div className="flex flex-col gap-1.5 pt-4">
                        <DialogTitle className="text-xl font-bold flex items-center gap-2">
                            <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
                                <FileText className="w-5 h-5" />
                            </div>
                            Alle Exports
                        </DialogTitle>
                        <p className="text-sm text-gray-500">
                            Doorzoek en filter in het volledige archief van gegenereerde rapporten.
                        </p>
                    </div>

                    <div className="flex flex-col items-end gap-3 pt-4">
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <Input
                                    placeholder="Zoeken..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="w-64 pl-10 bg-white"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button
                                            id="date"
                                            variant={"outline"}
                                            className={cn(
                                                "w-[260px] justify-start text-left font-normal bg-white h-9",
                                                !dateRange && "text-muted-foreground"
                                            )}
                                        >
                                            <CalendarIcon className="mr-2 h-4 w-4 text-gray-400" />
                                            {dateRange?.from ? (
                                                dateRange.to ? (
                                                    <>
                                                        {format(dateRange.from, "dd MMM yyyy", { locale: nl })} -{" "}
                                                        {format(dateRange.to, "dd MMM yyyy", { locale: nl })}
                                                    </>
                                                ) : (
                                                    format(dateRange.from, "dd MMM yyyy", { locale: nl })
                                                )
                                            ) : (
                                                <span className="text-gray-400">Periode selecteren...</span>
                                            )}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0" align="end">
                                        <Calendar
                                            initialFocus
                                            mode="range"
                                            defaultMonth={dateRange?.from}
                                            selected={dateRange}
                                            onSelect={setDateRange}
                                            numberOfMonths={2}
                                            locale={nl}
                                        />
                                    </PopoverContent>
                                </Popover>

                                {dateRange?.from && (
                                    <Button
                                        variant="ghost"
                                        className="h-9 px-3 text-xs text-gray-500"
                                        onClick={() => setDateRange(undefined)}
                                    >
                                        Wis
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap justify-end">
                            <Badge
                                variant={typeFilter === 'all' ? 'default' : 'outline'}
                                className="cursor-pointer hover:bg-gray-100 px-3 py-1 text-xs"
                                onClick={() => setTypeFilter('all')}
                                style={typeFilter === 'all' ? { backgroundColor: '#3b82f6', color: 'white', borderColor: '#3b82f6' } : { backgroundColor: 'white', color: '#6b7280' }}
                            >
                                Alle Types
                            </Badge>
                            {uniqueTypes.map(type => (
                                <Badge
                                    key={type}
                                    variant={typeFilter === type ? 'default' : 'outline'}
                                    className="cursor-pointer transition-colors px-3 py-1 text-xs"
                                    onClick={() => setTypeFilter(type)}
                                    style={typeFilter === type ? { ...getBadgeStyle(type), opacity: 1 } : { backgroundColor: 'white', color: '#6b7280', borderColor: '#e5e7eb' }}
                                >
                                    {type}
                                </Badge>
                            ))}
                        </div>
                    </div>
                </DialogHeader>

                <div className="flex-1 overflow-auto">
                    <div className="bg-white min-h-full">
                        {isLoading ? (
                            <div className="flex flex-col items-center justify-center p-20 text-gray-400">
                                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent mb-4" />
                                <p className="text-xs uppercase font-bold tracking-widest">Archief laden...</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader className="bg-gray-50/50 sticky top-0 backdrop-blur-sm z-10">
                                    <TableRow>
                                        <TableHead className="w-[200px] text-xs font-bold text-gray-500 uppercase tracking-widest">Bron / Type</TableHead>
                                        <TableHead className="text-xs font-bold text-gray-500 uppercase tracking-widest">Bestandsnaam</TableHead>
                                        <TableHead className="w-[250px] text-xs font-bold text-gray-500 uppercase tracking-widest">Gegenereerd Op</TableHead>
                                        <TableHead className="w-[120px] text-right text-xs font-bold text-gray-500 uppercase tracking-widest">Acties</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredReports.map((report, idx) => (
                                        <TableRow key={report.id} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/30'}>
                                            <td className="p-3">
                                                <Badge
                                                    variant="secondary"
                                                    style={{
                                                        fontSize: '11px',
                                                        fontWeight: 600,
                                                        ...getBadgeStyle(report.configName),
                                                    }}
                                                >
                                                    {report.configName}
                                                </Badge>
                                            </td>
                                            <td className="p-3 font-medium text-gray-900">
                                                <div className="flex items-center gap-2">
                                                    <FileText className="w-4 h-4 text-gray-300 shrink-0" />
                                                    <span className="truncate max-w-[400px]" title={report.name}>{report.name}</span>
                                                </div>
                                            </td>
                                            <td className="p-3 text-sm text-gray-500">
                                                <div className="flex items-center gap-2">
                                                    <Clock className="w-4 h-4 text-gray-300" />
                                                    {formatDate(report.createdAt)}
                                                </div>
                                            </td>
                                            <td className="p-3 text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-gray-400 hover:text-blue-600 hover:bg-blue-50"
                                                        onClick={() => window.open(pb.files.getURL(report, report.file), '_blank')}
                                                        title="Bekijken"
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="h-8 w-8 p-0 text-blue-600 hover:bg-blue-50"
                                                        onClick={() => window.open(pb.files.getURL(report, report.file) + "?download=1", '_blank')}
                                                        title="Downloaden"
                                                    >
                                                        <Download className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </TableRow>
                                    ))}

                                    {filteredReports.length === 0 && (
                                        <TableRow>
                                            <td colSpan={4} className="text-center p-12 text-gray-400">
                                                <FileText className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                                <p className="font-medium text-gray-900 mb-1">Geen resultaten gevonden</p>
                                                <p className="text-sm">Pas uw filters of zoekterm aan.</p>
                                            </td>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
