import { useState, useMemo } from 'react';
import { GroupedTask, Subtask, MaintenanceTask } from './AuthContext';
import { useAuth } from './AuthContext';
import { QuickEditDialog } from './QuickEditDialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Edit, Trash2, Calendar, User, ChevronDown, ChevronRight, Plus, CornerDownRight } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from './ui/alert-dialog';
import { toast } from 'sonner';
import { formatNumber } from '../utils/formatNumber';

// --- CONFIGURATION CONSTANTS ---
// EDIT THESE TO CHANGE LAYOUT AND TYPOGRAPHY FROM ONE PLACE
const COL_WIDTHS = {
  task: '35%',
  lastMaintenance: '5%',
  nextMaintenance: '5%',
  interval: '6%',
  status: '6%',
  assigned: '12%',
  remarks: '30%',
  actions: '8%'
};

const FONT_SIZES = {
  title: 'text-2xl',      // Main page titles
  section: 'text-base',   // Category headers
  body: 'text-sm',        // Table rows and general text
  label: 'text-xs',       // Smaller metadata / subtext
};


interface MaintenanceTableProps {
  tasks: GroupedTask[];
  onEdit: (task: MaintenanceTask) => void;
  onDelete: (id: string) => void;
  onUpdate: (task: MaintenanceTask) => Promise<void>;
  onEditGroup?: (group: GroupedTask) => void;
  onAddTask?: () => void;
}

// --- HELPER INTERFACES ---
interface SortableColumnHeaderProps {
  label: string;
  sortKey: 'task' | 'lastMaintenance' | 'nextMaintenance' | 'status' | 'assignedTo';
  className?: string;
  style?: React.CSSProperties;
}

