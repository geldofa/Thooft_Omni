import React, { useState, useMemo } from 'react';
import { GroupedTask, Subtask, MaintenanceTask } from './AuthContext';
import { useAuth } from './AuthContext';
import { QuickEditDialog } from './QuickEditDialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Edit, Trash2, Calendar, User, ChevronDown, ChevronRight, GripVertical, Plus } from 'lucide-react';
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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  const { user, categoryOrder, updateCategoryOrder } = useAuth();
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const [collapsedGroupedTasks, setCollapsedGroupedTasks] = useState<Set<string>>(new Set());
  const [quickEditTask, setQuickEditTask] = useState<MaintenanceTask | null>(null);
  const [quickEditSiblings, setQuickEditSiblings] = useState<MaintenanceTask[]>([]);
  const [quickEditField, setQuickEditField] = useState<'lastMaintenance' | 'opmerkingen'>('lastMaintenance');
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<{
    key: 'task' | 'lastMaintenance' | 'nextMaintenance' | 'status' | 'assignedTo' | null;
    direction: 'asc' | 'desc';
  } | null>(null);

  // Drag and drop sensors for tasks
  const taskSensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const toMaintenanceTask = (subtask: Subtask, group: GroupedTask): MaintenanceTask => ({
    id: subtask.id,
    task: subtask.subtaskName,
    taskSubtext: subtask.subtext,
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
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };

  const formatInterval = (interval: number, unit: 'days' | 'weeks' | 'months') => {
    const unitLabel = unit === 'days' ? 'dagen' : unit === 'weeks' ? 'weken' : 'maanden';
    return `${interval} ${unitLabel}`;
  };

  const getStatusInfo = (nextMaintenance: Date) => {
    const today = new Date();
    const next = new Date(nextMaintenance);
    const daysUntil = Math.ceil((next.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) {
      return { label: 'Te laat', color: 'bg-red-50', textColor: 'text-red-700', badgeClass: 'bg-red-500 hover:bg-red-600' };
    } else if (daysUntil <= 7) {
      return { label: 'Binnenkort', color: 'bg-orange-50', textColor: 'text-orange-700', badgeClass: 'bg-orange-500 hover:bg-orange-600' };
    } else if (daysUntil <= 30) {
      return { label: 'Op komst', color: 'bg-yellow-50', textColor: 'text-yellow-700', badgeClass: 'bg-yellow-500 hover:bg-yellow-600' };
    } else {
      return { label: 'Gepland', color: '', textColor: '', badgeClass: 'bg-gray-200 hover:bg-gray-300 text-gray-700' };
    }
  };

  const toggleCategory = (category: string) => {
    const newCollapsed = new Set(collapsedCategories);
    if (newCollapsed.has(category)) {
      newCollapsed.delete(category);
    } else {
      newCollapsed.add(category);
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

  const handleDragStart = (category: string) => {
    setDraggedCategory(category);
  };

  const handleDragOver = (e: React.DragEvent, category: string) => {
    e.preventDefault();
    if (draggedCategory && draggedCategory !== category) {
      const newOrder = [...categoryOrder];
      const draggedIndex = newOrder.indexOf(draggedCategory);
      const targetIndex = newOrder.indexOf(category);

      newOrder.splice(draggedIndex, 1);
      newOrder.splice(targetIndex, 0, draggedCategory);

      updateCategoryOrder(newOrder);
    }
  };

  const handleDragEnd = () => {
    setDraggedCategory(null);
  };

  const handleTaskDragEnd = async (event: DragEndEvent, category: string) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const categoryTasks = groupedTasksByCategory[category];
      const oldIndex = categoryTasks.findIndex((task) => task.id === active.id);
      const newIndex = categoryTasks.findIndex((task) => task.id === over.id);

      const reorderedTasks = arrayMove(categoryTasks, oldIndex, newIndex);
      const taskIds = reorderedTasks.map(task => task.id);

      // Update order in backend if callback provided
      if (onUpdateTaskOrder) {
        try {
          await onUpdateTaskOrder(category, taskIds);
          toast.success('Taakvolgorde bijgewerkt');
        } catch (error) {
          toast.error('Bijwerken van taakvolgorde mislukt');
        }
      }
    }
  };

  // Flatten subtasks for status filtering and counting
  const allSubtasks: Subtask[] = tasks.flatMap(group => group.subtasks);



  // Count subtasks by status
  const statusCounts = allSubtasks.reduce((acc, subtask) => {
    const status = getStatusInfo(subtask.nextMaintenance).label;
    if (status !== 'Gepland') {
      acc[status] = (acc[status] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  // Group GroupedTasks by category
  const groupedTasksByCategory = tasks.reduce((acc, groupedTask) => {
    if (!acc[groupedTask.category]) {
      acc[groupedTask.category] = [];
    }
    acc[groupedTask.category].push(groupedTask);
    return acc;
  }, {} as Record<string, GroupedTask[]>);

  // Sort categories by the custom order
  const orderedCategories = useMemo(() => {
    const categoriesWithTasks = Object.keys(groupedTasksByCategory);
    if (!categoryOrder || categoryOrder.length === 0) {
      return categoriesWithTasks.sort();
    }
    // Start with items in categoryOrder that actually have tasks
    const ordered = categoryOrder.filter(cat => groupedTasksByCategory[cat]?.length > 0);
    // Add any categories that have tasks but are NOT in categoryOrder
    const remaining = categoriesWithTasks.filter(cat => !categoryOrder.includes(cat));
    return [...ordered, ...remaining];
  }, [categoryOrder, groupedTasksByCategory]);

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
          aValue = getStatusInfo(aSubtask?.nextMaintenance).label;
          bValue = getStatusInfo(bSubtask?.nextMaintenance).label;
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

    return (
      <th className={className}>
        <button
          onClick={() => handleSort(sortKey)}
          className="flex items-center gap-1 hover:text-gray-900 transition-colors w-full"
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

  function SortableTaskGroup({
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
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
      isDragging,
    } = useSortable({ id: groupedTask.id });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
      opacity: isDragging ? 0.8 : 1,
    };

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
            aValue = getStatusInfo(a.nextMaintenance).label;
            bValue = getStatusInfo(b.nextMaintenance).label;
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
    const summaryRowBgClass = summaryStatusInfo && summaryStatusInfo.label !== 'Gepland' ? summaryStatusInfo.color : '';

    return (
      <>
        {/* Group Header (only for multi-task groups) */}
        {!isSingleTask && (
          <tr
            ref={setNodeRef}
            style={style}
            className={`bg-gray-50 border-b border-gray-100 ${isGroupedTaskCollapsed && summaryRowBgClass ? summaryRowBgClass : ''}`}
          >
            <td
              colSpan={isGroupedTaskCollapsed ? 1 : (user?.role === 'admin' ? 8 : (user?.role === 'press' ? 6 : 7))}
              className="px-3 py-1.5"
            >
              <div className="flex items-start">
                {user?.role === 'admin' && (
                  <div className="w-6 flex-shrink-0 flex justify-center mt-1">
                    <button
                      type="button"
                      className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none"
                      {...attributes}
                      {...listeners}
                    >
                      <GripVertical className="h-4 w-4" />
                    </button>
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
                <td className="px-3 py-1.5">
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
                        <span className="font-semibold text-gray-700">{st.subtaskName}:</span> {st.comment}
                        <span className="text-gray-400 ml-1">({formatDateTime(st.commentDate)})</span>
                      </div>
                    ))}
                    {relevantSubtasks.every(st => !st.comment) && (
                      <div className="text-gray-400 italic">Klik om toe te voegen...</div>
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
              ref={setNodeRef}
              style={style}
              className={`border-b border-gray-100 last:border-0 hover:bg-gray-50/50 ${rowBgClass}`}
            >
              <td className="px-3 py-1.5">
                <div className="flex items-start">
                  {user?.role === 'admin' && (
                    <div className="w-6 flex-shrink-0 flex justify-center mt-1">
                      <button
                        type="button"
                        className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none"
                        {...attributes}
                        {...listeners}
                      >
                        <GripVertical className="h-4 w-4" />
                      </button>
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
                className="px-3 py-1.5 cursor-pointer hover:bg-gray-100/50 transition-colors"
                onClick={() => handleQuickEdit(subtask, groupedTask, 'lastMaintenance')}
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
              <td className="px-3 py-1.5">
                <Badge className={statusInfo.badgeClass}>{statusInfo.label}</Badge>
              </td>
              <td className="px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span>{subtask.assignedTo}</span>
                </div>
              </td>
              <td
                className="px-3 py-1.5 cursor-pointer hover:bg-gray-100/50 transition-colors"
                onClick={() => handleQuickEdit(subtask, groupedTask, 'opmerkingen')}
              >
                <div className="max-w-xs">
                  <div className="text-gray-600">
                    <span className="font-semibold">{subtask.subtaskName}</span>
                    {subtask.subtext && <span className="text-gray-400 text-xs ml-1">({subtask.subtext})</span>}
                  </div>
                  <div className="line-clamp-2 text-gray-700 mt-0.5">{subtask.comment || 'Klik om toe te voegen...'}</div>
                  {subtask.commentDate && (
                    <div className="text-gray-400 text-xs mt-1">{formatDateTime(subtask.commentDate)}</div>
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
                className="px-3 py-1.5 cursor-pointer hover:bg-gray-100/50 transition-colors"
                onClick={() => handleQuickEdit(subtask, groupedTask, 'lastMaintenance')}
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
              <td className="px-3 py-1.5">
                <Badge className={statusInfo.badgeClass}>{statusInfo.label}</Badge>
              </td>
              <td className="px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span>{subtask.assignedTo}</span>
                </div>
              </td>
              <td
                className="px-3 py-1.5 cursor-pointer hover:bg-gray-100/50 transition-colors"
                onClick={() => handleQuickEdit(subtask, groupedTask, 'opmerkingen')}
              >
                <div className="max-w-xs">
                  <div className="text-gray-600">
                    <span className="font-semibold">{subtask.subtaskName}</span>
                    {subtask.subtext && <span className="text-gray-400 text-xs ml-1">({subtask.subtext})</span>}
                  </div>
                  <div className="line-clamp-2 text-gray-700 mt-0.5">{subtask.comment || 'Klik om toe te voegen...'}</div>
                  {subtask.commentDate && (
                    <div className="text-gray-400 text-xs mt-1">{formatDateTime(subtask.commentDate)}</div>
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

      <div className="space-y-3">
        {orderedCategories.length === 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center text-gray-500">
            Geen onderhoudstaken gevonden. Voeg uw eerste taak toe om aan de slag te gaan.
          </div>
        ) : (
          orderedCategories.map((category) => {
            const categoryGroupedTasks = groupedTasksByCategory[category];
            const isCategoryCollapsed = collapsedCategories.has(category);

            return (
              <div key={category} className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                {/* Category Header */}
                <div
                  className="flex items-center px-3 py-2 bg-gray-50 border-b border-gray-200 cursor-pointer hover:bg-gray-100 transition-colors"
                  onClick={() => toggleCategory(category)}
                  draggable={user?.role === 'admin'}
                  onDragStart={() => handleDragStart(category)}
                  onDragOver={(e) => handleDragOver(e, category)}
                  onDragEnd={handleDragEnd}
                >
                  {user?.role === 'admin' && (
                    <div className="w-6 flex-shrink-0 flex justify-center">
                      <GripVertical className="w-4 h-4 text-gray-400 cursor-grab active:cursor-grabbing" />
                    </div>
                  )}
                  <div className="w-6 flex-shrink-0 flex justify-center">
                    {isCategoryCollapsed ? (
                      <ChevronRight className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </div>
                  <div className="flex-1 flex items-center">
                    <span className="text-gray-900 font-medium">{category}</span>
                    <Badge variant="secondary" className="ml-auto">
                      {categoryGroupedTasks.flatMap(gt => gt.subtasks).filter(st => {
                        const status = getStatusInfo(st.nextMaintenance).label;
                        return !statusFilter || status === statusFilter;
                      }).length}
                    </Badge>
                  </div>
                </div>

                {/* Tasks Table */}
                {!isCategoryCollapsed && (
                  <div className="overflow-x-auto">
                    <DndContext
                      sensors={taskSensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => handleTaskDragEnd(e, category)}
                    >
                      <SortableContext
                        items={getSortedTasks(categoryGroupedTasks).map(task => task.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        <table className="w-full text-sm text-left">
                          <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-200">
                              <SortableColumnHeader
                                label="Taak / Subtaak"
                                sortKey="task"
                                className={`px-3 py-2 text-left text-gray-700 w-[20%] ${user?.role === 'admin' ? 'pl-[60px]' : 'pl-[36px]'}`}
                              />
                              <SortableColumnHeader
                                label="Laatst Onderhoud"
                                sortKey="lastMaintenance"
                                className="px-3 py-2 text-left text-gray-700 w-[12%]"
                              />
                              <SortableColumnHeader
                                label="Volgend Onderhoud"
                                sortKey="nextMaintenance"
                                className="px-3 py-2 text-left text-gray-700 w-[12%]"
                              />
                              {user?.role !== 'press' && (
                                <th className="px-3 py-2 text-left text-gray-700 w-[8%]">Interval</th>
                              )}
                              <SortableColumnHeader
                                label="Status"
                                sortKey="status"
                                className="px-3 py-2 text-left text-gray-700 w-[8%]"
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
                              // Filter subtasks based on status
                              const relevantSubtasks = groupedTask.subtasks.filter(subtask => {
                                if (!statusFilter) return true;
                                const status = getStatusInfo(subtask.nextMaintenance).label;
                                return status === statusFilter;
                              });

                              if (relevantSubtasks.length === 0) return null;

                              const isSingleTask = groupedTask.subtasks.length === 1;
                              const isGroupedTaskCollapsed = collapsedGroupedTasks.has(groupedTask.id);

                              return (
                                <SortableTaskGroup
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
                      </SortableContext>
                    </DndContext>
                  </div>
                )}
              </div>
            );
          })
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
