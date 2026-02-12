import { useState, useRef, useEffect, useCallback } from 'react';
import { MaintenanceTask, pb, Press } from './AuthContext';
import { useAuth, PressType } from './AuthContext';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { formatNumber } from '../utils/formatNumber';
import { Printer, FileText, Settings } from 'lucide-react';
import { PageHeader } from './PageHeader';
import { MaintenanceReportManager } from './MaintenanceReportManager';

interface ReportsProps {
  tasks?: MaintenanceTask[]; // Optional for backward compatibility during transition
  presses?: Press[];
}

type OverdueFilter = 'all' | '1m' | '3m' | '1y';

export function Reports({ tasks: initialTasks, presses: initialPresses }: ReportsProps) {
  const { } = useAuth();
  const [tasks, setTasks] = useState<MaintenanceTask[]>(initialTasks || []);
  const [presses, setPresses] = useState<Press[]>(initialPresses || []);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialTasks) setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    if (initialPresses) setPresses(initialPresses);
  }, [initialPresses]);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [records, pressRecords] = await Promise.all([
        pb.collection('onderhoud').getFullList({
          sort: 'sort_order,created',
          expand: 'category,pers,assigned_operator,assigned_team,tags',
        }),
        pb.collection('persen').getFullList()
      ]);

      setPresses(pressRecords.map((r: any) => ({
        id: r.id,
        name: r.naam,
        active: r.active !== false,
        archived: r.archived === true
      })));

      const flattened: MaintenanceTask[] = records.map((record: any) => {
        const categoryName = record.expand?.category?.naam || 'Uncategorized';
        const pressName = record.expand?.pers?.naam || 'Unknown';

        return {
          id: record.id,
          task: record.task,
          subtaskName: record.subtask,
          taskSubtext: record.task_subtext,
          subtaskSubtext: record.subtask_subtext,
          category: categoryName,
          categoryId: record.category,
          press: pressName,
          pressId: record.pers,
          lastMaintenance: record.last_date ? new Date(record.last_date) : null,
          nextMaintenance: record.next_date ? new Date(record.next_date) : new Date(),
          maintenanceInterval: record.interval,
          maintenanceIntervalUnit: record.interval_unit === 'Dagen' ? 'days' :
            record.interval_unit === 'Weken' ? 'weeks' :
              record.interval_unit === 'Maanden' ? 'months' :
                record.interval_unit === 'Jaren' ? 'years' : 'days',
          assignedTo: [
            ...(record.expand?.assigned_operator?.map((o: any) => o.naam) || []),
            ...(record.expand?.assigned_team?.map((t: any) => t.name) || [])
          ].join(', '),
          opmerkingen: record.opmerkingen || '',
          comment: record.comment || '',
          commentDate: record.commentDate ? new Date(record.commentDate) : null,
          sort_order: record.sort_order || 0,
          isExternal: record.is_external || false,
          tagIds: record.tags || [],
          created: record.created,
          updated: record.updated
        };
      });

      setTasks(flattened);
    } catch (e) {
      console.error("Failed to fetch data in Reports", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialTasks || !initialPresses) {
      fetchData();
    }
  }, [fetchData, initialTasks, initialPresses]);
  const [selectedPress, setSelectedPress] = useState<PressType | 'all'>(() => {
    if (typeof sessionStorage !== 'undefined') {
      return (sessionStorage.getItem('reports_selectedPress') as PressType | 'all') || 'all';
    }
    return 'all';
  });
  const [overdueFilter, setOverdueFilter] = useState<OverdueFilter>(() => {
    if (typeof sessionStorage !== 'undefined') {
      return (sessionStorage.getItem('reports_overdueFilter') as OverdueFilter) || 'all';
    }
    return 'all';
  });

  useEffect(() => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('reports_selectedPress', selectedPress);
    }
  }, [selectedPress]);

  useEffect(() => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('reports_overdueFilter', overdueFilter);
    }
  }, [overdueFilter]);
  const printRef = useRef<HTMLDivElement>(null);

  // --- CONFIGURATION CONSTANTS ---
  // EDIT THESE TO CHANGE LAYOUT AND TYPOGRAPHY FROM ONE PLACE
  const COL_WIDTHS = {
    task: '40%',
    status: '15%',
    assigned: '10%',
    remarks: '35%'
  };

  const FONT_SIZES = {
    title: 'text-2xl',      // Main report titles
    section: 'text-lg',    // Press names and summary headers
    body: 'text-sm',       // Table rows and general text
    label: 'text-xs',      // Table headers and small labels
    detail: 'text-[10px]'  // Status details (e.g., "geleden")
  };

  const REPORT_HEADERS = [
    { label: 'Taak', w: COL_WIDTHS.task, key: 'task' },
    { label: 'Gepland / Status', w: COL_WIDTHS.status, key: 'due_status' },
    { label: 'Laatst door', w: COL_WIDTHS.assigned, key: 'assigned' },
    { label: 'Opmerkingen', w: COL_WIDTHS.remarks, key: 'opmerkingen' },
  ];

  // --- STYLING CONSTANTS ---

  const formatDate = (date: Date | null): string => {
    if (!date) return 'N/A';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  const getOverdueTasks = (press?: PressType) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let filteredTasks = tasks.filter(task => {
      const dueDate = new Date(task.nextMaintenance);
      dueDate.setHours(0, 0, 0, 0);

      if (dueDate >= today) return false;

      if (overdueFilter === 'all') return true;

      const diffTime = Math.abs(today.getTime() - dueDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (overdueFilter === '1m') return diffDays > 30;
      if (overdueFilter === '3m') return diffDays > 90;
      if (overdueFilter === '1y') return diffDays > 365;

      return true;
    });

    if (press) {
      filteredTasks = filteredTasks.filter(task => task.press === press);
    }

    return filteredTasks;
  };

  const getDueSoonTasks = (press?: PressType) => {
    if (overdueFilter !== 'all') return [];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    let filteredTasks = tasks.filter(task => {
      const next = new Date(task.nextMaintenance);
      next.setHours(0, 0, 0, 0);
      return next >= today && next <= weekFromNow;
    });

    if (press) {
      filteredTasks = filteredTasks.filter(task => task.press === press);
    }

    return filteredTasks;
  };

  const groupTasksByCategory = (tasksToGroup: MaintenanceTask[]) => {
    const groups: Record<string, MaintenanceTask[]> = {};
    tasksToGroup.forEach(task => {
      const category = task.category || 'Uncategorized';
      if (!groups[category]) {
        groups[category] = [];
      }
      groups[category].push(task);
    });
    return groups;
  };

  // ... existing code ...
  const handlePrint = () => {
    window.print();
  };

  const [view, setView] = useState<'reports' | 'config'>('reports'); // [NEW] View state

  // [NEW] If in config view, render manager
  if (view === 'config') {
    return (
      <div className="w-full mx-auto space-y-4">
        <Button
          variant="ghost"
          onClick={() => setView('reports')}
          className="mb-2 pl-0 hover:bg-transparent hover:text-blue-600"
        >
          ← Terug naar overzicht
        </Button>
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          {/* Dynamic Import to avoid circular dependencies if any, though likely fine as static */}
          <MaintenanceReportManager tasks={initialTasks} />
        </div>
      </div>
    );
  }

  const activePresses = presses.filter(p => p.active && !p.archived);
  const pressesToShow = selectedPress === 'all'
    ? activePresses.map(p => p.name as PressType)
    : [selectedPress as PressType];

  // Helper component for rendering table headers dynamically
  const ReportTableHeader = () => (
    <thead>
      <tr className="text-xs text-gray-400 uppercase border-b border-gray-100 bg-gray-50/30">
        {REPORT_HEADERS.map((header) => (
          <th
            key={header.key}
            className="py-2 px-2 font-semibold text-left"
            style={{ width: header.w }}
          >
            {header.label}
          </th>
        ))}
      </tr>
    </thead>
  );

  const TableRow = ({ task, isOverdue }: { task: MaintenanceTask, isOverdue: boolean }) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.nextMaintenance);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = Math.abs(today.getTime() - dueDate.getTime());
    const daysDiff = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    const displayName = task.subtaskName && task.subtaskName !== task.task
      ? `${task.task} -> ${task.subtaskName}`
      : task.task;

    const displaySubtext = task.subtaskName && task.subtaskName !== task.task
      ? task.subtaskSubtext || task.taskSubtext
      : task.taskSubtext;

    return (
      <tr className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${FONT_SIZES.body}`}>
        {/* Task */}
        <td className="py-2 px-2" style={{ width: COL_WIDTHS.task }}>
          <div className="font-medium text-gray-900 truncate" title={displayName}>{displayName}</div>
          {displaySubtext && (
            <div className={`text-gray-500 truncate ${FONT_SIZES.label}`} title={displaySubtext}>{displaySubtext}</div>
          )}
        </td>
        {/* Due / Status */}
        <td className="py-2 px-2 whitespace-nowrap" style={{ width: COL_WIDTHS.status }}>
          <div className="flex flex-col">
            <span className="text-gray-600">{formatDate(task.nextMaintenance)}</span>
            <span className={`${FONT_SIZES.detail} uppercase font-bold tracking-tight ${isOverdue ? 'text-red-600' : 'text-orange-600'}`}>
              {daysDiff} {daysDiff === 1 ? 'dag' : 'dagen'} {isOverdue ? 'geleden' : 'resterend'}
            </span>
          </div>
        </td>
        {/* Assigned */}
        <td className="py-2 px-2 text-gray-600 truncate" style={{ width: COL_WIDTHS.assigned }} title={task.assignedTo || '-'}>
          {task.assignedTo || '-'}
        </td>
        {/* Opmerkingen */}
        <td className="py-2 px-2 text-gray-500 italic truncate" style={{ width: COL_WIDTHS.remarks }} title={task.opmerkingen}>
          {task.opmerkingen || '-'}
        </td>
      </tr>
    );
  };

  return (
    <div className="w-full mx-auto">
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            <p className="font-medium text-blue-900 text-lg">Laden...</p>
          </div>
        </div>
      )}
      <div className="no-print">
        {/* HEADER ROW - LEFT ALIGNED TITLE, RIGHT ALIGNED BUTTON */}
        <PageHeader
          title="Onderhoudsrapportages"
          description="Overzicht van de onderhoudsstatus"
          icon={FileText}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setView('config')} className="gap-2">
                <Settings className="w-4 h-4" />
                Beheer
              </Button>
              <Button onClick={handlePrint} className="gap-2 shadow-sm">
                <Printer className="w-4 h-4" />
                Printen
              </Button>
            </div>
          }
          className="mb-1"
        />

        {/* CONTROLS ROW - FORCED SINGLE ROW (justify-between) */}
        <div className="flex items-center justify-between gap-4 w-full mb-2">

          {/* LEFT: PRESS SELECTION */}
          <div className="flex-1 overflow-x-auto no-scrollbar py-2">
            <Tabs value={selectedPress} onValueChange={(value) => setSelectedPress(value as PressType | 'all')}>
              <TabsList className="tab-pill-list">
                <TabsTrigger value="all" className="tab-pill-trigger">Alle</TabsTrigger>
                {activePresses.map((press) => (
                  <TabsTrigger key={press.id} value={press.name} className="tab-pill-trigger">
                    {press.name}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>

          {/* RIGHT: OVERDUE FILTER */}
          <div>
            <Tabs value={overdueFilter} onValueChange={(value) => setOverdueFilter(value as OverdueFilter)}>
              <TabsList className="tab-pill-list">
                <TabsTrigger value="all" className="tab-pill-trigger">Alle</TabsTrigger>
                <TabsTrigger value="1m" className="tab-pill-trigger">&gt; 1 Maand</TabsTrigger>
                <TabsTrigger value="3m" className="tab-pill-trigger">&gt; 3 Maanden</TabsTrigger>
                <TabsTrigger value="1y" className="tab-pill-trigger">&gt; 1 Jaar</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

        </div>
      </div>

      {/* Printable Content */}
      <div ref={printRef} className="print-content">
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-content, .print-content * {
              visibility: visible;
            }
            .print-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 0;
              margin: 0;
            }
            .no-print {
              display: none !important;
            }
            @page {
              size: A4;
              margin: 20mm;
            }
            tr {
              break-inside: avoid;
            }
            thead {
              display: table-header-group;
            }
          }
        `}</style>
