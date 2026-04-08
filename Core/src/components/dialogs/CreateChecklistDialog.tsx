import { useState, useMemo, useEffect } from 'react';
import { MaintenanceTask, pb } from '../AuthContext';
import { useAuth } from '../AuthContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '../ui/badge';
import { Calendar } from '../ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { CalendarIcon, Clock, ClipboardCheck, Loader2, CheckCircle2, Factory } from 'lucide-react';
import { cn } from '../ui/utils';
import { formatDisplayDate } from '../../utils/dateUtils';
import { formatNumber } from '../../utils/formatNumber';
import { toast } from 'sonner';

interface CreateChecklistDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pressId: string;
  pressName: string;
  tasks: MaintenanceTask[];
  onCreated?: () => void;
}

export function CreateChecklistDialog({
  open,
  onOpenChange,
  pressId,
  pressName,
  tasks,
  onCreated,
}: CreateChecklistDialogProps) {
  const { user } = useAuth();
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [startDate, setStartDate] = useState<Date>(() => new Date());
  const [endDate, setEndDate] = useState<Date>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedTasks([]);
      setStartDate(new Date());
      const d = new Date();
      d.setDate(d.getDate() + 7);
      setEndDate(d);
    }
  }, [open]);

  const today = useMemo(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  // Filter tasks for the selected press
  const pressTasks = useMemo(() => {
    return tasks.filter(t => t.pressId === pressId || t.press === pressName);
  }, [tasks, pressId, pressName]);

  const isTaskOverdue = (task: MaintenanceTask): boolean => {
    if (!task.nextMaintenance) return false;
    const nextDue = new Date(task.nextMaintenance);
    const nextDueStart = new Date(nextDue.getFullYear(), nextDue.getMonth(), nextDue.getDate());
    return nextDueStart < today;
  };

  // Group tasks by category
  const tasksByCategory = useMemo(() => {
    const grouped: Record<string, MaintenanceTask[]> = {};
    pressTasks.forEach(task => {
      const cat = task.category || 'Ongecategoriseerd';
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(task);
    });
    return grouped;
  }, [pressTasks]);

  const allCategories = Object.keys(tasksByCategory).sort();

  const handleToggleTask = (taskId: string, isChecked: boolean) => {
    setSelectedTasks(prev =>
      isChecked ? [...prev, taskId] : prev.filter(id => id !== taskId)
    );
  };

  const handleToggleCategory = (category: string, isChecked: boolean) => {
    const categoryTaskIds = tasksByCategory[category].map(t => t.id);
    setSelectedTasks(prev => {
      if (isChecked) {
        return [...new Set([...prev, ...categoryTaskIds])];
      } else {
        return prev.filter(id => !categoryTaskIds.includes(id));
      }
    });
  };

  const handleAddAllOverdue = () => {
    const overdueIds = pressTasks.filter(isTaskOverdue).map(t => t.id);
    setSelectedTasks(prev => [...new Set([...prev, ...overdueIds])]);
  };

  const handleSelectAll = () => {
    setSelectedTasks(pressTasks.map(t => t.id));
  };

  const handleDeselectAll = () => {
    setSelectedTasks([]);
  };

  const overdueNotSelected = pressTasks.filter(isTaskOverdue).filter(t => !selectedTasks.includes(t.id)).length;

  const handleSubmit = async () => {
    if (selectedTasks.length === 0) {
      toast.error('Selecteer minimaal één taak');
      return;
    }
    if (!startDate || !endDate) {
      toast.error('Selecteer een begin- en einddatum');
      return;
    }
    if (endDate < startDate) {
      toast.error('De einddatum moet na de begindatum liggen');
      return;
    }

    setIsSubmitting(true);
    try {
      // Deactivate any existing active checklist for this press
      const existing = await pb.collection('maintenance_checklists').getFullList({
        filter: `press_id = "${pressId}" && active = true`
      });

      for (const record of existing) {
        // Archive with summary
        const taskIds = record.task_ids || [];
        const completedIds = record.completed_task_ids || [];
        const incompleteIds = taskIds.filter((id: string) => !completedIds.includes(id));

        await pb.collection('maintenance_checklists').update(record.id, {
          active: false,
          incomplete_task_ids: incompleteIds,
          summary: {
            archived_at: new Date().toISOString(),
            archived_by: user?.name || user?.username || 'Onbekend',
            reason: 'replaced_by_new_checklist'
          }
        });
      }

      // Create new checklist
      await pb.collection('maintenance_checklists').create({
        press_id: pressId,
        press_name: pressName,
        task_ids: selectedTasks,
        completed_task_ids: [],
        start_date: startDate.toISOString(),
        end_date: endDate.toISOString(),
        created_by: user?.name || user?.username || 'Onbekend',
        active: true,
        total_tasks: selectedTasks.length,
        completed_count: 0,
        incomplete_task_ids: [],
        summary: {}
      });

      toast.success(`Checklist aangemaakt met ${selectedTasks.length} taken`);
      onOpenChange(false);
      onCreated?.();
    } catch (e: any) {
      console.error('Failed to create checklist:', e);
      toast.error(`Checklist aanmaken mislukt: ${e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatDate = (date: Date | null): string => {
    return formatDisplayDate(date);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[700px] sm:!max-w-[700px] max-h-[90vh] flex flex-col" style={{ maxWidth: '700px' }}>
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-emerald-600" />
            Checklist Maken — {pressName}
          </DialogTitle>
          <DialogDescription>
            Selecteer taken en kies een periode voor de checklist.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto min-h-0 space-y-4 py-2 pr-1 custom-scrollbar">
          {/* Date Range */}
          <div className="flex gap-4">
            <div className="flex-1 space-y-2">
              <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Begindatum</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left h-9 text-sm">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatDate(startDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={startDate || undefined}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="flex-1 space-y-2">
              <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">Einddatum</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left h-9 text-sm">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formatDate(endDate)}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={endDate || undefined}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Task Selection */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="text-[10px] uppercase text-muted-foreground font-bold tracking-wider">
                Selecteer Taken ({selectedTasks.length} / {pressTasks.length})
              </Label>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAddAllOverdue}
                  className="gap-1.5 h-7 text-[10px] px-2 border-red-100 text-red-600 hover:bg-red-50"
                  title="Voeg alle achterstallige taken toe"
                >
                  <Clock className="w-3 h-3" />
                  Achterstallige (+{overdueNotSelected})
                </Button>
                <Button variant="ghost" size="sm" onClick={handleSelectAll} className="h-7 text-[10px] px-2">
                  Alles
                </Button>
                <Button variant="ghost" size="sm" onClick={handleDeselectAll} className="h-7 text-[10px] px-2">
                  Geen
                </Button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-lg overflow-hidden max-h-[400px] overflow-y-auto custom-scrollbar">
              {pressTasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-8 text-center">
                  <Factory className="w-10 h-10 text-slate-200 mb-3" />
                  <p className="text-sm font-medium text-slate-500">Geen taken gevonden voor {pressName}</p>
                </div>
              ) : (
                allCategories.map((category, catIdx) => {
                  const categoryTasks = tasksByCategory[category];
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
                            onCheckedChange={(c) => handleToggleCategory(category, c === true)}
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
                })
              )}
            </div>
          </div>
        </div>

        <DialogFooter className="shrink-0 pt-3 border-t">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSubmitting}>
            Annuleren
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || selectedTasks.length === 0}
            className="bg-emerald-600 hover:bg-emerald-700 gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Aanmaken...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                Checklist Maken ({selectedTasks.length} taken)
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
