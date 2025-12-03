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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { CalendarIcon } from 'lucide-react';
import { toast } from 'sonner';

interface QuickEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  task: MaintenanceTask | null;
  field: 'lastMaintenance' | 'opmerkingen';
  onSave: (task: MaintenanceTask) => void;
}

export function QuickEditDialog({
  open,
  onOpenChange,
  task,
  field,
  onSave
}: QuickEditDialogProps) {
  const auth = useAuth();
  const [lastMaintenance, setLastMaintenance] = useState<Date | null>(null);
  const [assignedTo, setAssignedTo] = useState('');
  const [opmerkingen, setOpmerkingen] = useState('');

  useEffect(() => {
    if (task) {
      setLastMaintenance(task.lastMaintenance);
      setAssignedTo(task.assignedTo);
      setOpmerkingen(task.opmerkingen);
    }
  }, [task]);

  const handleSave = () => {
    if (!task) return;

    const updatedTask: MaintenanceTask = {
      ...task,
      lastMaintenance,
      assignedTo,
      opmerkingen,
      commentDate: field === 'opmerkingen' && opmerkingen !== task.opmerkingen
        ? new Date()
        : task.commentDate
    };

    // Recalculate next maintenance if last maintenance changed
    if (field === 'lastMaintenance' && lastMaintenance) {
      const next = new Date(lastMaintenance);
      switch (task.maintenanceIntervalUnit) {
        case 'days':
          next.setDate(next.getDate() + task.maintenanceInterval);
          break;
        case 'weeks':
          next.setDate(next.getDate() + (task.maintenanceInterval * 7));
          break;
        case 'months':
          next.setMonth(next.getMonth() + task.maintenanceInterval);
          break;
      }
      updatedTask.nextMaintenance = next;
    }

    onSave(updatedTask);
    toast.success('Task updated successfully');
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

  const getAvailableOperators = () => {
    if (!task) return [];
    return auth.operators.filter(op =>
      op.active && op.presses.includes(task.press as PressType)
    );
  };

  if (!task) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
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

              <div className="grid gap-2">
                <Label>Assigned To</Label>
                <Select
                  value={assignedTo}
                  onValueChange={setAssignedTo}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an operator" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAvailableOperators().map((operator) => (
                      <SelectItem key={operator.id} value={operator.name}>
                        {operator.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
