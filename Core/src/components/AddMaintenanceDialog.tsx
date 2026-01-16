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
  activePress?: string; // The currently active press tab (ID or name)
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
          placeholder="bijv., Filter Vervangen"
          value={subtask.name}
          onChange={(e) => onUpdate(subtask.id, 'name', e.target.value)}
        />
      </div>
      <div className="flex items-center gap-2">
        <Input
          placeholder="bijv., Alle luchtbehandelingsunits"
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
  onUpdateGroup,
  activePress
}: AddMaintenanceDialogProps) {
  const { user, presses, categories } = useAuth();
  const isOperator = user?.role === 'press';

  const initialTaskData = {
    task: '',
    taskSubtext: '',
    category: '', // This will be an ID
    press: '' as PressType, // This will be an ID
    lastMaintenance: null as Date | null,
    nextMaintenance: new Date(),
    maintenanceInterval: 1,
    maintenanceIntervalUnit: 'months' as 'days' | 'weeks' | 'months',
    assignedTo: '',
    opmerkingen: '',
    commentDate: null as Date | null,
    sort_order: 0,
    isGroupTask: false,
    subtaskName: '',
    subtaskSubtext: '',
    isExternal: false
  };

  const [subtasks, setSubtasks] = useState<{ id: string; name: string; subtext: string; opmerkingen?: string; commentDate?: Date | null; sort_order: number; isExternal?: boolean }[]>([]);

  const [taskFormData, setTaskFormData] = useState(initialTaskData);
  const [initialValues, setInitialValues] = useState(initialTaskData);
  const [previousComment, setPreviousComment] = useState('');

  // Determine if this is a new task (not editing)
  const isNewTask = !editTask && !initialGroup;
  // Simplified view for groups, Full view for Single/Child tasks
  const isSimplifiedView = !!initialGroup;

  useEffect(() => {
    if (open) {
      if (editTask) {
        const data = {
          task: editTask.task,
          taskSubtext: editTask.taskSubtext,
          subtaskName: editTask.subtaskName || editTask.task,
          subtaskSubtext: editTask.subtaskSubtext || editTask.taskSubtext,
          category: editTask.categoryId || editTask.category, // Use ID preferring categoryId
          press: editTask.pressId || editTask.press,
          lastMaintenance: editTask.lastMaintenance,
          nextMaintenance: editTask.nextMaintenance,
          maintenanceInterval: editTask.maintenanceInterval,
          maintenanceIntervalUnit: editTask.maintenanceIntervalUnit,
          assignedTo: editTask.assignedTo,
          opmerkingen: editTask.opmerkingen,
          commentDate: editTask.commentDate,
          sort_order: editTask.sort_order || 0,
          isGroupTask: false,
          isExternal: editTask.isExternal || false
        };
        setTaskFormData(data);
        setInitialValues(data);
        setPreviousComment(editTask.opmerkingen);
      } else if (initialGroup && initialGroup.length > 0) {
        // When editing a group, use the first task's data
        const firstTask = initialGroup[0];
        const data = {
          task: firstTask.task, // Use Group Name
          taskSubtext: firstTask.taskSubtext, // Use Group Subtext
          category: firstTask.categoryId || firstTask.category,
          press: firstTask.pressId || firstTask.press,
          lastMaintenance: firstTask.lastMaintenance,
          nextMaintenance: firstTask.nextMaintenance,
          maintenanceInterval: firstTask.maintenanceInterval,
          maintenanceIntervalUnit: firstTask.maintenanceIntervalUnit,
          assignedTo: firstTask.assignedTo,
          opmerkingen: firstTask.opmerkingen,
          commentDate: firstTask.commentDate,
          sort_order: firstTask.sort_order || 0,
          isGroupTask: true,
          subtaskName: '',
          subtaskSubtext: '',
          isExternal: firstTask.isExternal || false
        };
        setTaskFormData(data);
        setInitialValues(data);
        setPreviousComment(firstTask.opmerkingen);
        setSubtasks(initialGroup.map(t => ({
          id: t.id,
          name: t.subtaskName || t.task, // Use specific child name
          subtext: t.subtaskSubtext || t.taskSubtext || '',
          opmerkingen: t.opmerkingen,
          commentDate: t.commentDate,
          sort_order: t.sort_order || 0,
          isExternal: t.isExternal || false
        })));
      } else {
        // Reset for new task - use activePress if provided
        const activePressId = presses.find(p => p.name === activePress || p.id === activePress)?.id || presses[0]?.id || '';
        setTaskFormData({
          ...initialTaskData,
          press: activePressId as PressType
        });
        setPreviousComment('');
      }
    } else {
      // Reset all forms when dialog closes
      setTaskFormData(initialTaskData);
      setPreviousComment('');
      setSubtasks([]);
    }
  }, [editTask, initialGroup, open, presses, activePress]);

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
      toast.error('Operators kunnen geen nieuwe taken aanmaken');
      return;
    }

    if (!taskFormData.task.trim()) {
      toast.error('Vul a.u.b. een taaknaam in');
      return;
    }
    if (!taskFormData.category) {
      toast.error('Selecteer a.u.b. een categorie');
      return;
    }

    const commentModified = editTask && taskFormData.opmerkingen !== previousComment;
    const commentDate = commentModified || (!editTask && taskFormData.opmerkingen)
      ? new Date()
      : taskFormData.commentDate;

    const selectedPress = presses.find(p => p.id === taskFormData.press);
    const selectedCategory = categories.find(c => c.id === taskFormData.category);

    const taskToSubmit = {
      ...taskFormData,
      category: selectedCategory?.name || '',
      categoryId: taskFormData.category,
      press: selectedPress?.name || '',
      pressId: taskFormData.press,
      assignedTo: '', // Assignments are handled in QuickEditDialog
      assignedToIds: [],
      assignedToTypes: [],
      comment: taskFormData.opmerkingen, // Map opmerkingen to comment for MaintenanceTask compatibility
      commentDate,
      subtaskName: taskFormData.subtaskName || taskFormData.task,
      subtaskSubtext: taskFormData.subtaskSubtext || taskFormData.taskSubtext,
      subtasks: taskFormData.isGroupTask ? subtasks.map((st, index) => ({ ...st, sort_order: index })) : [],
      sort_order: taskFormData.sort_order,
      isExternal: taskFormData.isExternal
    };

    if (onUpdateGroup && initialGroup) {
      // Handle group update - Propagate core fields from the form to all tasks in the group
      const updatedTasks = subtasks.map((st, index) => {
        // Find if this subtask was in the initial group to keep its ID and other fields
        const initialTask = initialGroup.find(it => it.id === st.id);

        return {
          ...st,
          id: st.id, // This is either an existing ID or a temp one if new
          task: taskFormData.task, // Enforce the Group Name from the form
          subtaskName: st.name, // Use the specific subtask name from the subtasks state
          taskSubtext: taskFormData.taskSubtext, // Enforce the Group Subtext from the form
          subtaskSubtext: st.subtext, // Use the specific subtask subtext from the subtasks state
          categoryId: taskFormData.category,
          category: selectedCategory?.name || '',
          pressId: taskFormData.press,
          press: selectedPress?.name || '',
          // Propagation logic: Only overwrite if the value in the form was actually changed from its initial state
          lastMaintenance: taskFormData.lastMaintenance !== initialValues.lastMaintenance ? taskFormData.lastMaintenance : (initialTask?.lastMaintenance || taskFormData.lastMaintenance),
          nextMaintenance: taskFormData.nextMaintenance !== initialValues.nextMaintenance ? taskFormData.nextMaintenance : (initialTask?.nextMaintenance || taskFormData.nextMaintenance),
          maintenanceInterval: taskFormData.maintenanceInterval !== initialValues.maintenanceInterval ? taskFormData.maintenanceInterval : (initialTask?.maintenanceInterval || taskFormData.maintenanceInterval),
          maintenanceIntervalUnit: taskFormData.maintenanceIntervalUnit !== initialValues.maintenanceIntervalUnit ? taskFormData.maintenanceIntervalUnit : (initialTask?.maintenanceIntervalUnit || taskFormData.maintenanceIntervalUnit),
          assignedTo: (taskFormData.assignedTo !== initialValues.assignedTo && taskFormData.assignedTo !== '') ? taskFormData.assignedTo : (initialTask?.assignedTo || ''),
          opmerkingen: initialTask?.opmerkingen || st.opmerkingen || taskFormData.opmerkingen,
          comment: initialTask?.opmerkingen || st.opmerkingen || taskFormData.opmerkingen,
          commentDate: (initialTask?.opmerkingen || st.opmerkingen) ? (initialTask?.commentDate || st.commentDate || new Date()) : taskFormData.commentDate,
          sort_order: index, // Use current array index as sort order
          isExternal: taskFormData.isExternal, // Propagation
          created: initialTask?.created || new Date().toISOString(),
          updated: new Date().toISOString()
        } as MaintenanceTask;
      });
      onUpdateGroup(updatedTasks);
    } else {
      // Handle single task submission
      onSubmit(taskToSubmit);
    }

    onOpenChange(false);

    if (editTask) {
      toast.success('Taak succesvol bijgewerkt');
    } else {
      toast.success('Taak succesvol toegevoegd');
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Kies een datum';
    return new Date(date).toLocaleDateString('nl-NL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredCategories = categories.filter(cat =>
    !taskFormData.press || cat.pressIds.includes(taskFormData.press)
  );



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
    setSubtasks([...subtasks, { id: `subtask-${Date.now()}`, name: '', subtext: '', sort_order: subtasks.length }]);
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
          <DialogTitle>{editTask ? 'Taak bewerken' : initialGroup ? 'Groep bewerken' : 'Nieuwe taak toevoegen'}</DialogTitle>
          <DialogDescription>
            {editTask ? 'Werk de onderhoudstaak details hieronder bij.' :
              initialGroup ? 'Werk de groep onderhoudstaken bij.' :
                'Vul de details in voor de nieuwe onderhoudstaak.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="isGroupTask">Taak type</Label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isGroupTask"
                  checked={taskFormData.isGroupTask}
                  onChange={(e) => setTaskFormData({ ...taskFormData, isGroupTask: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="isGroupTask" className="text-sm font-medium leading-none">
                  Groepstaak
                </Label>
                <span className="text-sm text-gray-500">(Aanvinken als dit een groep gerelateerde taken is)</span>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="isExternal">Externe Taak</Label>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="isExternal"
                  checked={taskFormData.isExternal}
                  onChange={(e) => setTaskFormData({ ...taskFormData, isExternal: e.target.checked })}
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <Label htmlFor="isExternal" className="text-sm font-medium leading-none">
                  Externe Taak
                </Label>
                <span className="text-sm text-gray-500">(Zichtbaar in het externe overzicht voor meestergasten)</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="task">{taskFormData.isGroupTask ? 'Groep naam *' : 'Taak naam *'}</Label>
                <Input
                  id="task"
                  placeholder={taskFormData.isGroupTask ? "bijv., HVAC Systeem Onderhoud" : "bijv., Filter Vervangen"}
                  value={taskFormData.isGroupTask ? taskFormData.task : taskFormData.subtaskName}
                  onChange={(e) => {
                    if (taskFormData.isGroupTask) {
                      setTaskFormData({ ...taskFormData, task: e.target.value });
                    } else {
                      // For single tasks, sync Group Name with Task Name if they are the same
                      const isSingleTask = !editTask || editTask.task === editTask.subtaskName;
                      if (isSingleTask) {
                        setTaskFormData({ ...taskFormData, subtaskName: e.target.value, task: e.target.value });
                      } else {
                        setTaskFormData({ ...taskFormData, subtaskName: e.target.value });
                      }
                    }
                  }}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="taskSubtext">{taskFormData.isGroupTask ? 'Groep omschrijving' : 'Taak omschrijving'}</Label>
                <Input
                  id="taskSubtext"
                  placeholder={taskFormData.isGroupTask ? "bijv., Uitgebreid onderhoud..." : "bijv., Alle units..."}
                  value={taskFormData.isGroupTask ? taskFormData.taskSubtext : taskFormData.subtaskSubtext}
                  onChange={(e) => {
                    if (taskFormData.isGroupTask) {
                      setTaskFormData({ ...taskFormData, taskSubtext: e.target.value });
                    } else {
                      setTaskFormData({ ...taskFormData, subtaskSubtext: e.target.value });
                    }
                  }}
                />
              </div>
            </div>

            {taskFormData.isGroupTask && (
              <div className="grid gap-2">
                <div className="flex items-center justify-between">
                  <Label>Subtaken</Label>
                  <Button type="button" variant="outline" size="sm" onClick={addSubtask}>
                    Subtaak toevoegen
                  </Button>
                </div>

                {subtasks.length === 0 ? (
                  <p className="text-gray-500 text-sm">Nog geen subtaken toegevoegd</p>
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

            {!isSimplifiedView && (
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="press">Machine (Pers) *</Label>
                  <Select
                    value={taskFormData.press}
                    onValueChange={(value) => setTaskFormData({ ...taskFormData, press: value as PressType, category: '' })}
                    disabled={isNewTask} // Lock press selection for new tasks
                  >
                    <SelectTrigger id="press">
                      <SelectValue placeholder="Selecteer een machine" />
                    </SelectTrigger>
                    <SelectContent>
                      {presses.filter((p: any) => p && p.id && p.id.trim() !== '').map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {isNewTask && (
                    <p className="text-xs text-gray-500">Pers is bepaald door de actieve tab</p>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="category">Categorie *</Label>
                  <Select
                    value={taskFormData.category}
                    onValueChange={(value) => setTaskFormData({ ...taskFormData, category: value })}
                    disabled={!taskFormData.press}
                  >
                    <SelectTrigger id="category">
                      <SelectValue placeholder={taskFormData.press ? "Selecteer een categorie" : "Selecteer eerst een machine"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredCategories.filter((cat: any) => cat && cat.id && cat.id.trim() !== '').map((cat: any) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Only show Date and Interval fields if NOT editing an individual task from a group */}
            {!isSimplifiedView ? (
              (!editTask || editTask.task === editTask.subtaskName) ? (
                <>
                  <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(2, minmax(150px, 1fr))' }}>

                    <div className="grid gap-2">
                      <Label>Laatste onderhoud *</Label>
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
                      <Label>Volgende onderhoud *</Label>
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
                        <p className="text-xs text-gray-500">Automatisch berekend op basis van interval</p>
                      )}
                      {isOperator && (
                        <p className="text-xs text-gray-500">Alleen lezen voor operators</p>
                      )}
                    </div>
                  </div>

                  {!isOperator && (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="interval">Onderhoudsinterval *</Label>
                        <Input
                          id="interval"
                          type="number"
                          min="1"
                          value={taskFormData.maintenanceInterval}
                          onChange={(e) => setTaskFormData({ ...taskFormData, maintenanceInterval: parseInt(e.target.value) || 1 })}
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label htmlFor="intervalUnit">Interval Eenheid *</Label>
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
                            <SelectItem value="days">Dagen</SelectItem>
                            <SelectItem value="weeks">Weken</SelectItem>
                            <SelectItem value="months">Maanden</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-2">
                    <Label htmlFor="assignedTo">Toegewezen aan</Label>
                    <Input
                      id="assignedTo"
                      placeholder="bijv., Jan Jansen of Ploeg A"
                      value={taskFormData.assignedTo}
                      onChange={(e) => setTaskFormData({ ...taskFormData, assignedTo: e.target.value })}
                    />
                  </div>
                </>
              ) : null
            ) : (
              /* Group Simplified View - Only Interval and Unit */
              !isOperator && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="interval">Onderhoudsinterval *</Label>
                    <Input
                      id="interval"
                      type="number"
                      min="1"
                      value={taskFormData.maintenanceInterval}
                      onChange={(e) => setTaskFormData({ ...taskFormData, maintenanceInterval: parseInt(e.target.value) || 1 })}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="intervalUnit">Interval Eenheid *</Label>
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
                        <SelectItem value="days">Dagen</SelectItem>
                        <SelectItem value="weeks">Weken</SelectItem>
                        <SelectItem value="months">Maanden</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuleren
            </Button>
            <Button type="submit">
              {editTask ? 'Bijwerken' : initialGroup ? 'Groep bijwerken' : 'Toevoegen'}
            </Button>
          </DialogFooter>
        </form >
      </DialogContent >
    </Dialog >
  );
}