// ... rest of file

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8">
          {/* PRINTABLE REPORT TITLE BLOCK */}
          <div className="mb-2 border-b pb-4 text-center">
            <h1 className={`${FONT_SIZES.title} font-extrabold text-gray-900 tracking-tight`}>Onderhoudsrapport</h1>
            <p className="text-gray-500 text-sm mt-1">Gegenereerd op {new Date().toLocaleDateString('nl-NL')}</p>
          </div>

          {/* STATS SUMMARY BAR */}
          <div className="flex justify-around items-center bg-gray-50 rounded-lg p-4 mb-2 border border-gray-100">
            <div className="text-center">
              <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Totaal Taken</div>
              <div className="text-2xl font-bold text-gray-900">{formatNumber(tasks.length)}</div>
            </div>
            <div className="text-center border-l border-gray-200 pl-8">
              <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Achterstallig</div>
              <div className="text-2xl font-bold text-red-600">{formatNumber(tasks.filter(t => new Date(t.nextMaintenance) < new Date()).length)}</div>
            </div>
            <div className="text-center border-l border-gray-200 pl-8">
              <div className="text-xs text-gray-500 uppercase tracking-wide font-semibold">Binnen 7 Dagen</div>
              <div className="text-2xl font-bold text-orange-500">
                {formatNumber(tasks.filter(t => {
                  const d = new Date(t.nextMaintenance);
                  const now = new Date();
                  const week = new Date();
                  week.setDate(week.getDate() + 7);
                  return d >= now && d <= week;
                }).length)}
              </div>
            </div>
          </div>


          {/* 
              This table is purely for printing purposes if we wanted a condensed list, 
              but the below per-press sections are better. 
              We can keep this structure wrapper. 
          */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse table-fixed hidden">
              <ReportTableHeader />
              <tbody className="divide-y divide-gray-100">
                {/* Global list if needed */}
              </tbody>
            </table>
          </div>

          {pressesToShow.map((press) => {
            const overdueTasks = getOverdueTasks(press);
            const dueSoonTasks = getDueSoonTasks(press);

            const groupedOverdue = groupTasksByCategory(overdueTasks);
            const groupedDueSoon = groupTasksByCategory(dueSoonTasks);

            const overdueCategories = Object.keys(groupedOverdue).sort();
            const dueSoonCategories = Object.keys(groupedDueSoon).sort();

            if (overdueTasks.length === 0 && dueSoonTasks.length === 0) return null;

            return (
              <div key={press} className="mb-10 break-inside-avoid">
                <div className="flex items-center mb-2 bg-gray-50 p-2 rounded-lg border border-gray-100 flex-nowrap overflow-hidden">
                  <div className="flex-1" /> {/* Left Spacer */}
                  <h2 className={`${FONT_SIZES.section} font-bold text-gray-900 text-center whitespace-nowrap mx-4`}>{press}</h2>
                  <div className="flex-1 flex justify-end items-center gap-2 whitespace-nowrap flex-shrink-0">
                    {overdueTasks.length > 0 && (
                      <Badge variant="destructive" className="font-mono">
                        {formatNumber(overdueTasks.length)} Te laat
                      </Badge>
                    )}
                    {dueSoonTasks.length > 0 && (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200 font-mono">
                        {formatNumber(dueSoonTasks.length)} Binnenkort
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Overdue Section */}
                {overdueTasks.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-red-700 font-semibold mb-3 border-b border-red-100 pb-1 text-sm uppercase tracking-wide no-print">
                      Achterstallige Taken
                    </h3>

                    {overdueCategories.map(category => (
                      <div key={`overdue-${category}`} className="mb-2 pl-2 border-l-2 border-red-100">
                        <h4 className={`font-semibold text-gray-700 mb-2 ${FONT_SIZES.body}`}>{category}</h4>
                        <table className="w-full text-left border-collapse table-fixed">
                          <ReportTableHeader />
                          <tbody>
                            {groupedOverdue[category].map(task => (
                              <TableRow key={task.id} task={task} isOverdue={true} />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )}

                {/* Due Soon Section */}
                {dueSoonTasks.length > 0 && (
                  <div className={`${overdueTasks.length > 0 ? 'mt-8' : ''} mb-6`}>
                    <h3 className="text-orange-700 font-semibold mb-3 border-b border-orange-100 pb-1 text-sm uppercase tracking-wide no-print">
                      Gepland voor deze week
                    </h3>

                    {dueSoonCategories.map(category => (
                      <div key={`soon-${category}`} className="mb-2 pl-2 border-l-2 border-orange-100">
                        <h4 className={`font-semibold text-gray-700 mb-2 ${FONT_SIZES.body}`}>{category}</h4>
                        <table className="w-full text-left border-collapse table-fixed">
                          <ReportTableHeader />
                          <tbody>
                            {groupedDueSoon[category].map(task => (
                              <TableRow key={task.id} task={task} isOverdue={false} />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}

          {pressesToShow.every(press => getOverdueTasks(press).length === 0 && getDueSoonTasks(press).length === 0) && (
            <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-200">
              <p className="text-gray-500 font-medium">No tasks found matching your criteria.</p>
              {overdueFilter !== 'all' && (
                <p className="text-sm text-gray-400 mt-1">Try adjusting the overdue filter.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}