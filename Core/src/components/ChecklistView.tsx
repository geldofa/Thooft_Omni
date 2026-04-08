import { useState, useMemo, useEffect, useCallback } from 'react';
import { GroupedTask, Subtask, MaintenanceTask, pb, Category, Tag } from './AuthContext';
import { useAuth } from './AuthContext';
import { QuickEditDialog } from './dialogs/QuickEditDialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Progress } from './ui/progress';
import {
  Calendar, User, ChevronDown, ChevronRight, CornerDownRight,
  ClipboardCheck, PartyPopper, CalendarRange, CheckCircle2, XCircle, Printer
} from 'lucide-react';
import { toast } from 'sonner';
import { formatNumber } from '../utils/formatNumber';
import { getStatusInfo } from '../utils/StatusUtils';
import { formatDisplayDate, formatDisplayDateTime } from '../utils/dateUtils';

interface ChecklistViewProps {
  checklist: any; // The active maintenance_checklist record
  groupedTasks: GroupedTask[];
  onTaskUpdated: (task: MaintenanceTask) => Promise<void>;
  onChecklistChanged?: () => void;
}

export function ChecklistView({ checklist, groupedTasks, onTaskUpdated, onChecklistChanged }: ChecklistViewProps) {
  const { user, hasPermission } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [collapsedGroupedTasks, setCollapsedGroupedTasks] = useState<Set<string>>(new Set());
  const [quickEditTask, setQuickEditTask] = useState<MaintenanceTask | null>(null);
  const [quickEditSiblings, setQuickEditSiblings] = useState<MaintenanceTask[]>([]);
  const [quickEditField, setQuickEditField] = useState<'lastMaintenance' | 'opmerkingen'>('lastMaintenance');

  const taskIds = useMemo(() => new Set<string>(checklist.task_ids || []), [checklist.task_ids]);
  const completedTaskIds = useMemo(() => new Set<string>(checklist.completed_task_ids || []), [checklist.completed_task_ids]);
  const startDate = useMemo(() => new Date(checklist.start_date), [checklist.start_date]);
  const endDate = useMemo(() => new Date(checklist.end_date), [checklist.end_date]);

  const totalTasks = checklist.task_ids?.length || 0;
  const completedCount = completedTaskIds.size;
  const progressPercent = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;
  const isFullyCompleted = totalTasks > 0 && completedCount >= totalTasks;

  // Check if checklist has expired
  const isExpired = useMemo(() => {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const end = new Date(endDate);
    end.setHours(0, 0, 0, 0);
    return now > end;
  }, [endDate]);

  // Auto-archive expired checklists
  useEffect(() => {
    if (isExpired && checklist.active) {
      const archiveChecklist = async () => {
        try {
          const taskIdsArr = checklist.task_ids || [];
          const completedArr = checklist.completed_task_ids || [];
          const incompleteIds = taskIdsArr.filter((id: string) => !completedArr.includes(id));

          await pb.collection('maintenance_checklists').update(checklist.id, {
            active: false,
            incomplete_task_ids: incompleteIds,
            completed_count: completedArr.length,
            summary: {
              archived_at: new Date().toISOString(),
              archived_by: 'system',
              reason: 'end_date_expired',
              total_tasks: taskIdsArr.length,
              completed: completedArr.length,
              incomplete: incompleteIds.length
            }
          });
          toast.info('Checklist periode is verlopen en is gearchiveerd.');
          onChecklistChanged?.();
        } catch (e) {
          console.error('Failed to auto-archive checklist:', e);
        }
      };
      archiveChecklist();
    }
  }, [isExpired, checklist, onChecklistChanged]);

  // Fetch categories and tags
  const fetchData = useCallback(async () => {
    try {
      const [catResult, tagResult] = await Promise.all([
        pb.collection('categorieen').getFullList(),
        pb.collection('tags').getFullList()
      ]);
      setCategories(catResult.map((r: any) => ({
        id: r.id,
        name: r.naam,
        pressIds: Array.isArray(r.pers_ids) ? r.pers_ids : [],
        active: r.active !== false,
        subtexts: typeof r.subtexts === 'object' ? r.subtexts : {}
      })));
      setTags(tagResult.map((r: any) => ({
        id: r.id,
        naam: r.naam,
        kleur: r.kleur,
        active: r.active !== false,
        system_managed: r.system_managed === true,
        highlights: r.highlights || []
      })));
    } catch (e) {
      console.error('Failed to fetch categories/tags in ChecklistView:', e);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Filter grouped tasks to only include checklist items that are NOT completed
  const checklistTasks = useMemo(() => {
    return groupedTasks
      .map(group => {
        if (group.isHighlightGroup) return null; // Skip highlight groups in checklist

        const filteredSubtasks = group.subtasks.filter(st =>
          taskIds.has(st.id) && !completedTaskIds.has(st.id)
        );

        if (filteredSubtasks.length === 0) return null;

        return { ...group, subtasks: filteredSubtasks };
      })
      .filter((g): g is GroupedTask => g !== null);
  }, [groupedTasks, taskIds, completedTaskIds]);

  // ALL checklist tasks (including completed) — for printing
  const allChecklistTasks = useMemo(() => {
    return groupedTasks
      .map(group => {
        if (group.isHighlightGroup) return null;

        const filteredSubtasks = group.subtasks.filter(st => taskIds.has(st.id));
        if (filteredSubtasks.length === 0) return null;

        return { ...group, subtasks: filteredSubtasks };
      })
      .filter((g): g is GroupedTask => g !== null);
  }, [groupedTasks, taskIds]);

  // Group ALL tasks by category for printing
  const allTasksByCategoryId = useMemo(() => {
    const grouped: Record<string, GroupedTask[]> = {};
    allChecklistTasks.forEach(gt => {
      if (!grouped[gt.categoryId]) grouped[gt.categoryId] = [];
      grouped[gt.categoryId].push(gt);
    });
    return grouped;
  }, [allChecklistTasks]);

  const allOrderedCategoryIds = useMemo(() => {
    return Object.keys(allTasksByCategoryId).sort((a, b) => {
      const nameA = categories.find(c => c.id === a)?.name || a;
      const nameB = categories.find(c => c.id === b)?.name || b;
      return nameA.localeCompare(nameB);
    });
  }, [allTasksByCategoryId, categories]);

  // Group by category
  const tasksByCategoryId = useMemo(() => {
    const grouped: Record<string, GroupedTask[]> = {};
    checklistTasks.forEach(gt => {
      if (!grouped[gt.categoryId]) grouped[gt.categoryId] = [];
      grouped[gt.categoryId].push(gt);
    });
    return grouped;
  }, [checklistTasks]);

  const orderedCategoryIds = useMemo(() => {
    return Object.keys(tasksByCategoryId).sort((a, b) => {
      const nameA = categories.find(c => c.id === a)?.name || a;
      const nameB = categories.find(c => c.id === b)?.name || b;
      return nameA.localeCompare(nameB);
    });
  }, [tasksByCategoryId, categories]);

  const toMaintenanceTask = (subtask: Subtask, group: GroupedTask): MaintenanceTask => ({
    id: subtask.id,
    task: group.taskName,
    subtaskName: subtask.subtaskName,
    taskSubtext: group.taskSubtext,
    subtaskSubtext: subtask.subtext,
    category: group.category,
    categoryId: group.categoryId,
    press: group.press,
    pressId: group.pressId,
    lastMaintenance: subtask.lastMaintenance,
    nextMaintenance: subtask.nextMaintenance,
    maintenanceInterval: subtask.maintenanceInterval,
    maintenanceIntervalUnit: subtask.maintenanceIntervalUnit,
    assignedTo: subtask.assignedTo,
    assignedToIds: subtask.assignedToIds || [],
    assignedToTypes: subtask.assignedToTypes || [],
    opmerkingen: subtask.comment,
    commentDate: subtask.commentDate,
    sort_order: subtask.sort_order || 0,
    isExternal: subtask.isExternal || false,
    comment: subtask.comment,
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    tagIds: subtask.tagIds || []
  });

  const formatDate = (date: Date | null) => formatDisplayDate(date);
  const formatDateTime = (date: Date | null) => formatDisplayDateTime(date);

  const formatInterval = (interval: number, unit: 'days' | 'weeks' | 'months' | 'years') => {
    if (unit === 'days') return `${interval} ${interval === 1 ? 'dag' : 'dagen'}`;
    if (unit === 'weeks') return `${interval} ${interval === 1 ? 'week' : 'weken'}`;
    if (unit === 'months') return `${interval} ${interval === 1 ? 'maand' : 'maanden'}`;
    if (unit === 'years') return `${interval} ${interval === 1 ? 'jaar' : 'jaren'}`;
    return `${interval} ${unit}`;
  };

  const toggleCategory = (categoryId: string) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(categoryId)) newCollapsed.delete(categoryId);
    else newCollapsed.add(categoryId);
    setCollapsedCategories(newCollapsed);
  };

  const toggleGroupedTask = (groupedTaskId: string) => {
    const newCollapsed = new Set(collapsedGroupedTasks);
    if (newCollapsed.has(groupedTaskId)) newCollapsed.delete(groupedTaskId);
    else newCollapsed.add(groupedTaskId);
    setCollapsedGroupedTasks(newCollapsed);
  };

  const handleQuickEdit = (subtask: Subtask, group: GroupedTask, field: 'lastMaintenance' | 'opmerkingen') => {
    setQuickEditTask(toMaintenanceTask(subtask, group));
    setQuickEditSiblings(group.subtasks.map(s => toMaintenanceTask(s, group)));
    setQuickEditField(field);
  };

  // Wrap task update to check for checklist completion
  const handleTaskUpdate = async (task: MaintenanceTask) => {
    await onTaskUpdated(task);

    // Check if this task should be marked as completed in the checklist
    if (taskIds.has(task.id) && task.lastMaintenance) {
      const lastDate = new Date(task.lastMaintenance);
      lastDate.setHours(0, 0, 0, 0);
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);

      if (lastDate >= start && !completedTaskIds.has(task.id)) {
        try {
          const newCompleted = [...(checklist.completed_task_ids || []), task.id];
          await pb.collection('maintenance_checklists').update(checklist.id, {
            completed_task_ids: newCompleted,
            completed_count: newCompleted.length
          });
          onChecklistChanged?.();
          toast.success('Taak voltooid in checklist!');
        } catch (e) {
          console.error('Failed to update checklist completion:', e);
        }
      }
    }
  };

  const handleDeactivateChecklist = async () => {
    try {
      const taskIdsArr = checklist.task_ids || [];
      const completedArr = checklist.completed_task_ids || [];
      const incompleteIds = taskIdsArr.filter((id: string) => !completedArr.includes(id));

      await pb.collection('maintenance_checklists').update(checklist.id, {
        active: false,
        incomplete_task_ids: incompleteIds,
        completed_count: completedArr.length,
        summary: {
          archived_at: new Date().toISOString(),
          archived_by: user?.name || user?.username || 'Onbekend',
          reason: 'manually_closed',
          total_tasks: taskIdsArr.length,
          completed: completedArr.length,
          incomplete: incompleteIds.length
        }
      });
      toast.success('Checklist gesloten en gearchiveerd.');
      onChecklistChanged?.();
    } catch (e: any) {
      console.error('Failed to deactivate checklist:', e);
      toast.error(`Sluiten mislukt: ${e.message}`);
    }
  };

  // ========== Print Checklist ==========
  const handlePrintChecklist = () => {
    // Build HTML rows for ALL tasks grouped by category
    let tableRows = '';
    allOrderedCategoryIds.forEach(categoryId => {
      const categoryName = categories.find(c => c.id === categoryId)?.name || 'Onbekend';
      const categoryGroupedTasks = allTasksByCategoryId[categoryId];
      const taskCount = categoryGroupedTasks.flatMap(gt => gt.subtasks).length;

      tableRows += `<tr class="cat-header"><td colspan="3"><strong>${categoryName}</strong> <span class="count">(${taskCount})</span></td></tr>`;

      categoryGroupedTasks.forEach(group => {
        const isSingleTask = group.subtasks.length === 1 && group.taskName === group.subtasks[0].subtaskName;

        if (!isSingleTask) {
          // Parent Task (Group Header)
          tableRows += `<tr class="group-header">
            <td colspan="3">
              <div class="task-row parent-row">
                <div class="check-placeholder"></div>
                <div class="text-content">
                  <strong>${group.taskName}</strong>
                </div>
              </div>
            </td>
          </tr>`;
        }

        group.subtasks.forEach(subtask => {
          const isCompleted = completedTaskIds.has(subtask.id);
          const cls = isCompleted ? 'completed' : '';
          const check = isCompleted ? '✓' : '☐';
          
          // Row indents: all icons align, but text for subtasks indents further
          const textIndent = isSingleTask ? '0px' : '20px';

          tableRows += `<tr class="${cls}">
            <td class="task-cell">
              <div class="task-row">
                <div class="check-box">
                  <span class="check">${check}</span>
                </div>
                <div class="text-content" style="padding-left: ${textIndent}">
                  <div class="task-name">${subtask.subtaskName}</div>
                  ${subtask.subtext ? `<div class="subtext">${subtask.subtext}</div>` : ''}
                </div>
              </div>
            </td>
            <td class="notes">${subtask.comment || '-'}</td>
            <td class="notities"></td>
          </tr>`;
        });
      });
    });

    const html = `<!DOCTYPE html>
<html>
<head>
  <title>Checklist — ${checklist.press_name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11px; color: #000; padding: 20px; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    .meta { font-size: 10px; color: #555; margin-bottom: 6px; }
    .summary { font-size: 11px; margin-bottom: 12px; padding: 8px; border: 1px solid #999; display: inline-block; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #eee; text-align: left; padding: 5px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.3px; border-bottom: 2px solid #000; }
    td { padding: 4px 8px; border-bottom: 1px solid #ddd; vertical-align: top; }
    
    tr.cat-header td { background: #e5e5e5; padding: 6px 8px; border-bottom: 1px solid #999; font-size: 12px; }
    tr.cat-header .count { font-weight: normal; color: #666; font-size: 10px; }
    
    tr.group-header td { background: #f5f5f5; font-size: 11px; padding: 4px 8px; border-bottom: 1px solid #ddd; }
    .parent-row { padding-left: 0px; }
    
    .task-row { display: flex; align-items: flex-start; padding-left: 0px; }
    .check-box { width: 24px; flex-shrink: 0; display: flex; justify-content: center; font-size: 13px; line-height: 1.1; }
    .check-placeholder { width: 24px; flex-shrink: 0; }
    .text-content { flex: 1; }
    
    tr.completed td { color: #999; }
    tr.completed .task-name { text-decoration: line-through; }
    tr.completed .check { text-decoration: none; font-weight: bold; }
    
    .check { font-weight: normal; }
    .task-name { font-weight: 500; font-size: 11px; line-height: 1.2; }
    .subtext { font-size: 9px; color: #777; font-style: italic; margin-top: 1px; }
    tr.completed .subtext { color: #bbb; }
    
    .notes { font-size: 10px; max-width: 200px; word-wrap: break-word; }
    .notities { min-width: 120px; border-left: 1px solid #ddd; }
    .footer { margin-top: 16px; font-size: 9px; color: #888; border-top: 1px solid #ccc; padding-top: 6px; }
    @media print {
      body { padding: 10px; }
      @page { margin: 10mm; }
    }
  </style>
</head>
<body>
  <h1>Checklist — ${checklist.press_name}</h1>
  <div class="meta">
    Periode: ${formatDate(startDate)} — ${formatDate(endDate)} &nbsp;|&nbsp;
    Aangemaakt door: ${checklist.created_by} &nbsp;|&nbsp;
    Afgedrukt: ${new Date().toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
  </div>
  <div class="summary">
    <strong>${completedCount}</strong> / <strong>${totalTasks}</strong> taken voltooid (${progressPercent}%)
  </div>
  <table>
    <thead>
      <tr>
        <th style="width:35%;">Taak</th>
        <th style="width:30%;">Opmerkingen</th>
        <th style="width:35%;">Notities</th>
      </tr>
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>
  <div class="footer">T'Hooft OMNI — Onderhoudstaken Checklist</div>
  <script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
    }
  };

  // ========== 100% Completion — Congratulations Page ==========
  if (isFullyCompleted && !isExpired) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-8 animate-in fade-in duration-700">
        <div className="relative mb-8">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-2xl shadow-emerald-200 animate-in zoom-in duration-500">
            <PartyPopper className="w-16 h-16 text-white" />
          </div>
          <div className="absolute -top-2 -right-2 w-10 h-10 rounded-full bg-yellow-400 flex items-center justify-center shadow-lg animate-bounce">
            <CheckCircle2 className="w-6 h-6 text-yellow-800" />
          </div>
        </div>

        <h1 className="text-4xl font-black text-emerald-800 mb-3">
          Alle taken voltooid!
        </h1>
        <p className="text-lg text-emerald-600 font-medium mb-2">
          {formatNumber(totalTasks)} {totalTasks === 1 ? 'taak' : 'taken'} succesvol afgerond voor {checklist.press_name}
        </p>
        <p className="text-sm text-slate-500 mb-8">
          Checklist periode: {formatDate(startDate)} — {formatDate(endDate)}
        </p>

        <div className="flex items-center gap-3 mb-8">
          <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 text-sm px-4 py-1.5 font-bold">
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            100% Voltooid
          </Badge>
          <Badge variant="outline" className="text-slate-500 text-sm px-4 py-1.5">
            <CalendarRange className="w-4 h-4 mr-1.5" />
            Actief tot {formatDate(endDate)}
          </Badge>
        </div>

        <p className="text-xs text-slate-400 max-w-md">
          Deze pagina blijft zichtbaar tot de einddatum ({formatDate(endDate)}) verstrijkt.
          Daarna wordt de checklist automatisch gearchiveerd.
        </p>

        {hasPermission('checklist_view') && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeactivateChecklist}
            className="mt-6 text-slate-500 hover:text-red-600 hover:border-red-200"
          >
            <XCircle className="w-4 h-4 mr-1.5" />
            Checklist Sluiten
          </Button>
        )}
      </div>
    );
  }

  // ========== Main Checklist View ==========
  return (
    <>
      {/* Header */}
      <div className="space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md shadow-emerald-100">
              <ClipboardCheck className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Checklist — {checklist.press_name}</h2>
              <div className="flex items-center gap-2 text-xs text-slate-500">
                <CalendarRange className="w-3.5 h-3.5" />
                {formatDate(startDate)} — {formatDate(endDate)}
                <span className="text-slate-300">•</span>
                Aangemaakt door {checklist.created_by}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-2xl font-black text-emerald-600">{progressPercent}%</div>
              <div className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                {formatNumber(completedCount)} / {formatNumber(totalTasks)} taken
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrintChecklist}
              className="text-slate-600 hover:text-slate-900 hover:border-slate-400 h-8 text-xs"
            >
              <Printer className="w-3.5 h-3.5 mr-1" />
              Printen
            </Button>
            {hasPermission('checklist_view') && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleDeactivateChecklist}
                className="text-slate-500 hover:text-red-600 hover:border-red-200 h-8 text-xs"
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                Sluiten
              </Button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="space-y-1">
          <Progress value={progressPercent} className="h-2.5 bg-slate-100" />
          <div className="flex justify-between text-[10px] text-slate-400 font-medium">
            <span>{formatNumber(totalTasks - completedCount)} nog te doen</span>
            <span>{formatNumber(completedCount)} voltooid</span>
          </div>
        </div>
      </div>

      {/* Task Table */}
      <div className="space-y-4">
        {orderedCategoryIds.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center text-gray-500">
            Alle taken in deze checklist zijn voltooid of er zijn geen taken gevonden.
          </div>
        ) : (
          <div className="space-y-4">
            {orderedCategoryIds.map(categoryId => {
              const categoryName = categories.find(c => c.id === categoryId)?.name || 'Onbekend';
              const categoryGroupedTasks = tasksByCategoryId[categoryId];
              const filteredCount = categoryGroupedTasks.flatMap(gt => gt.subtasks).length;
              const isCollapsed = collapsedCategories.has(categoryId);

              return (
                <div key={categoryId} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                  {/* Category Header */}
                  <div
                    className="flex items-center px-3 py-2 border-b cursor-pointer transition-colors bg-gray-50 border-gray-200 hover:bg-gray-100"
                    onClick={() => toggleCategory(categoryId)}
                  >
                    <div className="w-6 flex-shrink-0 flex justify-center">
                      {isCollapsed ? <ChevronRight className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
                    </div>
                    <div className="flex-1 flex items-center gap-2">
                      <span className="font-medium text-base text-gray-900">{categoryName}</span>
                      <Badge variant="secondary" className="ml-auto">{filteredCount}</Badge>
                    </div>
                  </div>

                  {/* Tasks Table */}
                  {!isCollapsed && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <thead>
                          <tr className="bg-gray-50/50 border-b border-gray-200">
                            <th className="px-3 py-2 text-left text-gray-700" style={{ width: '35%', paddingLeft: '36px' }}>Taak / Subtaak</th>
                            <th className="px-3 py-2 text-left text-gray-700" style={{ width: '10%' }}>Laatst Onderhoud</th>
                            <th className="px-3 py-2 text-left text-gray-700" style={{ width: '10%' }}>Volgend Onderhoud</th>
                            {user?.role !== 'press' && (
                              <th className="px-3 py-2 text-left text-gray-700" style={{ width: '8%' }}>Interval</th>
                            )}
                            <th className="px-3 py-2 text-center text-gray-700" style={{ width: '8%' }}>Status</th>
                            <th className="px-3 py-2 text-left text-gray-700" style={{ width: '12%' }}>Uitgevoerd door</th>
                            <th className="px-3 py-2 text-left text-gray-700" style={{ width: '25%' }}>Opmerkingen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {categoryGroupedTasks.map(groupedTask => {
                            const isSingleTask = groupedTask.subtasks.length === 1 &&
                              groupedTask.taskName === groupedTask.subtasks[0].subtaskName;
                            const isGroupCollapsed = collapsedGroupedTasks.has(groupedTask.id);

                            return (
                              <ChecklistTaskRows
                                key={groupedTask.id}
                                groupedTask={groupedTask}
                                isSingleTask={isSingleTask}
                                isGroupCollapsed={isGroupCollapsed}
                                toggleGroupedTask={toggleGroupedTask}
                                handleQuickEdit={handleQuickEdit}
                                formatDate={formatDate}
                                formatDateTime={formatDateTime}
                                formatInterval={formatInterval}
                                tags={tags}
                                user={user}
                              />
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <QuickEditDialog
        open={!!quickEditTask}
        onOpenChange={(open) => {
          if (!open) {
            setQuickEditTask(null);
            setQuickEditSiblings([]);
          }
        }}
        task={quickEditTask}
        siblingTasks={quickEditSiblings}
        field={quickEditField}
        onSave={handleTaskUpdate}
      />
    </>
  );
}

// ========== Sub-component for task rows ==========
interface ChecklistTaskRowsProps {
  groupedTask: GroupedTask;
  isSingleTask: boolean;
  isGroupCollapsed: boolean;
  toggleGroupedTask: (id: string) => void;
  handleQuickEdit: (subtask: Subtask, group: GroupedTask, field: 'lastMaintenance' | 'opmerkingen') => void;
  formatDate: (date: Date | null) => string;
  formatDateTime: (date: Date | null) => string;
  formatInterval: (interval: number, unit: 'days' | 'weeks' | 'months' | 'years') => string;
  tags: Tag[];
  user: any;
}

function ChecklistTaskRows({
  groupedTask,
  isSingleTask,
  isGroupCollapsed,
  toggleGroupedTask,
  handleQuickEdit,
  formatDate,
  formatDateTime,
  formatInterval,
  tags,
  user
}: ChecklistTaskRowsProps) {
  const { hasPermission } = useAuth();
  const subtasks = groupedTask.subtasks;

  return (
    <>
      {/* Group Header (only for multi-task groups) */}
      {!isSingleTask && (
        <tr className="bg-gray-50 border-b border-gray-100">
          <td colSpan={isGroupCollapsed ? 1 : 7} className="px-3 py-1.5">
            <div className="flex items-start">
              {hasPermission('tasks_edit') && (
                <div className="w-6 flex-shrink-0"></div>
              )}
              <div className="w-6 flex-shrink-0 flex justify-center mt-1">
                <button onClick={() => toggleGroupedTask(groupedTask.id)} className="text-gray-500 hover:text-gray-700">
                  {isGroupCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
              </div>
              <div className="flex-1">
                <button className="text-left w-full" onClick={() => toggleGroupedTask(groupedTask.id)}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-gray-900">{groupedTask.taskName}</span>
                    <Badge variant="secondary" className="ml-2">{formatNumber(subtasks.length)} subtaken</Badge>
                  </div>
                  {groupedTask.taskSubtext && <div className="text-gray-500 text-xs mt-0.5">{groupedTask.taskSubtext}</div>}
                </button>
              </div>
            </div>
          </td>
          {isGroupCollapsed && subtasks[0] && (
            <>
              <td className="px-3 py-1.5 cursor-pointer" onClick={() => handleQuickEdit(subtasks[0], groupedTask, 'lastMaintenance')}>
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  <span>{formatDate(subtasks[0].lastMaintenance)}</span>
                </div>
              </td>
              <td className="px-3 py-1.5">
                <div className="flex items-center gap-2 text-gray-600">
                  <Calendar className="w-4 h-4" />
                  {formatDate(subtasks[0].nextMaintenance)}
                </div>
              </td>
              {user?.role !== 'press' && (
                <td className="px-3 py-1.5">
                  <span className="text-gray-600">{formatInterval(subtasks[0].maintenanceInterval, subtasks[0].maintenanceIntervalUnit)}</span>
                </td>
              )}
              <td className="px-3 py-1.5 text-center">
                {(() => { const si = getStatusInfo(subtasks[0].nextMaintenance); return <Badge className={si.badgeClass}>{si.label}</Badge>; })()}
              </td>
              <td className="px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span>{subtasks[0].assignedTo}</span>
                </div>
              </td>
              <td className="px-3 py-1.5">
                {subtasks[0].comment ? (
                  <div className="text-xs">
                    <span className="text-gray-700">{subtasks[0].comment}</span>
                    <span className="text-gray-400 ml-1">({formatDateTime(subtasks[0].commentDate)})</span>
                  </div>
                ) : <div className="text-gray-400 italic">-</div>}
              </td>
            </>
          )}
        </tr>
      )}

      {/* Individual subtask rows */}
      {(isSingleTask || !isGroupCollapsed) && subtasks.map(subtask => {
        const statusInfo = getStatusInfo(subtask.nextMaintenance);
        const rowBgClass = statusInfo.label !== 'Scheduled' ? statusInfo.color : '';

        return (
          <tr key={subtask.id} className={`border-b border-gray-100 last:border-0 hover:bg-gray-50/50 ${rowBgClass}`}>
            <td className="px-3 py-1.5">
              <div className="flex items-start">
                {!isSingleTask && (
                  <>
                    {hasPermission('tasks_edit') && (
                      <div className="w-6 flex-shrink-0"></div>
                    )}
                    <div className="w-6 flex-shrink-0"></div>
                    <div className="flex-1 flex items-start">
                      <div className="w-6 flex-shrink-0 flex justify-center mt-1 pr-1">
                        <CornerDownRight size={15} className="text-gray-400" strokeWidth={1.5} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <div className="text-gray-700 leading-snug">{subtask.subtaskName}</div>
                          {Array.isArray(subtask.tagIds) && subtask.tagIds.map((tagId: string) => {
                            const tag = tags?.find(t => t.id === tagId);
                            return (
                              <Badge key={tagId} style={{ backgroundColor: tag?.kleur || '#3b82f6' }} className="text-[10px] px-1.5 py-0.5 h-auto text-white border-none shadow-sm">
                                {tag?.naam || 'Onbekend'}
                              </Badge>
                            );
                          })}
                        </div>
                        {subtask.subtext && <div className="text-gray-400 text-[10px] leading-tight italic">{subtask.subtext}</div>}
                      </div>
                    </div>
                  </>
                )}
                {isSingleTask && (
                  <div className="flex-1 flex items-start">
                    {hasPermission('tasks_edit') && (
                      <div className="w-6 flex-shrink-0"></div>
                    )}
                    <div className="w-5 flex-shrink-0 flex justify-center mt-1 mr-1"></div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {subtask.subtaskName}
                        {Array.isArray(subtask.tagIds) && subtask.tagIds.map((tagId: string) => {
                          const tag = tags?.find(t => t.id === tagId);
                          return (
                            <Badge key={tagId} style={{ backgroundColor: tag?.kleur || '#3b82f6' }} className="text-[10px] px-1.5 py-0.5 h-auto text-white border-none shadow-sm">
                              {tag?.naam || 'Onbekend'}
                            </Badge>
                          );
                        })}
                      </div>
                      {subtask.subtext && <div className="text-gray-500 text-xs">{subtask.subtext}</div>}
                    </div>
                  </div>
                )}
              </div>
            </td>
            <td className="px-3 py-1.5 cursor-pointer" onClick={() => handleQuickEdit(subtask, groupedTask, 'lastMaintenance')}>
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(subtask.lastMaintenance)}</span>
              </div>
            </td>
            <td className="px-3 py-1.5">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                {formatDate(subtask.nextMaintenance)}
              </div>
            </td>
            {user?.role !== 'press' && (
              <td className="px-3 py-1.5">
                <span className="text-gray-600">{formatInterval(subtask.maintenanceInterval, subtask.maintenanceIntervalUnit)}</span>
              </td>
            )}
            <td className="px-3 py-1.5 text-center">
              <Badge className={statusInfo.badgeClass}>{statusInfo.label}</Badge>
            </td>
            <td className="px-3 py-1.5">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span>{subtask.assignedTo}</span>
              </div>
            </td>
            <td className="px-3 py-1.5 cursor-pointer" onClick={() => handleQuickEdit(subtask, groupedTask, 'opmerkingen')}>
              {subtask.comment ? (
                <div>
                  <div className="text-gray-700 mt-0.5">
                    <span className="line-clamp-2">{subtask.comment}</span>
                    <span className="text-gray-400 text-xs ml-1">({formatDateTime(subtask.commentDate)})</span>
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 mt-0.5">-</div>
              )}
            </td>
          </tr>
        );
      })}
    </>
  );
}
