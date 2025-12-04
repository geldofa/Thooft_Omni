import { useState, useEffect } from 'react';
import { MaintenanceTask } from './AuthContext';
import { useAuth, PressType } from './AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { CalendarIcon, Trash2, GripVertical } from 'lucide-react';
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

interface AddMaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (task: Omit<MaintenanceTask, 'id' | 'created' | 'updated'>) => void;
  editTask?: MaintenanceTask | null;
  initialGroup?: MaintenanceTask[] | null;
  onUpdateGroup?: (tasks: MaintenanceTask[]) => void;
}

// Sortable Subtask Component
interface SortableSubtaskProps {
  subtask: { id: string; name: string; subtext: string };
  onUpdate: (id: string, field: 'name' | 'subtext', value: string) => void;
  onRemove: (id: string) => void;
}

function SortableSubtask({ subtask, onUpdate, onRemove }: SortableSubtaskProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: subtask.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="grid grid-cols-2 gap-4 items-center"
    >
      <div className="flex items-center gap-2">
        <button
          type="button"
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600 touch-none"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-5 w-5" />
        </button>
        <span className="self-center">└─</span>
        <Input
          placeholder="e.g., Filter Replacement"
          value={subtask.name}
          onChange={(e) => onUpdate(subtask.id, 'name', e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <Input
          placeholder="e.g., All air handling units"
          value={subtask.subtext}
          onChange={(e) => onUpdate(subtask.id, 'subtext', e.target.value)}
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onRemove(subtask.id)}
          className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export function AddMaintenanceDialog({
  open,
  onOpenChange,
  onSubmit,
  editTask,
  initialGroup,
  onUpdateGroup
}: AddMaintenanceDialogProps) {
  const auth = useAuth();
  const user = auth.user;
  const isOperator = user?.role === 'press';

  const initialTaskData = {
    task: '',
    taskSubtext: '',
    category: '',
    press: 'Lithoman' as PressType,
    lastMaintenance: null as Date | null,
    nextMaintenance: new Date(),
    maintenanceInterval: 1,
    maintenanceIntervalUnit: 'months' as 'days' | 'weeks' | 'months',
    assignedTo: '',
    opmerkingen: '',
    commentDate: null as Date | null,
    isGroupTask: false
  };

  const [subtasks, setSubtasks] = useState<{ id: string; name: string; subtext: string }[]>([]);

  const [taskFormData, setTaskFormData] = useState(initialTaskData);
  const [previousComment, setPreviousComment] = useState('');

  useEffect(() => {
    if (open) {
      if (editTask) {
        setTaskFormData({
          task: editTask.task,
          taskSubtext: editTask.taskSubtext,
          category: editTask.category,
          press: editTask.press,
          lastMaintenance: editTask.lastMaintenance,
          nextMaintenance: editTask.nextMaintenance,
          maintenanceInterval: editTask.maintenanceInterval,
          maintenanceIntervalUnit: editTask.maintenanceIntervalUnit,
          assignedTo: editTask.assignedTo,
          opmerkingen: editTask.opmerkingen,
          commentDate: editTask.commentDate,
          isGroupTask: false
        });
        setPreviousComment(editTask.opmerkingen);
      } else if (initialGroup && initialGroup.length > 0) {
        // When editing a group, use the first task's data
        const firstTask = initialGroup[0];
        setTaskFormData({
          task: firstTask.task,
          taskSubtext: firstTask.taskSubtext,
          category: firstTask.category,
          press: firstTask.press,
          lastMaintenance: firstTask.lastMaintenance,
          nextMaintenance: firstTask.nextMaintenance,
          maintenanceInterval: firstTask.maintenanceInterval,
          maintenanceIntervalUnit: firstTask.maintenanceIntervalUnit,
          assignedTo: firstTask.assignedTo,
          opmerkingen: firstTask.opmerkingen,
          commentDate: firstTask.commentDate,
          isGroupTask: true
        });
        setPreviousComment(firstTask.opmerkingen);
      } else {
        // Reset for new task
        setTaskFormData(initialTaskData);
        setPreviousComment('');
      }
    } else {
      // Reset all forms when dialog closes
      setTaskFormData(initialTaskData);
      setPreviousComment('');
      setSubtasks([]);
    }
  }, [editTask, initialGroup, open]);

  // Auto-calculate next maintenance date when last maintenance or interval changes
  useEffect(() => {
    if (taskFormData.lastMaintenance && !isOperator) {
      const nextDate = calculateNextMaintenance(
        taskFormData.lastMaintenance,
        taskFormData.maintenanceInterval,
        taskFormData.maintenanceIntervalUnit
      );
      setTaskFormData(prev => ({ ...prev, nextMaintenance: nextDate }));
    }
  }, [taskFormData.lastMaintenance, taskFormData.maintenanceInterval, taskFormData.maintenanceIntervalUnit, isOperator]);

  const calculateNextMaintenance = (
    lastDate: Date,
    interval: number,
    unit: 'days' | 'weeks' | 'months'
  ): Date => {
    const next = new Date(lastDate);

    switch (unit) {
      case 'days':
        next.setDate(next.getDate() + interval);
        break;
      case 'weeks':
        next.setDate(next.getDate() + (interval * 7));
        break;
      case 'months':
        next.setMonth(next.getMonth() + interval);
        break;
    }

    return next;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (isOperator) {
      toast.error('Operators cannot create new tasks');
      return;
    }

    if (!taskFormData.task.trim()) {
      toast.error('Please enter a task name');
      return;
    }
    if (!taskFormData.category.trim()) {
      toast.error('Please select a category');
      return;
    }

    const commentModified = editTask && taskFormData.opmerkingen !== previousComment;
    const commentDate = commentModified || (!editTask && taskFormData.opmerkingen)
      ? new Date()
      : taskFormData.commentDate;

    const taskToSubmit = {
      ...taskFormData,
      assignedTo: '', // Assignments are handled in QuickEditDialog
      assignedToIds: [],
      assignedToTypes: [],
      opmerkingen: taskFormData.opmerkingen,
      commentDate,
      subtasks: taskFormData.isGroupTask ? subtasks : []
    };

    if (onUpdateGroup && initialGroup) {
      // Handle group update
      onUpdateGroup(initialGroup);
    } else {
      // Handle single task submission
      onSubmit(taskToSubmit);
    }

    onOpenChange(false);

    if (editTask) {
      toast.success('Task updated successfully');
    } else {
      toast.success('Task added successfully');
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Pick a date';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const categories = ['HVAC', 'Safety', 'Mechanical', 'Electrical', 'Plumbing', 'Building', 'IT', 'Other'];


  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setSubtasks((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
    }
  };

  const addSubtask = () => {
    setSubtasks([...subtasks, { id: `subtask-${Date.now()}`, name: '', subtext: '' }]);
  };

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter(subtask => subtask.id !== id));
  };

  const updateSubtask = (id: string, field: 'name' | 'subtext', value: string) => {
    setSubtasks(subtasks.map(subtask =>
      subtask.id === id ? { ...subtask, [field]: value } : subtask
    ));
  };




  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[800px] sm:!max-w-[800px] max-h-[90vh] overflow-y-auto px-4 py-2" style={{ maxWidth: '800px' }}>
        <DialogHeader>
          <DialogTitle>{editTask ? 'Edit Task' : initialGroup ? 'Edit Group' : 'Add New Task'}</DialogTitle>
          <DialogDescription>
            {editTask ? 'Update the maintenance task details below.' :
              initialGroup ? 'Update the group of maintenance tasks.' :
                'Fill in the details for the new maintenance task.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="isGroupTask">Task Type</Label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isGroupTask"
                  checked={taskFormData.isGroupTask}
                  onChange={(e) => setTaskFormData({ ...taskFormData, isGroupTask: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="isGroupTask" className="text-sm font-medium leading-none">
                  Group Task
                </Label>
                <span className="text-sm text-gray-500">(Check if this is a group of related tasks)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="task">Task Name *</Label>
                <Input
                  id="task"
                  placeholder="e.g., HVAC System Maintenance"
                  value={taskFormData.task}
                  onChange={(e) => setTaskFormData({ ...taskFormData, task: e.target.value })}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="taskSubtext">Task Description</Label>
                <Input
                  id="taskSubtext"
                  placeholder="e.g., Comprehensive maintenance for all HVAC units"
                  value={taskFormData.taskSubtext}
                  onChange={(e) => setTaskFormData({ ...taskFormData, taskSubtext: e.target.value })}
                />
              </div>
            </div>

            {taskFormData.isGroupTask && (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Subtasks</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addSubtask}>
                    Add Subtask
                  </Button>
                </div>

                {subtasks.length === 0 ? (
                  <p className="text-gray-500 text-sm">No subtasks added yet</p>
                ) : (
                  <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                  >
                    <SortableContext
                      items={subtasks.map(s => s.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {subtasks.map((subtask) => (
                          <SortableSubtask
                            key={subtask.id}
                            subtask={subtask}
                            onUpdate={updateSubtask}
                            onRemove={removeSubtask}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </DndContext>
                )}
              </div>
            )}

            <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(3, minmax(150px, 1fr))' }}>
              <div className="grid gap-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={taskFormData.category}
                  onValueChange={(value) => setTaskFormData({ ...taskFormData, category: value })}
                >
                  <SelectTrigger id="category">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Last Maintenance *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-left w-full"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formatDate(taskFormData.lastMaintenance)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={taskFormData.lastMaintenance || undefined}
                      onSelect={(date) => setTaskFormData({ ...taskFormData, lastMaintenance: date || null })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="grid gap-2">
                <Label>Next Maintenance *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-left w-full"
                      disabled={!!taskFormData.lastMaintenance || isOperator}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formatDate(taskFormData.nextMaintenance)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={taskFormData.nextMaintenance}
                      onSelect={(date) => setTaskFormData({ ...taskFormData, nextMaintenance: date || new Date() })}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {taskFormData.lastMaintenance && (
                  <p className="text-xs text-gray-500">Auto-calculated based on interval</p>
                )}
                {isOperator && (
                  <p className="text-xs text-gray-500">Read-only for operators</p>
                )}
              </div>
            </div>

            {!isOperator && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="interval">Maintenance Interval *</Label>
                  <Input
                    id="interval"
                    type="number"
                    min="1"
                    value={taskFormData.maintenanceInterval}
                    onChange={(e) => setTaskFormData({ ...taskFormData, maintenanceInterval: parseInt(e.target.value) || 1 })}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="intervalUnit">Interval Unit *</Label>
                  <Select
                    value={taskFormData.maintenanceIntervalUnit}
                    onValueChange={(value: 'days' | 'weeks' | 'months') =>
                      setTaskFormData({ ...taskFormData, maintenanceIntervalUnit: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="days">Days</SelectItem>
                      <SelectItem value="weeks">Weeks</SelectItem>
                      <SelectItem value="months">Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editTask ? 'Update' : initialGroup ? 'Update Group' : 'Add'}
            </Button>
          </DialogFooter>
        </form >
      </DialogContent >
    </Dialog >
  );
}
