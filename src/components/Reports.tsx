import { useState, useRef } from 'react';
import { MaintenanceTask } from './AuthContext';
import { useAuth, PressType } from './AuthContext';
import { Button } from './ui/button';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';
import { Printer } from 'lucide-react';

interface ReportsProps {
  tasks: MaintenanceTask[];
}

type OverdueFilter = 'all' | '1m' | '3m' | '1y';

export function Reports({ tasks }: ReportsProps) {
  const { presses } = useAuth();
  const [selectedPress, setSelectedPress] = useState<PressType | 'all'>('all');
  const [overdueFilter, setOverdueFilter] = useState<OverdueFilter>('all');
  const printRef = useRef<HTMLDivElement>(null);

  // --- COLUMN DEFINITION CONSTANT ---
  const REPORT_HEADERS = [
    // REQUESTED WIDTHS: 40 + 10 + 10 + 10 + 30 = 100%
    { label: 'Taak', w: 'w-[40%]', key: 'task' },
    { label: 'Gepland', w: 'w-[10%]', key: 'due' },
    { label: 'Status', w: 'w-[10%]', key: 'status' },
    { label: 'Laatst door', w: 'w-[10%]', key: 'assigned' },
    { label: 'Opmerkingen', w: 'w-[30%]', key: 'opmerkingen' },
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

  const handlePrint = () => {
    window.print();
  };

  const activePresses = presses.filter(p => p.active && !p.archived);
  const pressesToShow = selectedPress === 'all'
    ? activePresses.map(p => p.name as PressType)
    : [selectedPress as PressType];

  // Helper component for rendering table headers dynamically
  const ReportTableHeader = () => (
    <thead>
      <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
        {REPORT_HEADERS.map((header, index) => (
          <th
            key={header.key}
            className={`py-1 font-medium ${header.w} ${index === 0 ? 'pl-2' : ''}`}
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

    return (
      <tr className="border-b border-gray-100 hover:bg-gray-50 transition-colors text-sm">
        {/* Task (w-[40%]) */}
        <td className="py-2 pl-2">
          <div className="font-medium text-gray-900">{task.task}</div>
          {task.taskSubtext && (
            <div className="text-xs text-gray-500">{task.taskSubtext}</div>
          )}
        </td>
        {/* Due (w-[10%]) */}
        <td className="py-2 text-gray-600 whitespace-nowrap">{formatDate(task.nextMaintenance)}</td>
        {/* Status (w-[10%]) */}
        <td className={`py-2 font-medium whitespace-nowrap ${isOverdue ? 'text-red-600' : 'text-orange-600'}`}>
          {daysDiff} {daysDiff === 1 ? 'dag' : 'dagen'} {isOverdue ? 'te laat' : 'resterend'}
        </td>
        {/* Assigned (w-[10%]) */}
        <td className="py-2 text-gray-600">{task.assignedTo || '-'}</td>
        {/* Opmerkingen (w-[30%]) */}
        <td className="py-2 text-gray-500 italic truncate pr-2" title={task.opmerkingen}>
          {task.opmerkingen || '-'}
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6">
      {/* HEADER ROW - LEFT ALIGNED TITLE, RIGHT ALIGNED BUTTON */}
      <div className="flex items-center justify-between py-4 no-print">

        {/* Title on the left */}
        <div>
          <h2 className="text-2xl font-extrabold text-gray-900 tracking-tight">Onderhoudsrapportages</h2>
          <p className="text-sm text-gray-500 mt-1">
            Overzicht van de onderhoudsstatus
          </p>
        </div>

        {/* Print Button on the right */}
        <Button onClick={handlePrint} className="gap-2 shadow-sm">
          <Printer className="w-4 h-4" />
          Printen
        </Button>
      </div>

      {/* CONTROLS ROW - FORCED SINGLE ROW (justify-between) */}
      <div className="no-print flex items-center justify-between gap-4 w-full">

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
            }
            .no-print {
              display: none !important;
            }
            @page {
              size: A4;
              margin: 15mm;
            }
            tr {
              break-inside: avoid;
            }
            thead {
              display: table-header-group;
            }
          }
        `}</style>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 min-h-screen">
          {/* PRINTABLE REPORT TITLE BLOCK */}
          <div className="mb-8 border-b pb-4 text-center">
            <h1 className="text-2xl font-extrabold text-gray-900 tracking-tight">Onderhoudsrapport</h1>
            <div className="text-sm text-gray-500 mt-1">
              Gegenereerd op {formatDate(new Date())}
            </div>
            {overdueFilter !== 'all' && (
              <div className="mt-4 inline-block">
                <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                  Filter: Achterstallig &gt; {overdueFilter === '1y' ? '1 Jaar' : overdueFilter === '3m' ? '3 Maanden' : '1 Maand'}
                </Badge>
              </div>
            )}
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
                <div className="flex items-center gap-3 mb-4 bg-gray-50 p-2 rounded-lg border border-gray-100">
                  <h2 className="text-lg font-bold text-gray-900">{press}</h2>
                  <div className="flex gap-2">
                    {overdueTasks.length > 0 && (
                      <Badge variant="destructive" className="font-mono">
                        {overdueTasks.length} Te laat
                      </Badge>
                    )}
                    {dueSoonTasks.length > 0 && (
                      <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200 font-mono">
                        {dueSoonTasks.length} Binnenkort
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Overdue Section */}
                {overdueTasks.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-red-700 font-semibold mb-3 border-b border-red-100 pb-1 text-sm uppercase tracking-wide">
                      Achterstallige Taken
                    </h3>

                    {overdueCategories.map(category => (
                      <div key={`overdue-${category}`} className="mb-4 pl-2 border-l-2 border-red-100">
                        <h4 className="font-semibold text-gray-700 mb-2 text-sm">{category}</h4>
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
                  <div className="mb-6">
                    <h3 className="text-orange-700 font-semibold mb-3 border-b border-orange-100 pb-1 text-sm uppercase tracking-wide">
                      Gepland voor deze week
                    </h3>

                    {dueSoonCategories.map(category => (
                      <div key={`soon-${category}`} className="mb-4 pl-2 border-l-2 border-orange-100">
                        <h4 className="font-semibold text-gray-700 mb-2 text-sm">{category}</h4>
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