export function MaintenanceTable({ tasks, onEdit, onDelete, onUpdate, onEditGroup, onAddTask }: MaintenanceTableProps) {
  const { user, categoryOrder, categories, tags, hasPermission } = useAuth();
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [collapsedGroupedTasks, setCollapsedGroupedTasks] = useState<Set<string>>(new Set());
  const [quickEditTask, setQuickEditTask] = useState<MaintenanceTask | null>(null);
  const [quickEditSiblings, setQuickEditSiblings] = useState<MaintenanceTask[]>([]);
  const [quickEditField, setQuickEditField] = useState<'lastMaintenance' | 'opmerkingen'>('lastMaintenance');
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: 'task' | 'lastMaintenance' | 'nextMaintenance' | 'status' | 'assignedTo' | null;
    direction: 'asc' | 'desc';
  } | null>(null);

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
    opmerkingen: subtask.comment,
    commentDate: subtask.commentDate,
    sort_order: subtask.sort_order || 0,
    isExternal: subtask.isExternal || false,
    comment: subtask.comment,
    created: new Date().toISOString(),
    updated: new Date().toISOString()
  });

  const formatDate = (date: Date | null) => {
    if (!date) return 'N.v.t.';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  const formatDateTime = (date: Date | null) => {
    if (!date) return 'N.v.t.';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day} ${hours}:${minutes}`;
  };

  const formatInterval = (interval: number, unit: 'days' | 'weeks' | 'months' | 'years') => {
    if (unit === 'days') return `${interval} ${interval === 1 ? 'dag' : 'dagen'}`;
    if (unit === 'weeks') return `${interval} ${interval === 1 ? 'week' : 'weken'}`;
    if (unit === 'months') return `${interval} ${interval === 1 ? 'maand' : 'maanden'}`;
    if (unit === 'years') return `${interval} ${interval === 1 ? 'jaar' : 'jaren'}`;
    return `${interval} ${unit}`;
  };


  const getStatusInfo = (nextMaintenance: Date) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today
    const next = new Date(nextMaintenance);
    next.setHours(0, 0, 0, 0); // Normalize target

    const diffTime = next.getTime() - today.getTime();
    const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) {
      return { key: 'Te laat', label: '!!!', color: 'bg-red-50', textColor: 'text-red-700', badgeClass: 'bg-red-500 hover:bg-red-600' };
    } else if (daysUntil === 0) {
      return { key: 'Deze Week', label: 'Vandaag!!', color: 'bg-orange-50', textColor: 'text-orange-700', badgeClass: 'bg-orange-500 hover:bg-orange-600' };
    } else if (daysUntil === 1) {
      return { key: 'Deze Week', label: 'Morgen!', color: 'bg-orange-50', textColor: 'text-orange-700', badgeClass: 'bg-orange-500 hover:bg-orange-600' };
    } else if (daysUntil <= 7) {
      return { key: 'Deze Week', label: `${daysUntil} Dagen`, color: 'bg-orange-50', textColor: 'text-orange-700', badgeClass: 'bg-orange-500 hover:bg-orange-600' };
    } else if (daysUntil <= 30) {
      return { key: 'Deze Maand', label: `${daysUntil} Dagen`, color: 'bg-yellow-50', textColor: 'text-yellow-700', badgeClass: 'bg-yellow-500 hover:bg-yellow-600' };
    } else {
      // Weeks calculation
      const weeks = Math.round(daysUntil / 7);
      if (weeks > 7) {
        const months = Math.round(daysUntil / 30.4375); // Average month length
        const label = months <= 1 ? '1 Maand' : `${months} Maanden`;
        return { key: 'Gepland', label: label, color: '', textColor: '', badgeClass: 'bg-gray-200 hover:bg-gray-300 text-gray-700' };
      }
      const label = weeks === 1 ? '1 Week' : `${weeks} Weken`;
      return { key: 'Gepland', label: label, color: '', textColor: '', badgeClass: 'bg-gray-200 hover:bg-gray-300 text-gray-700' };
    }
  };

  const toggleCategory = (categoryId: string, e?: React.MouseEvent) => {
    // Record click position relative to viewport if needed, or simply let the browser handle it
    // But since elements change size, we should target the clicked element
    const target = e?.currentTarget as HTMLElement;

    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(categoryId)) {
      newCollapsed.delete(categoryId);
    } else {
      newCollapsed.add(categoryId);
    }
    setCollapsedCategories(newCollapsed);

    // After state update and re-render, scroll back to target
    if (target) {
      setTimeout(() => {
        target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 0);
    }
  };

  const toggleGroupedTask = (groupedTaskId: string, e?: React.MouseEvent) => {
    const target = e?.currentTarget as HTMLElement;

    const newCollapsed = new Set(collapsedGroupedTasks);
    if (newCollapsed.has(groupedTaskId)) {
      newCollapsed.delete(groupedTaskId);
    } else {
      newCollapsed.add(groupedTaskId);
    }
    setCollapsedGroupedTasks(newCollapsed);

    if (target) {
      setTimeout(() => {
        target.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }, 0);
    }
  };

  const handleQuickEdit = (subtask: Subtask, group: GroupedTask, field: 'lastMaintenance' | 'opmerkingen') => {
    setQuickEditTask(toMaintenanceTask(subtask, group));
    // Store all sibling tasks from the same group
    setQuickEditSiblings(group.subtasks.map(s => toMaintenanceTask(s, group)));
    setQuickEditField(field);
  };

  const handleDelete = (id: string, name: string) => {
    onDelete(id);
    toast.success(`${name} succesvol verwijderd`);
  };

  // Flatten subtasks for status filtering and counting
  const allSubtasks: Subtask[] = tasks.flatMap(group => group.subtasks);

  // Count subtasks by status
  const statusCounts = allSubtasks.reduce((acc, subtask) => {
    const status = getStatusInfo(subtask.nextMaintenance).key;
    if (status !== 'Gepland') {
      acc[status] = (acc[status] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Group GroupedTasks by category ID
  const groupedTasksByCategoryId = tasks.reduce((acc, groupedTask) => {
    if (!acc[groupedTask.categoryId]) {
      acc[groupedTask.categoryId] = [];
    }
    acc[groupedTask.categoryId].push(groupedTask);
    return acc;
  }, {} as Record<string, GroupedTask[]>);

  // Sort categories by the custom order (IDs)
  const orderedCategoryIds = useMemo(() => {
    const categoryIdsWithTasks = Object.keys(groupedTasksByCategoryId);
    if (!categoryOrder || categoryOrder.length === 0) {
      // Fallback: Sort by Name if we can resolve it, else ID
      return categoryIdsWithTasks.sort((a, b) => {
        const nameA = categories.find(c => c.id === a)?.name || a;
        const nameB = categories.find(c => c.id === b)?.name || b;
        return nameA.localeCompare(nameB);
      });
    }

    // Map Order ID -> Index
    const idToIndex = new Map<string, number>();
    categoryOrder.forEach((id, index) => idToIndex.set(id, index));

    return categoryIdsWithTasks.sort((idA, idB) => {
      const indexA = idToIndex.has(idA) ? idToIndex.get(idA)! : 99999;
      const indexB = idToIndex.has(idB) ? idToIndex.get(idB)! : 99999;

      if (indexA !== indexB) return indexA - indexB;

      // Fallback to Name sort
      const nameA = categories.find(c => c.id === idA)?.name || idA;
      const nameB = categories.find(c => c.id === idB)?.name || idB;
      return nameA.localeCompare(nameB);
    });
  }, [categoryOrder, groupedTasksByCategoryId, categories]);

  const handleStatusFilter = (status: string) => {
    setStatusFilter(statusFilter === status ? null : status);
  };

  // Sorting functions
  const handleSort = (key: 'task' | 'lastMaintenance' | 'nextMaintenance' | 'status' | 'assignedTo') => {
    if (sortConfig?.key === key) {
      // Toggle: asc -> desc -> null (back to custom order)
      if (sortConfig.direction === 'asc') {
        setSortConfig({ key, direction: 'desc' });
      } else {
        setSortConfig(null); // Reset to custom order
      }
    } else {
      setSortConfig({ key, direction: 'asc' });
    }
  };

  const getSortedTasks = (tasks: GroupedTask[]): GroupedTask[] => {
    if (!sortConfig) return tasks; // Return original order if no sort

    return [...tasks].sort((a, b) => {
      let aValue: any;
      let bValue: any;

      // Get the first subtask for comparison (or use group-level data)
      const aSubtask = a.subtasks[0];
      const bSubtask = b.subtasks[0];

      switch (sortConfig.key) {
        case 'task':
          aValue = a.taskName.toLowerCase();
          bValue = b.taskName.toLowerCase();
          break;
        case 'lastMaintenance':
          aValue = aSubtask?.lastMaintenance ? new Date(aSubtask.lastMaintenance).getTime() : 0;
          bValue = bSubtask?.lastMaintenance ? new Date(bSubtask.lastMaintenance).getTime() : 0;
          break;
        case 'nextMaintenance':
          aValue = aSubtask?.nextMaintenance ? new Date(aSubtask.nextMaintenance).getTime() : 0;
          bValue = bSubtask?.nextMaintenance ? new Date(bSubtask.nextMaintenance).getTime() : 0;
          break;
        case 'status':
          aValue = getStatusInfo(aSubtask?.nextMaintenance).key;
          bValue = getStatusInfo(bSubtask?.nextMaintenance).key;
          break;
        case 'assignedTo':
          aValue = aSubtask?.assignedTo?.toLowerCase() || '';
          bValue = bSubtask?.assignedTo?.toLowerCase() || '';
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  };

  const SortableColumnHeader = ({
    label,
    sortKey,
    className = "px-3 py-2 text-left text-gray-700",
    style
  }: SortableColumnHeaderProps) => {
    const isActive = sortConfig?.key === sortKey;
    const isCenter = className.includes('text-center');

    return (
      <th className={className} style={style}>
        <button
          onClick={() => handleSort(sortKey)}
          className={`flex items-center gap-1 hover:text-gray-900 transition-colors w-full ${isCenter ? 'justify-center' : ''}`}
        >
          <span>{label}</span>
          {isActive && (
            <span className="text-xs text-blue-600">
              {sortConfig.direction === 'asc' ? '↑' : '↓'}
            </span>
          )}
        </button>
      </th>
    );
  };

  // Sortable Task Group Component
  interface SortableTaskGroupProps {
    groupedTask: GroupedTask;
    isSingleTask: boolean;
    isGroupedTaskCollapsed: boolean;
    relevantSubtasks: Subtask[];
    user: any;
    toggleGroupedTask: (id: string, e?: React.MouseEvent) => void;
    onEditGroup?: (group: GroupedTask) => void;
    handleDelete: (id: string, name: string) => void;
    getStatusInfo: (nextMaintenance: Date) => any;
    formatDate: (date: Date | null) => string;
    formatDateTime: (date: Date | null) => string;
    formatInterval: (interval: number, unit: 'days' | 'weeks' | 'months' | 'years') => string;
    handleQuickEdit: (subtask: Subtask, group: GroupedTask, field: 'lastMaintenance' | 'opmerkingen') => void;
    toMaintenanceTask: (subtask: Subtask, group: GroupedTask) => MaintenanceTask;
    onEdit: (task: MaintenanceTask) => void;
    sortConfig: {
      key: 'task' | 'lastMaintenance' | 'nextMaintenance' | 'status' | 'assignedTo' | null;
      direction: 'asc' | 'desc';
    } | null;
  }

  function TaskGroupRow({
    groupedTask,
    isSingleTask,
    isGroupedTaskCollapsed,
    relevantSubtasks,
    user,
    toggleGroupedTask,
    onEditGroup,
    handleDelete,
    getStatusInfo,
    formatDate,
    formatDateTime,
    formatInterval,
    handleQuickEdit,
    toMaintenanceTask,
    onEdit,
    sortConfig,
  }: SortableTaskGroupProps) {

    // Sort subtasks if sortConfig is present
    const sortedSubtasks = useMemo(() => {
      if (!sortConfig) return relevantSubtasks;

      return [...relevantSubtasks].sort((a, b) => {
        let aValue: any;
        let bValue: any;

        switch (sortConfig.key) {
          case 'task':
            aValue = a.subtaskName.toLowerCase();
            bValue = b.subtaskName.toLowerCase();
            break;
          case 'lastMaintenance':
            aValue = a.lastMaintenance ? new Date(a.lastMaintenance).getTime() : 0;
            bValue = b.lastMaintenance ? new Date(b.lastMaintenance).getTime() : 0;
            break;
          case 'nextMaintenance':
            aValue = a.nextMaintenance ? new Date(a.nextMaintenance).getTime() : 0;
            bValue = b.nextMaintenance ? new Date(b.nextMaintenance).getTime() : 0;
            break;
          case 'status':
            aValue = getStatusInfo(a.nextMaintenance).key;
            bValue = getStatusInfo(b.nextMaintenance).key;
            break;
          case 'assignedTo':
            aValue = a.assignedTo?.toLowerCase() || '';
            bValue = b.assignedTo?.toLowerCase() || '';
            break;
          default:
            return 0;
        }

        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }, [relevantSubtasks, sortConfig, getStatusInfo]);

    // Find earliest subtask for summary view
    const earliestSubtask = useMemo(() => {
      if (relevantSubtasks.length === 0) return null;
      return relevantSubtasks.reduce((prev, curr) => {
        if (!prev.nextMaintenance) return curr;
        if (!curr.nextMaintenance) return prev;
        return new Date(prev.nextMaintenance) < new Date(curr.nextMaintenance) ? prev : curr;
      });
    }, [relevantSubtasks]);

    const summaryStatusInfo = earliestSubtask ? getStatusInfo(earliestSubtask.nextMaintenance) : null;
    const summaryRowBgClass = summaryStatusInfo && summaryStatusInfo.key !== 'Gepland' ? summaryStatusInfo.color : '';

    return (
      <>
        {/* Group Header (only for multi-task groups) */}
        {!isSingleTask && (
          <tr
            className={`bg-gray-50 border-b border-gray-100 ${isGroupedTaskCollapsed && summaryRowBgClass ? summaryRowBgClass : ''}`}
          >
            <td
              colSpan={isGroupedTaskCollapsed ? 1 : (hasPermission('tasks_edit') ? 8 : (user?.role === 'press' ? 6 : 7))}
              className="px-3 py-1.5"
            >
              <div className="flex items-start">
                {hasPermission('tasks_edit') && (
                  <div className="w-6 flex-shrink-0 flex justify-center mt-1">
                    {/* Spacer for Drag Handle space */}
                  </div>
                )}
                <div className="w-6 flex-shrink-0 flex justify-center mt-1">
                  <button
                    onClick={(e) => toggleGroupedTask(groupedTask.id, e)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    {isGroupedTaskCollapsed ? (
                      <ChevronRight className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <div className="flex-1">
                  <button
                    className="text-left w-full"
                    onClick={(e) => toggleGroupedTask(groupedTask.id, e)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{groupedTask.taskName}</span>
                      <Badge variant="secondary" className="ml-2">
                        {formatNumber(relevantSubtasks.length)} subtaken
                      </Badge>
                      {relevantSubtasks.some(st => st.isExternal) && (
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0.5 h-auto border-blue-400 bg-blue-100 text-blue-800 font-bold shadow-sm">EXTERNE</Badge>
                      )}
                    </div>
                    {groupedTask.taskSubtext && (
                      <div className="text-gray-500 text-xs mt-0.5">{groupedTask.taskSubtext}</div>
                    )}
                  </button>
                </div>
                {hasPermission('tasks_edit') && !isGroupedTaskCollapsed && (
                  <div className="flex items-center gap-1 ml-auto">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); onEditGroup?.(groupedTask); }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Groep verwijderen</AlertDialogTitle>
                          <AlertDialogDescription>
                            Weet je zeker dat je "{groupedTask.taskName}" en alle subtaken wilt verwijderen?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuleren</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(groupedTask.id, groupedTask.taskName)}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            Verwijderen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                )}
              </div>
            </td>

            {/* Summary Columns (Only when collapsed) */}
            {isGroupedTaskCollapsed && earliestSubtask && (
              <>
                <td
                  className="px-3 py-1.5 cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); handleQuickEdit(earliestSubtask, groupedTask, 'lastMaintenance'); }}
                >
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(earliestSubtask.lastMaintenance)}</span>
                  </div>
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4" />
                    {formatDate(earliestSubtask.nextMaintenance)}
                  </div>
                </td>
                {user?.role !== 'press' && (
                  <td className="px-3 py-1.5">
                    <span className="text-gray-600">{formatInterval(earliestSubtask.maintenanceInterval, earliestSubtask.maintenanceIntervalUnit)}</span>
                  </td>
                )}
                <td className="px-3 py-1.5 text-center">
                  {summaryStatusInfo && (
                    <Badge className={summaryStatusInfo.badgeClass}>{summaryStatusInfo.label}</Badge>
                  )}
                </td>
                <td className="px-3 py-1.5">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span>{earliestSubtask.assignedTo}</span>
                  </div>
                </td>
                <td className="px-3 py-1.5">
                  <div className="space-y-1">
                    {relevantSubtasks.filter(st => st.comment).map(st => (
                      <div key={st.id} className="text-xs">
                        <span className="text-gray-700">{st.comment}</span>
                        <span className="text-gray-400 ml-1">({formatDateTime(st.commentDate)})</span>
                      </div>
                    ))}
                    {relevantSubtasks.every(st => !st.comment) && (
                      <div className="text-gray-400 italic">-</div>
                    )}
                  </div>
                </td>
                {hasPermission('tasks_edit') && (
                  <td className="px-3 py-1.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => { e.stopPropagation(); onEditGroup?.(groupedTask); }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Groep verwijderen</AlertDialogTitle>
                            <AlertDialogDescription>
                              Weet je zeker dat je "{groupedTask.taskName}" en alle subtaken wilt verwijderen?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Annuleren</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(groupedTask.id, groupedTask.taskName)}
                              className="bg-red-500 hover:bg-red-600"
                            >
                              Verwijderen
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </td>
                )}
              </>
            )}
          </tr>
        )}

        {/* Single Task Row */}
        {isSingleTask && sortedSubtasks.map((subtask) => {
          const statusInfo = getStatusInfo(subtask.nextMaintenance);
          const rowBgClass = statusInfo.label !== 'Scheduled' ? statusInfo.color : '';

          return (
            <tr
              key={subtask.id}
              className={`border-b border-gray-100 last:border-0 hover:bg-gray-50/50 ${rowBgClass} ${subtask.isExternal ? 'bg-blue-50/40' : ''}`}
            >
              <td className="px-3 py-1.5">
                <div className="flex items-start">
                  {hasPermission('tasks_edit') && (
                    <div className="w-6 flex-shrink-0 flex justify-center mt-1">
                      {/* Spacer */}
                    </div>
                  )}
                  <div className="w-6 flex-shrink-0"></div>

                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <div className="">{subtask.subtaskName}</div>
                      {Array.isArray(subtask.tagIds) && subtask.tagIds.map((tagId: string) => {
                        const tag = tags?.find((t: any) => t.id === tagId);
                        return (
                          <Badge
                            key={tagId}
                            style={{ backgroundColor: tag?.kleur || '#3b82f6' }}
                            className="text-[10px] px-1.5 py-0.5 h-auto text-white border-none shadow-sm"
                          >
                            {tag?.naam || 'Onbekend'}
                          </Badge>
                        );
                      })}
                    </div>
                    {subtask.subtext && (
                      <div className="text-gray-500 text-xs">{subtask.subtext}</div>
                    )}
                  </div>
                </div>
              </td>
              <td
                className="px-3 py-1.5 cursor-pointer"
                style={{ pointerEvents: 'auto' }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickEdit(subtask, groupedTask, 'lastMaintenance');
                }}
              >
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
              <td
                className="px-3 py-1.5 cursor-pointer"
                style={{ pointerEvents: 'auto' }}
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickEdit(subtask, groupedTask, 'opmerkingen');
                }}
              >
                <div className="">
                  {subtask.comment ? (
                    <>
                      <div className="text-gray-700">{subtask.comment}</div>
                      <div className="text-gray-400 text-xs mt-1">{formatDateTime(subtask.commentDate)}</div>
                    </>
                  ) : (
                    <div className="text-gray-400">-</div>
                  )}
                </div>
              </td>
              {hasPermission('tasks_edit') && (
                <td className="px-3 py-1.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); onEdit(toMaintenanceTask(subtask, groupedTask)); }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Subtaak verwijderen</AlertDialogTitle>
                          <AlertDialogDescription>
                            Weet je zeker dat je "{subtask.subtaskName}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuleren</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(subtask.id, subtask.subtaskName)}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            Verwijderen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              )}
            </tr>
          );
        })}

        {/* Subtasks Rows (for multi-task groups) */}
        {!isSingleTask && (!isGroupedTaskCollapsed) && sortedSubtasks.map((subtask) => {
          const statusInfo = getStatusInfo(subtask.nextMaintenance);
          const rowBgClass = statusInfo.label !== 'Scheduled' ? statusInfo.color : '';

          return (
            <tr key={subtask.id} className={`border-b border-gray-100 last:border-0 hover:bg-gray-50/50 ${rowBgClass} ${subtask.isExternal ? 'bg-blue-50/40' : ''}`}>
              <td className="px-3 py-1.5">
                <div className="flex items-start">
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
                          const tag = tags?.find((t: any) => t.id === tagId);
                          return (
                            <Badge
                              key={tagId}
                              style={{ backgroundColor: tag?.kleur || '#3b82f6' }}
                              className="text-[10px] px-1.5 py-0.5 h-auto text-white border-none shadow-sm"
                            >
                              {tag?.naam || 'Onbekend'}
                            </Badge>
                          );
                        })}
                      </div>
                      {subtask.subtext && (
                        <div className="text-gray-400 text-[10px] leading-tight italic">{subtask.subtext}</div>
                      )}
                    </div>
                  </div>
                </div>
              </td>
              <td
                className="px-3 py-1.5 cursor-pointer"
                style={{ pointerEvents: 'auto' }}
                onClick={(e) => { e.stopPropagation(); handleQuickEdit(subtask, groupedTask, 'lastMaintenance'); }}
              >
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
              <td
                className="px-3 py-1.5 cursor-pointer"
                style={{ pointerEvents: 'auto' }}
                onClick={(e) => { e.stopPropagation(); handleQuickEdit(subtask, groupedTask, 'opmerkingen'); }}
              >
                <div className="">
                  {subtask.comment ? (
                    <div className="text-gray-700 mt-0.5">
                      <span className="line-clamp-2">{subtask.comment}</span>
                      <span className="text-gray-400 text-xs ml-1">({formatDateTime(subtask.commentDate)})</span>
                    </div>
                  ) : (
                    <div className="text-gray-400 mt-0.5">-</div>
                  )}
                </div>
              </td>
              {user?.role === 'admin' && (
                <td className="px-3 py-1.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => { e.stopPropagation(); onEdit(toMaintenanceTask(subtask, groupedTask)); }}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="sm" onClick={(e) => e.stopPropagation()}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Subtaak verwijderen</AlertDialogTitle>
                          <AlertDialogDescription>
                            Weet je zeker dat je "{subtask.subtaskName}" wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Annuleren</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(subtask.id, subtask.subtaskName)}
                            className="bg-red-500 hover:bg-red-600"
                          >
                            Verwijderen
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </td>
              )}
            </tr>
          );
        })}
      </>
    );
  }

  interface CategorySectionProps {
    categoryId: string;
    categoryName: string;
    onToggle: (categoryId: string, e?: React.MouseEvent) => void;
    isCollapsed: boolean;
    user: any;
    pressId: string | null;  // [NEW]
    categoryGroupedTasks: GroupedTask[];
    statusFilter: string | null;
    getStatusInfo: (nextMaintenance: Date) => any;
    getSortedTasks: (tasks: GroupedTask[]) => GroupedTask[];
    collapsedGroupedTasks: Set<string>;
    toggleGroupedTask: (id: string, e?: React.MouseEvent) => void;
    onEditGroup?: (group: GroupedTask) => void;
    handleDelete: (id: string, name: string) => void;
    formatDate: (date: Date | null) => string;
    formatDateTime: (date: Date | null) => string;
    formatInterval: (interval: number, unit: any) => string;
    handleQuickEdit: (subtask: Subtask, group: GroupedTask, field: any) => void;
    toMaintenanceTask: (subtask: Subtask, group: GroupedTask) => MaintenanceTask;
    onEdit: (task: MaintenanceTask) => void;
    sortConfig: any;
  }

  function CategorySection({
    categoryId,
    categoryName,
    onToggle,
    isCollapsed,
    user,
    pressId, // [NEW]
    categoryGroupedTasks,
    statusFilter,
    getStatusInfo,
    getSortedTasks,
    collapsedGroupedTasks,
    toggleGroupedTask,
    onEditGroup,
    handleDelete,
    formatDate,
    formatDateTime,
    formatInterval,
    handleQuickEdit,
    toMaintenanceTask,
    onEdit,
    sortConfig,
  }: CategorySectionProps) {

    const filteredCount = categoryGroupedTasks.flatMap(gt => gt.subtasks).filter(st => {
      const status = getStatusInfo(st.nextMaintenance).key;
      return !statusFilter || status === statusFilter;
    }).length;

    const showAsCollapsed = isCollapsed || (statusFilter && filteredCount === 0);

    return (
      <div
        className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
      >
        {/* Category Header */}
        <div
          className="flex items-center px-3 py-2 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={(e) => onToggle(categoryId, e)}
        >

          <div className="w-6 flex-shrink-0 flex justify-center">
            {showAsCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </div>
          <div className="flex-1 flex items-center">
            <span className={`text-gray-900 font-medium ${FONT_SIZES.section}`}>{categoryName}</span>
            {/* [NEW] Subtext Rendering */}
            {pressId && categories.find(c => c.id === categoryId)?.subtexts?.[pressId] && (
              <span className="ml-3 text-gray-500 text-sm font-normal italic">
                {categories.find(c => c.id === categoryId)?.subtexts?.[pressId]}
              </span>
            )}
            <Badge variant="secondary" className="ml-auto">
              {filteredCount}
            </Badge>
          </div>
        </div>

        {/* Tasks Table */}
        {!showAsCollapsed && (
          <div className="overflow-x-auto">
            <table className={`w-full text-left ${FONT_SIZES.body}`}>
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-200">
                  <SortableColumnHeader
                    label="Taak / Subtaak"
                    sortKey="task"
                    className={`px-3 py-2 text-left text-gray-700`}
                    style={{ width: COL_WIDTHS.task, paddingLeft: hasPermission('tasks_edit') ? '60px' : '36px' }}
                  />
                  <SortableColumnHeader
                    label="Laatst Onderhoud"
                    sortKey="lastMaintenance"
                    className="px-3 py-2 text-left text-gray-700"
                    style={{ width: COL_WIDTHS.lastMaintenance }}
                  />
                  <SortableColumnHeader
                    label="Volgend Onderhoud"
                    sortKey="nextMaintenance"
                    className="px-3 py-2 text-left text-gray-700"
                    style={{ width: COL_WIDTHS.nextMaintenance }}
                  />
                  {user?.role !== 'press' && (
                    <th className="px-3 py-2 text-left text-gray-700" style={{ width: COL_WIDTHS.interval }}>Interval</th>
                  )}
                  <SortableColumnHeader
                    label="Status"
                    sortKey="status"
                    className="px-3 py-2 text-center text-gray-700"
                    style={{ width: COL_WIDTHS.status }}
                  />
                  <SortableColumnHeader
                    label="Toegewezen aan"
                    sortKey="assignedTo"
                    className="px-3 py-2 text-left text-gray-700"
                    style={{ width: COL_WIDTHS.assigned }}
                  />
                  <th className="px-3 py-2 text-left text-gray-700" style={{ width: COL_WIDTHS.remarks }}>Opmerkingen</th>
                  {hasPermission('tasks_edit') && (
                    <th className="px-3 py-2 text-right text-gray-700" style={{ width: COL_WIDTHS.actions }}>Acties</th>
                  )}
                </tr>
              </thead>
              <tbody>
                {getSortedTasks(categoryGroupedTasks).map((groupedTask) => {
                  const relevantSubtasks = groupedTask.subtasks.filter(subtask => {
                    if (!statusFilter) return true;
                    const status = getStatusInfo(subtask.nextMaintenance).key;
                    return status === statusFilter;
                  });

                  if (relevantSubtasks.length === 0) return null;

                  const isSingleTask = groupedTask.subtasks.length === 1;
                  const isGroupedTaskCollapsed = collapsedGroupedTasks.has(groupedTask.id);

                  return (
                    <TaskGroupRow
                      key={groupedTask.id}
                      groupedTask={groupedTask}
                      isSingleTask={isSingleTask}
                      isGroupedTaskCollapsed={isGroupedTaskCollapsed}
                      relevantSubtasks={relevantSubtasks}
                      user={user}
                      toggleGroupedTask={toggleGroupedTask}
                      onEditGroup={onEditGroup}
                      handleDelete={handleDelete}
                      getStatusInfo={getStatusInfo}
                      formatDate={formatDate}
                      formatDateTime={formatDateTime}
                      formatInterval={formatInterval}
                      handleQuickEdit={handleQuickEdit}
                      toMaintenanceTask={toMaintenanceTask}
                      onEdit={onEdit}
                      sortConfig={sortConfig}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }


  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h2 className={`${FONT_SIZES.title} font-bold text-gray-900`}>Onderhoudstaken</h2>
        <div className="flex items-center gap-2">
          {/* Status Filter Buttons */}
          {statusCounts['Te laat'] > 0 && (
            <Button
              variant={statusFilter === 'Te laat' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusFilter('Te laat')}
              className="gap-2"
            >
              <span className={statusFilter === 'Te laat' ? 'text-white' : 'text-red-600'}>
                Te laat
              </span>
              <Badge variant={statusFilter === 'Te laat' ? 'secondary' : 'default'} className="bg-red-500">
                {statusCounts['Te laat']}
              </Badge>
            </Button>
          )}
          {statusCounts['Deze Week'] > 0 && (
            <Button
              variant={statusFilter === 'Deze Week' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusFilter('Deze Week')}
              className="gap-2"
            >
              <span className={statusFilter === 'Deze Week' ? 'text-white' : 'text-orange-600'}>
                Deze Week
              </span>
              <Badge variant={statusFilter === 'Deze Week' ? 'secondary' : 'default'} className="bg-orange-500">
                {statusCounts['Deze Week']}
              </Badge>
            </Button>
          )}
          {statusCounts['Deze Maand'] > 0 && (
            <Button
              variant={statusFilter === 'Deze Maand' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusFilter('Deze Maand')}
              className="gap-2"
            >
              <span className={statusFilter === 'Deze Maand' ? 'text-white' : 'text-yellow-600'}>
                Deze Maand
              </span>
              <Badge variant={statusFilter === 'Deze Maand' ? 'secondary' : 'default'} className="bg-yellow-500">
                {statusCounts['Deze Maand']}
              </Badge>
            </Button>
          )}
        </div>
        {onAddTask && (
          <Button
            onClick={onAddTask}
            className="bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-100 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nieuwe Taak Toevoegen
          </Button>
        )}
      </div>

      <div className="space-y-4">
        {orderedCategoryIds.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center text-gray-500">
            Geen onderhoudstaken gevonden. Voeg uw eerste taak toe om aan de slag te gaan.
          </div>
        ) : (
          <div className="space-y-4">
            {orderedCategoryIds.map((categoryId) => (
              <CategorySection
                key={categoryId}
                categoryId={categoryId}
                categoryName={categories.find(c => c.id === categoryId)?.name || 'Unknown Category'}
                pressId={tasks.length > 0 ? tasks[0].pressId : null} // [NEW] Pass derived PressID
                onToggle={(id, e) => toggleCategory(id, e)}
                isCollapsed={collapsedCategories.has(categoryId)}
                user={user}
                categoryGroupedTasks={groupedTasksByCategoryId[categoryId]}
                statusFilter={statusFilter}
                getStatusInfo={getStatusInfo}
                getSortedTasks={getSortedTasks}
                collapsedGroupedTasks={collapsedGroupedTasks}
                toggleGroupedTask={toggleGroupedTask}
                onEditGroup={onEditGroup}
                handleDelete={handleDelete}
                formatDate={formatDate}
                formatDateTime={formatDateTime}
                formatInterval={formatInterval}
                handleQuickEdit={handleQuickEdit}
                toMaintenanceTask={toMaintenanceTask}
                onEdit={onEdit}
                sortConfig={sortConfig}
              />
            ))}
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
        onSave={onUpdate}
      />
    </>
  );
}
