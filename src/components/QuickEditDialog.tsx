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
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Calendar } from './ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Checkbox } from './ui/checkbox';
import { CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';

interface QuickEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: MaintenanceTask | null;
  siblingTasks?: MaintenanceTask[]; // Other tasks in the same group
  field: 'lastMaintenance' | 'opmerkingen';
  onSave: (task: MaintenanceTask) => void;
}

export function QuickEditDialog({
  open,
  onOpenChange,
  task,
  siblingTasks = [],
  field,
  onSave
}: QuickEditDialogProps) {
  const auth = useAuth();
  const { operators, ploegen, externalEntities } = auth;
  const [lastMaintenance, setLastMaintenance] = useState<Date | null>(null);
  const [opmerkingen, setOpmerkingen] = useState('');
  const [selectedAssignments, setSelectedAssignments] = useState<{
    id: string;
    type: 'ploeg' | 'operator' | 'external';
  }[]>([]);
  const [selectedSiblings, setSelectedSiblings] = useState<Set<string>>(new Set());

  // Check if this task has siblings (is a child task)
  const hasSiblings = siblingTasks.length > 1;

  useEffect(() => {
    if (task) {
      setLastMaintenance(task.lastMaintenance);
      setOpmerkingen(task.opmerkingen);

      // Initialize selected assignments from task data
      if (task.assignedToIds && task.assignedToTypes) {
        const assignments = task.assignedToIds.map((id, index) => ({
          id,
          type: (task.assignedToTypes?.[index] || 'operator') as 'ploeg' | 'operator' | 'external'
        }));
        setSelectedAssignments(assignments);
      } else {
        setSelectedAssignments([]);
      }

      // Auto-select the current task in siblings
      if (hasSiblings) {
        setSelectedSiblings(new Set([task.id]));
      }
    }
  }, [task, hasSiblings]);

  // Helper: Get operators not in any active ploeg
  const getIndividualOperators = () => {
    const operatorsInPloegen = new Set(
      ploegen
        .filter(p => p.active)
        .flatMap(p => p.operatorIds)
    );
    return operators.filter(op => op.active && !operatorsInPloegen.has(op.id));
  };

  // Helper: Get assignees for the selected press
  const getAssigneesForPress = () => {
    if (!task) return { ploegen: [], operators: [], externalEntities: [] };
    const press = task.press as PressType;
    return {
      ploegen: ploegen.filter(p => p.active && p.presses.includes(press)),
      operators: getIndividualOperators().filter(op => op.presses.includes(press)),
      externalEntities: externalEntities.filter(e => e.active && e.presses.includes(press))
    };
  };

  const toggleAssignment = (id: string, type: 'ploeg' | 'operator' | 'external') => {
    setSelectedAssignments(prev => {
      const exists = prev.some(a => a.id === id && a.type === type);
      if (exists) {
        return prev.filter(a => !(a.id === id && a.type === type));
      } else {
        return [...prev, { id, type }];
      }
    });
  };

  const isAssigned = (id: string, type: 'ploeg' | 'operator' | 'external') => {
    return selectedAssignments.some(a => a.id === id && a.type === type);
  };

  const toggleSibling = (siblingId: string) => {
    setSelectedSiblings(prev => {
      const newSet = new Set(prev);
      if (newSet.has(siblingId)) {
        // Don't allow deselecting the current task
        if (siblingId === task?.id) return prev;
        newSet.delete(siblingId);
      } else {
        newSet.add(siblingId);
      }
      return newSet;
    });
  };

  const selectAllSiblings = () => {
    setSelectedSiblings(new Set(siblingTasks.map(s => s.id)));
  };

  const deselectAllSiblings = () => {
    // Keep only the current task selected
    if (task) {
      setSelectedSiblings(new Set([task.id]));
    }
  };

  const assignees = getAssigneesForPress();

  const handleSave = () => {
    if (!task) return;

    // Construct assignment data
    const assignedToIds = selectedAssignments.map(a => a.id);
    const assignedToTypes = selectedAssignments.map(a => a.type);

    // Create friendly string for backward compatibility
    const assignedNames = selectedAssignments.map(a => {
      if (a.type === 'ploeg') return ploegen.find(p => p.id === a.id)?.name;
      if (a.type === 'operator') return operators.find(o => o.id === a.id)?.name;
      if (a.type === 'external') return externalEntities.find(e => e.id === a.id)?.name;
      return '';
    }).filter(Boolean).join(', ');

    // Get all tasks to update
    const tasksToUpdate = hasSiblings
      ? siblingTasks.filter(s => selectedSiblings.has(s.id))
      : [task];

    // Update all selected tasks
    for (const taskToUpdate of tasksToUpdate) {
      const updatedTask: MaintenanceTask = {
        ...taskToUpdate,
        lastMaintenance,
        assignedTo: assignedNames,
        assignedToIds,
        assignedToTypes,
        opmerkingen,
        commentDate: opmerkingen !== taskToUpdate.opmerkingen
          ? new Date()
          : taskToUpdate.commentDate,
        nextMaintenance: field === 'lastMaintenance' && lastMaintenance
          ? (() => {
            const next = new Date(lastMaintenance);
            switch (taskToUpdate.maintenanceIntervalUnit) {
              case 'days':
                next.setDate(next.getDate() + taskToUpdate.maintenanceInterval);
                break;
              case 'weeks':
                next.setDate(next.getDate() + (taskToUpdate.maintenanceInterval * 7));
                break;
              case 'months':
                next.setMonth(next.getMonth() + taskToUpdate.maintenanceInterval);
                break;
            }
            return next;
          })()
          : taskToUpdate.nextMaintenance
      };

      onSave(updatedTask);
    }

    const updateCount = tasksToUpdate.length;
    toast.success(updateCount > 1
      ? `Updated ${updateCount} tasks successfully`
      : 'Task updated successfully'
    );
    onOpenChange(false);
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Pick a date';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!max-w-[800px] sm:!max-w-[800px] max-h-[90vh] overflow-y-auto" style={{ maxWidth: '800px' }}>
        <DialogHeader>
          <DialogTitle>
            {field === 'lastMaintenance' ? 'Update Last Maintenance' : 'Update Opmerkingen'}
          </DialogTitle>
          <DialogDescription>
            {field === 'lastMaintenance'
              ? 'Update the last maintenance date and who performed it.'
              : 'Update the maintenance notes.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {field === 'lastMaintenance' && (
            <>
              <div className="grid gap-2">
                <Label>Last Maintenance Date</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className="justify-start text-left"
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {formatDate(lastMaintenance)}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={lastMaintenance || undefined}
                      onSelect={(date) => setLastMaintenance(date || null)}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              {/* SIBLING TASKS SELECTION - Only show if task has siblings */}
              {hasSiblings && (
                <div className="grid gap-2">
                  <div className="flex items-center justify-between">
                    <Label>Apply to Child Tasks</Label>
                    <div className="flex gap-2">
                      <Button type="button" variant="ghost" size="sm" onClick={selectAllSiblings}>
                        Select All
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={deselectAllSiblings}>
                        Deselect All
                      </Button>
                    </div>
                  </div>
                  <div className="border rounded-md p-3 bg-gray-50/50">
                    <div className={`grid gap-3 ${siblingTasks.length >= 4 ? 'grid-cols-4' :
                        siblingTasks.length === 3 ? 'grid-cols-3' :
                          'grid-cols-2'
                      }`}>
                      {siblingTasks.map(sibling => (
                        <div
                          key={sibling.id}
                          className={`flex items-start space-x-2 px-3 py-2 rounded-md border ${selectedSiblings.has(sibling.id)
                            ? 'bg-blue-50 border-blue-200'
                            : 'bg-white border-gray-200'
                            } ${sibling.id === task.id ? 'ring-2 ring-blue-400' : ''}`}
                        >
                          <Checkbox
                            id={`sibling-${sibling.id}`}
                            checked={selectedSiblings.has(sibling.id)}
                            onCheckedChange={() => toggleSibling(sibling.id)}
                            disabled={sibling.id === task.id}
                            className="mt-0.5"
                          />
                          <label
                            htmlFor={`sibling-${sibling.id}`}
                            className="cursor-pointer select-none"
                          >
                            <div className="text-sm font-medium">{sibling.task}</div>
                            {sibling.taskSubtext && (
                              <div className="text-xs text-gray-500">{sibling.taskSubtext}</div>
                            )}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="grid gap-2">
                <Label>Assigned To</Label>
                <div className="border rounded-md p-4 max-h-[300px] overflow-y-auto space-y-4">

                  {/* PLOEGEN SECTION - Full Width, 3 Columns */}
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Ploegen</h4>
                    {assignees.ploegen.length > 0 ? (
                      <div className="flex flex-wrap gap-4">
                        {assignees.ploegen.map(ploeg => (
                          <div key={ploeg.id} className="border rounded-md p-3 bg-gray-50/50" style={{ flex: '1 1 calc(33.333% - 0.75rem)', minWidth: '150px' }}>
                            <div className="font-medium text-sm text-gray-700 mb-2 pb-1 border-b border-gray-200 truncate" title={ploeg.name}>
                              {ploeg.name}
                            </div>

                            {/* Individual Members */}
                            <div className="space-y-2">
                              {ploeg.operatorIds.map(opId => {
                                const member = operators.find(o => o.id === opId);
                                if (!member) return null;
                                return (
                                  <div key={member.id} className="flex items-center space-x-3">
                                    <Checkbox
                                      id={`ploeg-member-${member.id}`}
                                      checked={isAssigned(member.id, 'operator')}
                                      onCheckedChange={() => toggleAssignment(member.id, 'operator')}
                                    />
                                    <label
                                      htmlFor={`ploeg-member-${member.id}`}
                                      className="text-sm text-gray-600 cursor-pointer select-none"
                                    >
                                      {member.name}
                                    </label>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 italic">No ploegen available</p>
                    )}
                  </div>

                  {/* INDIVIDUALS & EXTERNAL - 2 Columns */}
                  <div className="flex flex-wrap gap-4">
                    {/* INDIVIDUAL OPERATORS */}
                    <div className="border rounded-md p-3 bg-gray-50/50" style={{ flex: '1 1 calc(50% - 0.5rem)', minWidth: '200px' }}>
                      <div className="font-medium text-sm text-gray-700 mb-2 pb-1 border-b border-gray-200">Operators</div>
                      {assignees.operators.length > 0 ? (
                        <div className="space-y-1">
                          {assignees.operators.map(op => (
                            <div key={op.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-md">
                              <Checkbox
                                id={`op-${op.id}`}
                                checked={isAssigned(op.id, 'operator')}
                                onCheckedChange={() => toggleAssignment(op.id, 'operator')}
                              />
                              <label
                                htmlFor={`op-${op.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {op.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic">No operators available</p>
                      )}
                    </div>

                    {/* EXTERNAL ENTITIES */}
                    <div className="border rounded-md p-3 bg-gray-50/50" style={{ flex: '1 1 calc(50% - 0.5rem)', minWidth: '200px' }}>
                      <div className="font-medium text-sm text-gray-700 mb-2 pb-1 border-b border-gray-200">External</div>
                      {assignees.externalEntities.length > 0 ? (
                        <div className="space-y-1">
                          {assignees.externalEntities.map(entity => (
                            <div key={entity.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-md">
                              <Checkbox
                                id={`ext-${entity.id}`}
                                checked={isAssigned(entity.id, 'external')}
                                onCheckedChange={() => toggleAssignment(entity.id, 'external')}
                              />
                              <label
                                htmlFor={`ext-${entity.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {entity.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic">No external entities</p>
                      )}
                    </div>
                  </div>

                  {assignees.ploegen.length === 0 && assignees.operators.length === 0 && assignees.externalEntities.length === 0 && (
                    <p className="text-sm text-gray-500 text-center py-4">
                      No assignees available for {task.press}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}

          <div className="grid gap-2">
            <Label>Opmerkingen</Label>
            <Textarea
              value={opmerkingen}
              onChange={(e) => setOpmerkingen(e.target.value)}
              rows={4}
              placeholder="Add maintenance notes..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" onClick={handleSave}>
            {hasSiblings && selectedSiblings.size > 1
              ? `Save Changes (${selectedSiblings.size} tasks)`
              : 'Save Changes'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
