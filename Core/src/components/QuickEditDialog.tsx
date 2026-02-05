import { useState, useEffect, useCallback } from 'react';
import { MaintenanceTask, Operator, Ploeg, ExternalEntity } from './AuthContext';
import { useAuth, PressType, pb } from './AuthContext';
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
  onSave: (task: MaintenanceTask) => Promise<void>;
}

export function QuickEditDialog({
  open,
  onOpenChange,
  task,
  siblingTasks = [],
  field,
  onSave
}: QuickEditDialogProps) {
  const { } = useAuth();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [ploegen, setPloegen] = useState<Ploeg[]>([]);
  const [externalEntities, setExternalEntities] = useState<ExternalEntity[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [lastMaintenance, setLastMaintenance] = useState<Date | null>(null);
  const [opmerkingen, setOpmerkingen] = useState('');
  const [selectedAssignments, setSelectedAssignments] = useState<{
    id: string;
    type: 'ploeg' | 'operator' | 'external';
  }[]>([]);
  const [selectedSiblings, setSelectedSiblings] = useState<Set<string>>(new Set());

  // Check if this task has siblings (is a child task)
  const hasSiblings = siblingTasks.length > 1;

  const fetchPersonnel = useCallback(async () => {
    try {
      setIsLoading(true);
      const [opsResult, ploegResult] = await Promise.all([
        pb.collection('operatoren').getFullList(),
        pb.collection('ploegen').getFullList()
      ]);

      const mappedOps = opsResult.map((r: any) => ({
        id: r.id,
        employeeId: r.employeeId || '',
        name: r.naam || '',
        presses: Array.isArray(r.presses) ? r.presses : Array.isArray(r.persen) ? r.persen : Array.isArray(r.pers) ? r.pers : [],
        active: r.active !== false,
        canEditTasks: r.canEditTasks === true,
        canAccessOperatorManagement: r.canAccessOperatorManagement === true,
        dienstverband: r.dienstverband || 'Intern'
      }));

      setOperators(mappedOps.filter((op: any) => op.dienstverband === 'Intern'));
      setExternalEntities(mappedOps.filter((op: any) => op.dienstverband === 'Extern').map((op: any) => ({
        id: op.id,
        name: op.name,
        presses: op.presses,
        active: op.active
      })));

      setPloegen(ploegResult.map((r: any) => ({
        id: r.id,
        name: r.naam || r.name || '',
        operatorIds: Array.isArray(r.leden) ? r.leden : Array.isArray(r.operatorIds) ? r.operatorIds : [],
        presses: r.pers ? [r.pers] : Array.isArray(r.presses) ? r.presses : Array.isArray(r.persen) ? r.persen : [],
        active: r.active !== false
      })));
    } catch (e) {
      console.error("Failed to fetch personnel data in QuickEdit", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      fetchPersonnel();
    }
  }, [open, fetchPersonnel]);

  useEffect(() => {
    if (task) {
      if (field === 'lastMaintenance') {
        setLastMaintenance(new Date());
      } else {
        setLastMaintenance(task.lastMaintenance);
      }
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
  }, [task, hasSiblings, field]);

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
  // Helper: Get assignees for the selected press
  const getAssigneesForPress = () => {
    if (!task) return { ploegen: [], operators: [], externalEntities: [] };

    // Use pressId if available, otherwise try to find ID by name, or fallback to name
    const pressId = task.pressId;

    const filterByPress = (entity: { presses: string[] }) => {
      if (!entity.presses || entity.presses.length === 0) return false;
      // Check if pressId is in the list (most likely)
      if (pressId && entity.presses.includes(pressId)) return true;
      // Check if press Name is in the list (legacy)
      if (task.press && entity.presses.includes(task.press)) return true;
      return false;
    };

    return {
      ploegen: ploegen.filter(p => p.active && filterByPress(p)),
      operators: getIndividualOperators().filter(op => filterByPress(op)),
      externalEntities: externalEntities.filter(e => e.active && filterByPress(e))
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

  const handleSave = async () => {
    if (!task) return;

    if (field === 'lastMaintenance' && selectedAssignments.length === 0) {
      toast.error('Selecteer a.u.b. ten minste één operator');
      return;
    }

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
    try {
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
                case 'years':
                  next.setFullYear(next.getFullYear() + taskToUpdate.maintenanceInterval);
                  break;
              }
              return next;
            })()
            : taskToUpdate.nextMaintenance
        };

        await onSave(updatedTask);
      }

      const updateCount = tasksToUpdate.length;
      toast.success(updateCount > 1
        ? `${updateCount} taken succesvol bijgewerkt`
        : 'Taak succesvol bijgewerkt'
      );
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to save tasks:', error);
      toast.error('Bijwerken van taken mislukt');
    }
  };

  const formatDate = (date: Date | null) => {
    if (!date) return 'Kies een datum';
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
            {field === 'lastMaintenance' ? 'Laatste Onderhoud Bijwerken' : 'Opmerkingen Bijwerken'}
          </DialogTitle>
          <DialogDescription>
            {field === 'lastMaintenance'
              ? 'Werk de datum van het laatste onderhoud bij en wie het heeft uitgevoerd.'
              : 'Werk de onderhoudsnotities bij.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="flex flex-col items-center gap-2">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                <p className="text-sm text-gray-500">Laden personeelsgegevens...</p>
              </div>
            </div>
          ) : (
            <>
              {field === 'lastMaintenance' && (
                <>
                  <div className="grid gap-2">
                    <Label>Datum Laatste Onderhoud</Label>
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
                        <Label>Toepassen op Subtaken</Label>
                        <div className="flex gap-2">
                          <Button type="button" variant="ghost" size="sm" onClick={selectAllSiblings}>
                            Alles Selecteren
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={deselectAllSiblings}>
                            Deselecteer Alles
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
                                <div className="text-sm font-medium">{sibling.subtaskName || sibling.task}</div>
                                {sibling.subtaskSubtext && (
                                  <div className="text-xs text-gray-500">{sibling.subtaskSubtext}</div>
                                )}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="grid gap-2">
                    <Label>Toegewezen aan</Label>
                    <div className="border rounded-md p-4 space-y-4">

                      {/* PLOEGEN SECTION - Full Width, 3 Columns */}
                      <div className="space-y-2">
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
                                          className="text-sm text-gray-600 cursor-pointer select-none truncate"
                                          title={member.name}
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
                        ) : null}
                      </div>

                      {/* INDIVIDUALS & EXTERNAL - 3 Column Grid */}
                      <div className="grid grid-cols-3 gap-4">
                        {/* INDIVIDUAL OPERATORS - 1 Column */}
                        <div className="border rounded-md p-3 bg-gray-50/50 col-span-1 min-w-[150px]">
                          <div className="font-medium text-sm text-gray-700 mb-2 pb-1 border-b border-gray-200">Operators</div>
                          {assignees.operators.length > 0 ? (
                            <div className="space-y-2">
                              {assignees.operators.map(op => (
                                <div key={op.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-md">
                                  <Checkbox
                                    id={`op-${op.id}`}
                                    checked={isAssigned(op.id, 'operator')}
                                    onCheckedChange={() => toggleAssignment(op.id, 'operator')}
                                  />
                                  <label
                                    htmlFor={`op-${op.id}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer truncate"
                                    title={op.name}
                                  >
                                    {op.name}
                                  </label>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400 italic">Geen operators</p>
                          )}
                        </div>

                        {/* EXTERNAL ENTITIES - 2 Columns */}
                        <div className="border rounded-md p-3 bg-gray-50/50 col-span-2 min-w-[200px]">
                          <div className="font-medium text-sm text-gray-700 mb-2 pb-1 border-b border-gray-200">Extern</div>
                          {assignees.externalEntities.length > 0 ? (
                            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                              {assignees.externalEntities.map(entity => (
                                <div key={entity.id} className="flex items-center space-x-3 p-2 hover:bg-gray-50 rounded-md">
                                  <Checkbox
                                    id={`ext-${entity.id}`}
                                    checked={isAssigned(entity.id, 'external')}
                                    onCheckedChange={() => toggleAssignment(entity.id, 'external')}
                                  />
                                  <label
                                    htmlFor={`ext-${entity.id}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer truncate"
                                    title={entity.name}
                                  >
                                    {entity.name}
                                  </label>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-sm text-gray-400 italic">Geen externe entiteiten</p>
                          )}
                        </div>
                      </div>

                      {assignees.ploegen.length === 0 && assignees.operators.length === 0 && assignees.externalEntities.length === 0 && (
                        <p className="text-sm text-gray-500 text-center py-4">
                          Geen toewijzingen beschikbaar voor {task.press}
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
                  placeholder="Onderhoudsnotities toevoegen..."
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Annuleren
          </Button>
          <Button type="button" onClick={handleSave}>
            {hasSiblings && selectedSiblings.size > 1
              ? `Wijzigingen Opslaan (${selectedSiblings.size} taken)`
              : 'Wijzigingen Opslaan'
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
