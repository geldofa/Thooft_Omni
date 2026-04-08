import { useState, useMemo, useCallback, useEffect } from 'react';
import { MaintenanceTask, pb, Category, Press } from './AuthContext';
import { useAuth, PressType } from './AuthContext';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Clock, ChevronRight, Download, Loader2, ClipboardCheck, Printer, Archive, CalendarRange, ChevronDown } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { Textarea } from './ui/textarea';

import { formatNumber } from '../utils/formatNumber';
import { PDFViewer, PDFDownloadLink } from '@react-pdf/renderer';
import { ChecklistPDF, ChecklistTask } from './pdf/ChecklistPDF';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Input } from './ui/input';
import { cn } from './ui/utils';
import { formatDisplayDate } from '../utils/dateUtils';
import { Progress } from './ui/progress';
import { Badge } from './ui/badge';
import { Factory } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

interface MaintenanceChecklistProps {
  tasks?: MaintenanceTask[];
  presses?: Press[];
  categories?: Category[];
}

interface ChecklistRecord {
  id: string;
  press_name: string;
  press_id: string;
  task_ids: string[];
  completed_task_ids: string[];
  incomplete_task_ids: string[];
  active: boolean;
  start_date: string;
  end_date: string;
  created_by: string;
  completed_count: number;
  summary: any;
  created: string;
  updated: string;
}

