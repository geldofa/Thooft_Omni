import { useState, useMemo } from 'react';
import { GroupedTask, Subtask, MaintenanceTask } from './AuthContext';
import { useAuth } from './AuthContext';
import { QuickEditDialog } from './QuickEditDialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Edit, Trash2, Calendar, User, ChevronDown, ChevronRight, Plus } from 'lucide-react';
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


interface MaintenanceTableProps {
  tasks: GroupedTask[];
  onEdit: (task: MaintenanceTask) => void;
  onDelete: (id: string) => void;
  onUpdate: (task: MaintenanceTask) => Promise<void>;
  onEditGroup?: (group: GroupedTask) => void;
  onAddTask?: () => void;
  onUpdateTaskOrder?: (category: string, taskIds: string[]) => Promise<void>;
}

export function MaintenanceTable({ tasks, onEdit, onDelete, onUpdate, onEditGroup, onAddTask, onUpdateTaskOrder }: MaintenanceTableProps) {
  const { user, categoryOrder, categories } = useAuth();
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

  // Drag and drop sensors for tasks
  // Use distance activation constraint so clicks are not blocked




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

  const formatInterval = (interval: number, unit: 'days' | 'weeks' | 'months') => {
    const unitLabel = unit === 'days' ? 'dagen' : unit === 'weeks' ? 'weken' : 'maanden';
    return `${interval} ${unitLabel}`;
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
    } else if (daysUntil <= 7) {
      const label = daysUntil === 1 ? '1 Dag' : `${daysUntil} Dagen`;
      return { key: 'Binnenkort', label: label, color: 'bg-orange-50', textColor: 'text-orange-700', badgeClass: 'bg-orange-500 hover:bg-orange-600' };
    } else if (daysUntil <= 30) {
      const label = daysUntil === 1 ? '1 Dag' : `${daysUntil} Dagen`;
      return { key: 'Op komst', label: label, color: 'bg-yellow-50', textColor: 'text-yellow-700', badgeClass: 'bg-yellow-500 hover:bg-yellow-600' };
    } else {
      // Weeks calculation
      const weeks = Math.max(1, Math.round(daysUntil / 7));
      const label = weeks === 1 ? '1 Week' : `${weeks} Weken`;
      return { key: 'Gepland', label: label, color: '', textColor: '', badgeClass: 'bg-gray-200 hover:bg-gray-300 text-gray-700' };
    }
  };

  const toggleCategory = (categoryId: string) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(categoryId)) {
      newCollapsed.delete(categoryId);
    } else {
      newCollapsed.add(categoryId);
    }
    setCollapsedCategories(newCollapsed);
  };

  const toggleGroupedTask = (groupedTaskId: string) => {
    const newCollapsed = new Set(collapsedGroupedTasks);
    if (newCollapsed.has(groupedTaskId)) {
      newCollapsed.delete(groupedTaskId);
    } else {
      newCollapsed.add(groupedTaskId);
    }
    setCollapsedGroupedTasks(newCollapsed);
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
    className = "px-3 py-2 text-left text-gray-700"
  }: {
    label: string;
    sortKey: 'task' | 'lastMaintenance' | 'nextMaintenance' | 'status' | 'assignedTo';
    className?: string;
  }) => {
    const isActive = sortConfig?.key === sortKey;
    const isCenter = className.includes('text-center');

    return (
      <th className={className}>
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
    toggleGroupedTask: (id: string) => void;
    onEditGroup?: (group: GroupedTask) => void;
    handleDelete: (id: string, name: string) => void;
    getStatusInfo: (nextMaintenance: Date) => any;
    formatDate: (date: Date | null) => string;
    formatDateTime: (date: Date | null) => string;
    formatInterval: (interval: number, unit: 'days' | 'weeks' | 'months') => string;
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
    // Drag and drop logic removed for individual tasks

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
              colSpan={isGroupedTaskCollapsed ? 1 : (user?.role === 'admin' ? 8 : (user?.role === 'press' ? 6 : 7))}
              className="px-3 py-1.5"
            >
              <div className="flex items-start">
                {user?.role === 'admin' && (
                  <div className="w-6 flex-shrink-0 flex justify-center mt-1">
                    {/* Drag handle removed */}
                  </div>
                )}
                <div className="w-6 flex-shrink-0 flex justify-center mt-1">
                  <button
                    onClick={() => toggleGroupedTask(groupedTask.id)}
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
                    onClick={() => toggleGroupedTask(groupedTask.id)}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">{groupedTask.taskName}</span>
                      <Badge variant="secondary" className="ml-2">
                        {relevantSubtasks.length} subtaken
                      </Badge>
                    </div>
                    {groupedTask.taskSubtext && (
                      <div className="text-gray-500 text-xs mt-0.5">{groupedTask.taskSubtext}</div>
                    )}
                  </button>
                </div>
                {user?.role === 'admin' && !isGroupedTaskCollapsed && (
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
                <td className="px-3 py-1.5">
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
                <td className="px-3 py-1.5" colSpan={user?.role === 'admin' ? 2 : 1}>
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
                {user?.role === 'admin' && (
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

        {/* Single Task Row with Drag Handle */}
        {isSingleTask && sortedSubtasks.map((subtask) => {
          const statusInfo = getStatusInfo(subtask.nextMaintenance);
          const rowBgClass = statusInfo.label !== 'Scheduled' ? statusInfo.color : '';

          return (
            <tr
              key={subtask.id}
              className={`border-b border-gray-100 last:border-0 hover:bg-gray-50/50 ${rowBgClass}`}
            >
              <td className="px-3 py-1.5">
                <div className="flex items-start">
                  {user?.role === 'admin' && (
                    <div className="w-6 flex-shrink-0 flex justify-center mt-1">
                      {/* Drag handle removed */}
                    </div>
                  )}
                  {/* Spacer for Chevron alignment */}
                  <div className="w-6 flex-shrink-0"></div>

                  <div className="max-w-xs flex-1">
                    <div className="line-clamp-2">{subtask.subtaskName}</div>
                    {subtask.subtext && (
                      <div className="text-gray-500 text-xs line-clamp-1">{subtask.subtext}</div>
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
                <div className="max-w-xs">
                  {subtask.comment ? (
                    <>
                      <div className="line-clamp-2 text-gray-700">{subtask.comment}</div>
                      <div className="text-gray-400 text-xs mt-1">{formatDateTime(subtask.commentDate)}</div>
                    </>
                  ) : (
                    <div className="text-gray-400">-</div>
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

        {/* Subtasks Rows (for multi-task groups) */}
        {!isSingleTask && (!isGroupedTaskCollapsed) && sortedSubtasks.map((subtask) => {
          const statusInfo = getStatusInfo(subtask.nextMaintenance);
          const rowBgClass = statusInfo.label !== 'Scheduled' ? statusInfo.color : '';

          return (
            <tr key={subtask.id} className={`border-b border-gray-100 last:border-0 hover:bg-gray-50/50 ${rowBgClass}`}>
              <td className="px-3 py-1.5">
                <div className="flex items-start">
                  {user?.role === 'admin' && (
                    <div className="w-6 flex-shrink-0"></div>
                  )}
                  {/* Spacer for Chevron alignment */}
                  <div className="w-6 flex-shrink-0"></div>

                  <div className="max-w-xs flex-1">
                    <div className="line-clamp-2">{subtask.subtaskName}</div>
                    {subtask.subtext && (
                      <div className="text-gray-500 text-xs line-clamp-1">{subtask.subtext}</div>
                    )}
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
                <div className="max-w-xs">
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
    onToggle: (categoryId: string) => void;
    isCollapsed: boolean;
    user: any;
    categoryGroupedTasks: GroupedTask[];
    statusFilter: string | null;
    getStatusInfo: (nextMaintenance: Date) => any;

    getSortedTasks: (tasks: GroupedTask[]) => GroupedTask[];
    collapsedGroupedTasks: Set<string>;
    toggleGroupedTask: (id: string) => void;
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


    return (
      <div
        className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
      >
        {/* Category Header */}
        <div
          className="flex items-center px-3 py-2 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
          onClick={() => onToggle(categoryId)}
        >

          <div className="w-6 flex-shrink-0 flex justify-center">
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            )}
          </div>
          <div className="flex-1 flex items-center">
            <span className="text-gray-900 font-medium">{categoryName}</span>
            <Badge variant="secondary" className="ml-auto">
              {categoryGroupedTasks.flatMap(gt => gt.subtasks).filter(st => {
                const status = getStatusInfo(st.nextMaintenance).key;
                return !statusFilter || status === statusFilter;
              }).length}
            </Badge>
          </div>
        </div>

        {/* Tasks Table */}
        {!isCollapsed && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-gray-50/50 border-b border-gray-200">
                  <SortableColumnHeader
                    label="Taak / Subtaak"
                    sortKey="task"
                    className={`px-3 py-2 text-left text-gray-700 w-[26%] ${user?.role === 'admin' ? 'pl-[60px]' : 'pl-[36px]'}`}
                  />
                  <SortableColumnHeader
                    label="Laatst Onderhoud"
                    sortKey="lastMaintenance"
                    className="px-3 py-2 text-left text-gray-700 w-[10%]"
                  />
                  <SortableColumnHeader
                    label="Volgend Onderhoud"
                    sortKey="nextMaintenance"
                    className="px-3 py-2 text-left text-gray-700 w-[10%]"
                  />
                  {user?.role !== 'press' && (
                    <th className="px-3 py-2 text-left text-gray-700 w-[8%]">Interval</th>
                  )}
                  <SortableColumnHeader
                    label="Status"
                    sortKey="status"
                    className="px-3 py-2 text-center text-gray-700 w-[6]"
                  />
                  <SortableColumnHeader
                    label="Toegewezen aan"
                    sortKey="assignedTo"
                    className="px-3 py-2 text-left text-gray-700 w-[12%]"
                  />
                  <th className="px-3 py-2 text-left text-gray-700 w-[20%]">Opmerkingen</th>
                  {user?.role === 'admin' && (
                    <th className="px-3 py-2 text-right text-gray-700 w-[8%]">Acties</th>
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
        <h2 className="text-2xl font-bold text-gray-900">Onderhoudstaken</h2>
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
          {statusCounts['Binnenkort'] > 0 && (
            <Button
              variant={statusFilter === 'Binnenkort' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusFilter('Binnenkort')}
              className="gap-2"
            >
              <span className={statusFilter === 'Binnenkort' ? 'text-white' : 'text-orange-600'}>
                Binnenkort
              </span>
              <Badge variant={statusFilter === 'Binnenkort' ? 'secondary' : 'default'} className="bg-orange-500">
                {statusCounts['Binnenkort']}
              </Badge>
            </Button>
          )}
          {statusCounts['Op komst'] > 0 && (
            <Button
              variant={statusFilter === 'Op komst' ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleStatusFilter('Op komst')}
              className="gap-2"
            >
              <span className={statusFilter === 'Op komst' ? 'text-white' : 'text-yellow-600'}>
                Op komst
              </span>
              <Badge variant={statusFilter === 'Op komst' ? 'secondary' : 'default'} className="bg-yellow-500">
                {statusCounts['Op komst']}
              </Badge>
            </Button>
          )}
        </div>
        {onAddTask && (
          <Button onClick={onAddTask} size="sm" className="gap-2">
            <Plus className="w-4 h-4" />
            Taak Toevoegen
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
                onToggle={toggleCategory}
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