export function MaintenanceChecklist({ tasks: initialTasks, presses: initialPresses, categories: initialCategories }: MaintenanceChecklistProps) {
  const { } = useAuth();
  const [tasks, setTasks] = useState<MaintenanceTask[]>(initialTasks || []);
  const [presses, setPresses] = useState<Press[]>(initialPresses || []);
  const [categories, setCategories] = useState<Category[]>(initialCategories || []);
  const [isLoading, setIsLoading] = useState(false);

  // Checklist state
  const [activeChecklists, setActiveChecklists] = useState<ChecklistRecord[]>([]);
  const [archivedChecklists, setArchivedChecklists] = useState<ChecklistRecord[]>([]);
  const [showPdfBuilder, setShowPdfBuilder] = useState(false);

  useEffect(() => {
    if (initialTasks) setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    if (initialPresses) setPresses(initialPresses);
  }, [initialPresses]);

  useEffect(() => {
    if (initialCategories) setCategories(initialCategories);
  }, [initialCategories]);

  const fetchChecklists = useCallback(async () => {
    if (!pb.authStore.isValid) {
      console.warn('[MaintenanceChecklist] Auth not valid, skipping checklist fetch');
      return;
    }
    try {
      const result = await pb.collection('maintenance_checklists').getList(1, 200);
      const active: ChecklistRecord[] = [];
      const archived: ChecklistRecord[] = [];
      (result.items as unknown as ChecklistRecord[]).forEach(c => {
        if (c.active) active.push(c);
        else archived.push(c);
      });
      setActiveChecklists(active);
      setArchivedChecklists(archived);
    } catch (e: any) {
      if (e?.status === 404) {
        console.warn('[MaintenanceChecklist] maintenance_checklists collection not found');
      } else {
        console.error('Failed to fetch checklists:', e);
        console.error('Response data:', JSON.stringify(e?.data));
        console.error('Original error:', e?.originalError);
      }
    }
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [records, pressRecords, catRecords] = await Promise.all([
        pb.collection('onderhoud').getFullList({
          sort: 'sort_order,created',
          expand: 'category,pers,assigned_operator,assigned_team,tags',
        }),
        pb.collection('persen').getFullList(),
        pb.collection('categorieen').getFullList()
      ]);

      setPresses(pressRecords.map((r: any) => ({
        id: r.id,
        name: r.naam,
        active: r.active !== false,
        archived: r.archived === true
      })));

      setCategories(catRecords.map((r: any) => ({
        id: r.id,
        name: r.naam,
        pressIds: Array.isArray(r.pers_ids) ? r.pers_ids : [],
        active: r.active !== false,
        subtexts: typeof r.subtexts === 'object' ? r.subtexts : {}
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
      console.error("Failed to fetch data in MaintenanceChecklist", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChecklists();
    if (!initialTasks || !initialPresses || !initialCategories) {
      fetchData();
    }
  }, [fetchData, fetchChecklists, initialTasks, initialPresses, initialCategories]);

  // === Helpers ===
  const formatDate = (date: Date | string | null): string => {
    if (!date) return '-';
    const d = typeof date === 'string' ? new Date(date) : date;
    return formatDisplayDate(d);
  };

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return days;
  };

  const handlePrintSummary = (checklist: ChecklistRecord) => {
    const totalTasks = checklist.task_ids?.length || 0;
    const completedCount = checklist.completed_task_ids?.length || 0;
    const incompleteCount = totalTasks - completedCount;
    const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Samenvatting — ${checklist.press_name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 12px; color: #000; padding: 30px; }
    h1 { font-size: 20px; margin-bottom: 6px; }
    .meta { font-size: 11px; color: #555; margin-bottom: 16px; }
    .summary-box { border: 2px solid #333; padding: 16px; margin-bottom: 20px; }
    .summary-box h2 { font-size: 14px; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 1px; }
    .stat-row { display: flex; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid #ddd; }
    .stat-row:last-child { border-bottom: none; }
    .stat-label { font-weight: 500; }
    .stat-value { font-weight: bold; }
    .progress-bar { width: 100%; height: 16px; background: #eee; margin: 12px 0; position: relative; }
    .progress-fill { height: 100%; background: #333; }
    .progress-text { position: absolute; top: 0; left: 50%; transform: translateX(-50%); font-size: 10px; font-weight: bold; line-height: 16px; color: ${progressPercent > 50 ? '#fff' : '#000'}; }
    .footer { margin-top: 24px; font-size: 9px; color: #888; border-top: 1px solid #ccc; padding-top: 8px; }
    @media print {
      body { padding: 15px; }
      @page { margin: 12mm; }
    }
  </style>
</head>
<body>
  <h1>Checklist Samenvatting — ${checklist.press_name}</h1>
  <div class="meta">
    Periode: ${formatDate(checklist.start_date)} — ${formatDate(checklist.end_date)} &nbsp;|&nbsp;
    Aangemaakt door: ${checklist.created_by} &nbsp;|&nbsp;
    Afgedrukt: ${new Date().toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
  </div>

  <div class="summary-box">
    <h2>Resultaat</h2>
    <div class="progress-bar">
      <div class="progress-fill" style="width: ${progressPercent}%;"></div>
      <div class="progress-text">${progressPercent}%</div>
    </div>
    <div class="stat-row">
      <span class="stat-label">Totaal taken</span>
      <span class="stat-value">${totalTasks}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Voltooid</span>
      <span class="stat-value">${completedCount}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Niet voltooid</span>
      <span class="stat-value">${incompleteCount}</span>
    </div>
    <div class="stat-row">
      <span class="stat-label">Status</span>
      <span class="stat-value">${checklist.active ? 'Actief' : 'Gearchiveerd'}</span>
    </div>
    ${checklist.summary?.archived_at ? `<div class="stat-row">
      <span class="stat-label">Gearchiveerd op</span>
      <span class="stat-value">${formatDate(checklist.summary.archived_at)}</span>
    </div>` : ''}
    ${checklist.summary?.archived_by ? `<div class="stat-row">
      <span class="stat-label">Gearchiveerd door</span>
      <span class="stat-value">${checklist.summary.archived_by}</span>
    </div>` : ''}
    ${checklist.summary?.reason ? `<div class="stat-row">
      <span class="stat-label">Reden</span>
      <span class="stat-value">${checklist.summary.reason === 'end_date_expired' ? 'Periode verlopen' : checklist.summary.reason === 'manually_closed' ? 'Handmatig gesloten' : checklist.summary.reason}</span>
    </div>` : ''}
  </div>

  <div class="footer">T'Hooft OMNI — Onderhoudstaken Checklist Samenvatting</div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=700,height=600');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  // === PDF Builder State (preserved from original) ===
  const [selectedPress, setSelectedPress] = useState<PressType | ''>('');
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [supervisorGuidance, setSupervisorGuidance] = useState('');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('Vandaag');
  const [fontSize, setFontSize] = useState(9);
  const [marginH, setMarginH] = useState(15);
  const [marginV, setMarginV] = useState(10);

  const today = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  const activePresses = presses.filter(p => p.active && !p.archived);

  const getCategorySubtext = (categoryName: string) => {
    if (!selectedPress) return null;
    const press = activePresses.find(p => p.name === selectedPress);
    if (!press) return null;
    const category = categories.find(c => c.name === categoryName);
    return category?.subtexts?.[press.id] || null;
  };

  const allPressTasks = selectedPress
    ? tasks.filter(task => task.press === selectedPress)
    : [];

  const isTaskOverdue = (task: MaintenanceTask): boolean => {
    if (!task.nextMaintenance) return false;
    const nextDue = new Date(task.nextMaintenance);
    const nextDueStart = new Date(nextDue.getFullYear(), nextDue.getMonth(), nextDue.getDate());
    return nextDueStart < today;
  };

  const handleAddAllOverdue = () => {
    const overdueIds = allPressTasks.filter(isTaskOverdue).map(task => task.id);
    setSelectedTasks(prev => [...new Set([...prev, ...overdueIds])]);
  };

  const handleToggleTask = (taskId: string, isChecked: boolean) => {
    setSelectedTasks(prev =>
      isChecked ? [...prev, taskId] : prev.filter(id => id !== taskId)
    );
  };

  const handleToggleCategory = (category: string, isChecked: boolean) => {
    const categoryTaskIds = allTasksGrouped[category].map(t => t.id);
    setSelectedTasks(prev => {
      if (isChecked) {
        return [...new Set([...prev, ...categoryTaskIds])];
      } else {
        return prev.filter(id => !categoryTaskIds.includes(id));
      }
    });
  };

  const allTasksGrouped = allPressTasks.reduce((acc, task) => {
    if (!acc[task.category]) acc[task.category] = [];
    acc[task.category].push(task);
    return acc;
  }, {} as Record<string, MaintenanceTask[]>);

  const allCategories = Object.keys(allTasksGrouped).sort();

  const checklistPdfTasks: ChecklistTask[] = allPressTasks
    .filter(task => selectedTasks.includes(task.id))
    .map(task => ({
      id: task.id,
      task: task.task,
      subtaskName: task.subtaskName,
      taskSubtext: task.taskSubtext,
      subtaskSubtext: task.subtaskSubtext,
      category: task.category,
      nextMaintenance: task.nextMaintenance,
      lastMaintenance: task.lastMaintenance,
      opmerkingen: task.opmerkingen,
      isOverdue: isTaskOverdue(task),
      period: selectedPeriod
    }));

  const pdfCategorySubtexts = Object.fromEntries(
    allCategories.map(cat => [cat, getCategorySubtext(cat)])
  );

  return (
    <div className="w-full h-full mx-auto flex flex-col overflow-hidden">
      {isLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-2">
            <Loader2 className="h-10 w-10 animate-spin text-emerald-600" />
            <p className="font-medium text-emerald-900 text-lg">Laden...</p>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between shrink-0 mb-4">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-emerald-600" /> Checklist Overzicht
        </h1>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        <div className="space-y-6 pr-4 pb-6">

          {/* ==================== ACTIVE CHECKLISTS ==================== */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-5 bg-emerald-500 rounded-full"></div>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">Actieve Checklists</h2>
              <Badge variant="secondary" className="ml-1 text-[10px] font-bold">{activeChecklists.length}</Badge>
            </div>

            {activeChecklists.length === 0 ? (
              <Card className="border-dashed border-slate-200">
                <CardContent className="py-8 flex flex-col items-center text-center">
                  <ClipboardCheck className="w-10 h-10 text-slate-200 mb-2" />
                  <p className="text-sm text-slate-500 font-medium">Geen actieve checklists</p>
                  <p className="text-[10px] text-slate-400 mt-1">Maak een nieuwe checklist aan via het "Nieuw" menu</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {activeChecklists.map(checklist => {
                  const totalTasks = checklist.task_ids?.length || 0;
                  const completedCount = checklist.completed_task_ids?.length || 0;
                  const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
                  const daysLeft = getDaysRemaining(checklist.end_date);
                  const isExpiring = daysLeft <= 3 && daysLeft > 0;
                  const isExpired = daysLeft <= 0;

                  return (
                    <Card key={checklist.id} className={cn(
                      "relative overflow-hidden transition-all hover:shadow-md",
                      isExpired ? "border-red-200 bg-red-50/30" :
                      isExpiring ? "border-amber-200 bg-amber-50/30" :
                      "border-emerald-100 hover:border-emerald-200"
                    )}>
                      {/* Top accent bar */}
                      <div className={cn(
                        "h-1 w-full",
                        isExpired ? "bg-red-400" : isExpiring ? "bg-amber-400" : "bg-emerald-400"
                      )} />

                      <CardContent className="p-4 space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-base font-black text-slate-800">{checklist.press_name}</h3>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-500 mt-0.5">
                              <CalendarRange className="w-3 h-3" />
                              {formatDate(checklist.start_date)} — {formatDate(checklist.end_date)}
                            </div>
                          </div>
                          <div className={cn(
                            "text-right",
                            isExpired ? "text-red-600" : isExpiring ? "text-amber-600" : "text-emerald-600"
                          )}>
                            <div className="text-2xl font-black leading-none">{progressPercent}%</div>
                            <div className="text-[9px] font-bold uppercase tracking-wider mt-0.5">
                              {isExpired ? 'Verlopen' : `${daysLeft} ${daysLeft === 1 ? 'dag' : 'dagen'} over`}
                            </div>
                          </div>
                        </div>

                        {/* Progress bar */}
                        <div className="space-y-1">
                          <Progress value={progressPercent} className={cn(
                            "h-2",
                            isExpired ? "[&>div]:bg-red-400" : isExpiring ? "[&>div]:bg-amber-400" : ""
                          )} />
                          <div className="flex justify-between text-[9px] text-slate-400 font-medium">
                            <span>{formatNumber(completedCount)} voltooid</span>
                            <span>{formatNumber(totalTasks - completedCount)} te gaan</span>
                          </div>
                        </div>

                        {/* Footer info */}
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                          <span className="text-[10px] text-slate-400">
                            Door <span className="font-semibold text-slate-600">{checklist.created_by}</span>
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {formatNumber(totalTasks)} taken
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {/* ==================== ARCHIVED CHECKLISTS ==================== */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <div className="w-1.5 h-5 bg-slate-400 rounded-full"></div>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-700">Vorige Checklists</h2>
              <Badge variant="secondary" className="ml-1 text-[10px] font-bold">{archivedChecklists.length}</Badge>
            </div>

            {archivedChecklists.length === 0 ? (
              <Card className="border-dashed border-slate-200">
                <CardContent className="py-6 flex flex-col items-center text-center">
                  <Archive className="w-8 h-8 text-slate-200 mb-2" />
                  <p className="text-sm text-slate-500 font-medium">Geen gearchiveerde checklists</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {archivedChecklists.map(checklist => {
                  const totalTasks = checklist.task_ids?.length || 0;
                  const completedCount = checklist.completed_task_ids?.length || 0;
                  const incompleteCount = totalTasks - completedCount;
                  const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
                  const reason = checklist.summary?.reason === 'end_date_expired' ? 'Verlopen' :
                    checklist.summary?.reason === 'manually_closed' ? 'Handmatig gesloten' : 'Gearchiveerd';

                  return (
                    <Card key={checklist.id} className="border-slate-200 hover:border-slate-300 transition-colors">
                      <CardContent className="p-3 flex items-center gap-4">
                        {/* Completion indicator */}
                        <div className={cn(
                          "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 text-sm font-black",
                          progressPercent === 100
                            ? "bg-emerald-100 text-emerald-700"
                            : progressPercent >= 75
                            ? "bg-amber-100 text-amber-700"
                            : "bg-red-100 text-red-700"
                        )}>
                          {progressPercent}%
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-800">{checklist.press_name}</span>
                            <Badge variant="outline" className={cn(
                              "text-[9px] px-1.5 h-4 font-bold",
                              progressPercent === 100 ? "border-emerald-200 text-emerald-700 bg-emerald-50" : "border-slate-200 text-slate-500"
                            )}>
                              {reason}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-[10px] text-slate-400 mt-0.5">
                            <span>{formatDate(checklist.start_date)} — {formatDate(checklist.end_date)}</span>
                            <span>•</span>
                            <span className="text-emerald-600 font-semibold">{formatNumber(completedCount)} voltooid</span>
                            {incompleteCount > 0 && (
                              <>
                                <span>•</span>
                                <span className="text-red-500 font-semibold">{formatNumber(incompleteCount)} niet voltooid</span>
                              </>
                            )}
                            <span>•</span>
                            <span>Door {checklist.created_by}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePrintSummary(checklist)}
                          className="shrink-0 h-8 text-xs text-slate-600 hover:text-slate-900 gap-1"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Samenvatting
                        </Button>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {/* ==================== PDF BUILDER (Collapsible) ==================== */}
          <section>
            <Button
              variant="ghost"
              onClick={() => setShowPdfBuilder(!showPdfBuilder)}
              className="w-full justify-between h-10 text-sm font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-lg"
            >
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                PDF Checklist Generator
              </div>
              <ChevronDown className={cn("w-4 h-4 transition-transform", showPdfBuilder && "rotate-180")} />
            </Button>

            {showPdfBuilder && (
              <div className="mt-4 flex flex-row gap-6 items-start w-full" style={{ height: 'calc(100vh - 200px)' }}>
                {/* Left Panel - Configuration */}
                <div className="flex-1 min-w-[400px] h-full">
                  <Card className="flex flex-col h-full border-emerald-100 shadow-sm overflow-hidden flex-1 shrink-0">
                    <CardHeader className="pb-4 shrink-0">
                      <CardTitle className="text-base font-bold text-slate-800">Configuratie</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6 flex-1 overflow-y-auto min-h-0 custom-scrollbar pb-6 pr-4">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className="space-y-3 flex-1">
                            <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Pers Selecteren</Label>
                            <div className="flex flex-wrap gap-2">
                              {activePresses.filter(p => p.name && p.name.trim() !== '').map((press) => (
                                <Button
                                  key={press.id}
                                  variant={selectedPress === press.name ? "default" : "outline"}
                                  size="sm"
                                  onClick={() => {
                                    setSelectedPress(press.name as PressType);
                                    setSelectedTasks([]);
                                  }}
                                  className={cn(
                                    "rounded-full px-4 h-8 text-xs transition-all",
                                    selectedPress === press.name ? "bg-emerald-600 border-emerald-600 shadow-sm" : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                  )}
                                >
                                  {press.name}
                                </Button>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-3 min-w-[120px]">
                            <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Periode</Label>
                            <div className="flex gap-1.5 p-1 bg-slate-100 rounded-lg">
                              {['Dag', 'Week', 'Mnd'].map((p) => (
                                <button
                                  key={p}
                                  onClick={() => setSelectedPeriod(p === 'Dag' ? 'Vandaag' : p === 'Week' ? 'Deze Week' : 'Deze Maand')}
                                  className={cn(
                                    "px-2.5 py-1 text-[10px] font-bold rounded-md transition-all",
                                    (selectedPeriod === 'Vandaag' && p === 'Dag') ||
                                    (selectedPeriod === 'Deze Week' && p === 'Week') ||
                                    (selectedPeriod === 'Deze Maand' && p === 'Mnd')
                                      ? "bg-white text-emerald-600 shadow-sm"
                                      : "text-slate-500 hover:text-slate-700"
                                  )}
                                >
                                  {p}
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="supervisor-guidance" className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Instructies / Opmerkingen</Label>
                        <Textarea
                          id="supervisor-guidance"
                          placeholder="Voeg specifieke instructies, waarschuwingen of begeleiding toe voor de operator..."
                          value={supervisorGuidance}
                          onChange={(e) => setSupervisorGuidance(e.target.value)}
                          rows={2}
                          className="resize-none"
                        />
                      </div>

                      {selectedPress ? (
                        <div className="space-y-3 pt-4 border-t">
                          <div className="flex justify-between items-center mb-2">
                            <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Selecteer Taken</Label>
                            <Button
                              variant="outline"
                              onClick={handleAddAllOverdue}
                              className="gap-1.5 h-7 text-[10px] px-2 border-red-100 text-red-600 hover:bg-red-50"
                              title="Voeg alle taken toe waarvan de volgende datum in het verleden ligt."
                            >
                              <Clock className="w-3 h-3" />
                              Alle Achterstallige (+{allPressTasks.filter(isTaskOverdue).filter(t => !selectedTasks.includes(t.id)).length})
                            </Button>
                          </div>

                          <div className="border border-slate-200 rounded-lg overflow-hidden">
                            {allCategories.map((category, catIdx) => {
                              const categoryTasks = allTasksGrouped[category];
                              const overdueCount = categoryTasks.filter(isTaskOverdue).length;
                              const allSelectedInCategory = categoryTasks.every(t => selectedTasks.includes(t.id));
                              const someSelectedInCategory = categoryTasks.some(t => selectedTasks.includes(t.id)) && !allSelectedInCategory;

                              return (
                                <div key={category}>
                                  <div
                                    className={cn(
                                      "flex items-center justify-between px-3 py-1.5 bg-slate-50 cursor-pointer hover:bg-slate-100 transition-colors select-none",
                                      catIdx > 0 && "border-t border-slate-200"
                                    )}
                                    onClick={() => handleToggleCategory(category, !allSelectedInCategory)}
                                  >
                                    <div className="flex items-center gap-2">
                                      <Checkbox
                                        checked={allSelectedInCategory ? true : someSelectedInCategory ? "indeterminate" : false}
                                        onCheckedChange={(c) => { handleToggleCategory(category, c === true); }}
                                        onClick={(e) => e.stopPropagation()}
                                        className="data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                      />
                                      <span className="text-[11px] font-black text-slate-600 uppercase tracking-wider">{category}</span>
                                      <span className="text-[10px] text-slate-400 font-medium">{formatNumber(categoryTasks.length)}</span>
                                    </div>
                                    {overdueCount > 0 && (
                                      <Badge variant="outline" className="bg-red-50 text-red-600 border-transparent text-[9px] px-1.5 h-4 font-bold flex gap-1 items-center">
                                        {formatNumber(overdueCount)} te laat
                                      </Badge>
                                    )}
                                  </div>

                                  {categoryTasks.map((task) => {
                                    const isSelected = selectedTasks.includes(task.id);
                                    const overdue = isTaskOverdue(task);
                                    const subtext = task.subtaskName && task.subtaskName !== task.task
                                      ? task.subtaskSubtext || task.taskSubtext
                                      : task.taskSubtext;

                                    return (
                                      <div
                                        key={task.id}
                                        className={cn(
                                          "flex items-center gap-2.5 px-3 py-1.5 border-t border-slate-100 cursor-pointer transition-colors",
                                          isSelected ? "bg-emerald-50/60" : "hover:bg-slate-50/80"
                                        )}
                                        onClick={() => handleToggleTask(task.id, !isSelected)}
                                      >
                                        <Checkbox
                                          checked={isSelected}
                                          onCheckedChange={(checked) => handleToggleTask(task.id, Boolean(checked))}
                                          onClick={(e) => e.stopPropagation()}
                                          className="shrink-0 data-[state=checked]:bg-emerald-600 data-[state=checked]:border-emerald-600"
                                        />
                                        <div className="flex-1 min-w-0 flex items-center gap-2">
                                          <span className="text-xs font-medium text-slate-700 truncate">
                                            {task.subtaskName && task.subtaskName !== task.task
                                              ? `${task.task} → ${task.subtaskName}`
                                              : task.task}
                                          </span>
                                          {subtext && (
                                            <span className="text-[10px] text-emerald-600/70 italic truncate shrink-0 max-w-[120px]">{subtext}</span>
                                          )}
                                        </div>
                                        <div className={cn(
                                          "text-[10px] whitespace-nowrap font-medium shrink-0",
                                          overdue ? "text-red-500 font-bold" : "text-slate-400"
                                        )}>
                                          {overdue && <span className="mr-1 uppercase tracking-wider">!</span>}
                                          {formatDate(task.nextMaintenance)}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <div className="pt-4 flex flex-col items-center justify-center p-8 text-center border-t border-dashed h-40">
                          <Factory className="w-10 h-10 text-emerald-200 mb-3" />
                          <p className="text-sm font-medium text-slate-500">Selecteer een pers</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">Kies hierboven een pers om de bijbehorende taken te zien</p>
                        </div>
                      )}

                      <div className="pt-4 border-t mt-4">
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

                    <CardFooter className="flex flex-col gap-2 py-3 px-4 border-t bg-slate-50/50 shrink-0">
                      {selectedPress && checklistPdfTasks.length > 0 ? (
                        <PDFDownloadLink
                          document={
                            <ChecklistPDF
                              pressName={selectedPress}
                              tasks={checklistPdfTasks}
                              supervisorGuidance={supervisorGuidance}
                              categorySubtexts={pdfCategorySubtexts}
                              fontSize={fontSize}
                              marginH={marginH}
                              marginV={marginV}
                              selectedPeriod={selectedPeriod}
                            />
                          }
                          fileName={`checklist-${selectedPress.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`}
                          className="w-full"
                        >
                          {({ loading }) => (
                            <Button className="w-full h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold gap-2 shadow-md shadow-emerald-100 rounded-lg" disabled={loading}>
                              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                              {loading ? 'Document genereren...' : `Download PDF (${checklistPdfTasks.length} taken)`}
                            </Button>
                          )}
                        </PDFDownloadLink>
                      ) : (
                        <Button disabled className="w-full h-10 font-bold gap-2 rounded-lg">
                          <Download className="w-4 h-4" /> Download PDF
                        </Button>
                      )}
                    </CardFooter>
                  </Card>
                </div>

                {/* Right Panel - Live Preview */}
                <div className="h-full shrink-0 flex justify-center bg-transparent">
                  <div className="relative h-full bg-slate-100 rounded-xl border border-emerald-100 overflow-hidden shadow-sm flex items-center justify-center" style={{ aspectRatio: '1 / 1.414' }}>
                    {selectedPress && checklistPdfTasks.length > 0 ? (
                      <PDFViewer width="100%" height="100%" className="border-none">
                        <ChecklistPDF
                          pressName={selectedPress}
                          tasks={checklistPdfTasks}
                          supervisorGuidance={supervisorGuidance}
                          categorySubtexts={pdfCategorySubtexts}
                          fontSize={fontSize}
                          marginH={marginH}
                          marginV={marginV}
                          selectedPeriod={selectedPeriod}
                        />
                      </PDFViewer>
                    ) : (
                      <div className="text-center p-8">
                        <ClipboardCheck className="w-12 h-12 text-emerald-200 mx-auto mb-3" />
                        <p className="text-sm text-slate-500 font-medium">PDF Preview</p>
                        <p className="text-[10px] text-slate-400 mt-1">Selecteer een pers en minstens één taak</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </section>

        </div>
      </ScrollArea>
    </div>
  );
}