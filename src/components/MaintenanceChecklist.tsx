import { useState, useRef, useMemo } from 'react';
import { MaintenanceTask } from './AuthContext';
import { useAuth, PressType } from './AuthContext';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Printer, Clock, ListChecks } from 'lucide-react';
import { Checkbox } from './ui/checkbox';
import { Textarea } from './ui/textarea';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion'; // Added Accordion imports

interface MaintenanceChecklistProps {
  tasks: MaintenanceTask[];
}

export function MaintenanceChecklist({ tasks }: MaintenanceChecklistProps) {
  const { presses } = useAuth();
  const [selectedPress, setSelectedPress] = useState<PressType | ''>('');
  const printRef = useRef<HTMLDivElement>(null);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]); // State for task IDs to print
  const [supervisorGuidance, setSupervisorGuidance] = useState(''); // New state for supervisor guidance

  const today = useMemo(() => {
    const d = new Date();
    // Normalize to start of day for accurate overdue check
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }, []);

  const formatDate = (date: Date | null): string => {
    if (!date) return 'N/A';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  const handlePrint = () => {
    if (!selectedPress || selectedTasks.length === 0) {
      return;
    }
    window.print();
  };

  const activePresses = presses.filter(p => p.active && !p.archived);

  // Tasks for the currently selected press (unfiltered)
  const allPressTasks = selectedPress
    ? tasks.filter(task => task.press === selectedPress)
    : [];

  const isTaskOverdue = (task: MaintenanceTask): boolean => {
    if (!task.nextMaintenance) return false;
    const nextDue = new Date(task.nextMaintenance);
    // Use the start of the day for comparison
    const nextDueStart = new Date(nextDue.getFullYear(), nextDue.getMonth(), nextDue.getDate());
    return nextDueStart < today;
  };

  const handleAddAllOverdue = () => {
    const overdueIds = allPressTasks
      .filter(isTaskOverdue)
      .map(task => task.id);
    // Merge new overdue tasks, preventing duplicates
    setSelectedTasks(prev => [...new Set([...prev, ...overdueIds])]);
  };

  const handleToggleTask = (taskId: string, isChecked: boolean) => {
    setSelectedTasks(prev =>
      isChecked
        ? [...prev, taskId]
        : prev.filter(id => id !== taskId)
    );
  };

  // Group ALL tasks for display in the selection UI
  const allTasksGrouped = allPressTasks.reduce((acc, task) => {
    if (!acc[task.category]) {
      acc[task.category] = [];
    }
    acc[task.category].push(task);
    return acc;
  }, {} as Record<string, MaintenanceTask[]>);

  const allCategories = Object.keys(allTasksGrouped).sort();

  // Group SELECTED tasks for printing
  const selectedTasksForPrint = allPressTasks
    .filter(task => selectedTasks.includes(task.id))
    .reduce((acc, task) => {
      if (!acc[task.category]) {
        acc[task.category] = [];
      }
      acc[task.category].push(task);
      return acc;
    }, {} as Record<string, MaintenanceTask[]>);

  const categoriesForPrint = Object.keys(selectedTasksForPrint).sort();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between no-print">
        <div>
          <h2 className="text-gray-900">Maintenance Checklist</h2>
          <p className="text-gray-600 mt-1">
            Create a printable checklist for press operators
          </p>
        </div>
        <Button
          onClick={handlePrint}
          className="gap-2"
          disabled={!selectedPress || selectedTasks.length === 0}
        >
          <Printer className="w-4 h-4" />
          Print Checklist ({selectedTasks.length})
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 no-print">
        <div className="grid gap-4 max-w-lg">
          <div className="grid gap-2 max-w-xs">
            <Label>Select Press</Label>
            <Select value={selectedPress} onValueChange={(value) => {
              setSelectedPress(value as PressType);
              setSelectedTasks([]); // Clear selection when press changes
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Select a press" />
              </SelectTrigger>
              <SelectContent>
                {activePresses.map((press) => (
                  <SelectItem key={press.id} value={press.name}>
                    {press.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="supervisor-guidance">Guidance/Comments for Operator</Label>
            <Textarea
              id="supervisor-guidance"
              placeholder="Add any specific instructions, warnings, or guidance for the operator completing this checklist..."
              value={supervisorGuidance}
              onChange={(e) => setSupervisorGuidance(e.target.value)}
              rows={3}
            />
          </div>
        </div>
      </div>

      {/* Task Selection UI */}
      {selectedPress && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 no-print">
          <div className="flex justify-between items-center mb-4 border-b pb-3">
            <h3 className="text-lg font-semibold">Select Tasks for Checklist</h3>
            <Button
              variant="outline"
              onClick={handleAddAllOverdue}
              className="gap-2 text-sm"
              title="Add all tasks whose Next Due date is in the past."
            >
              <Clock className="w-4 h-4" />
              Add All Overdue
            </Button>
          </div>

          <Accordion type="multiple" className="w-full">
            {allCategories.map((category) => {
              const categoryTasks = allTasksGrouped[category];
              const overdueCount = categoryTasks.filter(isTaskOverdue).length;

              return (
                <AccordionItem key={category} value={category} className="border-b">
                  <AccordionTrigger className="font-bold py-3 hover:no-underline">
                    <div className="flex justify-between w-full pr-4">
                      <span>{category} ({categoryTasks.length} tasks)</span>
                      {overdueCount > 0 && (
                        <span className="text-red-500 font-normal text-sm ml-4">({overdueCount} Overdue)</span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 py-2">
                      {categoryTasks.map((task) => (
                        <div key={task.id} className="flex items-start justify-between p-2 border rounded-md hover:bg-gray-50 transition-colors">
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id={`task-${task.id}`}
                              checked={selectedTasks.includes(task.id)}
                              onCheckedChange={(checked) => handleToggleTask(task.id, Boolean(checked))}
                              className="mt-1"
                            />
                            <Label htmlFor={`task-${task.id}`} className="cursor-pointer space-y-0.5 font-normal flex flex-col">
                              <span className="font-medium text-gray-700">{task.task}</span>
                              {task.taskSubtext && <span className="text-sm text-gray-500">{task.taskSubtext}</span>}
                            </Label>
                          </div>
                          <div className={`text-right text-sm font-medium shrink-0 ${isTaskOverdue(task) ? 'text-red-500' : 'text-gray-500'}`}>
                            {isTaskOverdue(task) && <span className="text-xs font-bold mr-1">OVERDUE</span>}
                            Due: {formatDate(task.nextMaintenance)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>

          <div className="mt-4 text-sm text-gray-600 border-t pt-3">
            <ListChecks className="w-4 h-4 inline mr-1" /> {selectedTasks.length} tasks selected for print.
          </div>
        </div>
      )}


      {/* Printable Content */}
      {(selectedPress && categoriesForPrint.length > 0) && (
        <div ref={printRef} className="print-content">
          <style>{`
@media print {
  body * {
    visibility: hidden;
  }
  .print-content, .print-content * {
    visibility: visible;
  }
  .print-content {
    position: absolute;
    left: 0;
    top: 0;
    width: 100%;
  }
  .no-print {
    display: none !important;
  }
  @page {
    size: A4;
    margin: 20mm;
  }
  .checklist-checkbox {
    width: 16px;
    height: 16px;
    border: 2px solid #000;
    display: inline-block;
    margin-right: 8px;
  }
}
`}</style>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="border-b border-gray-300 pb-4 mb-6">
              <h1 className="text-gray-900 mb-2">Maintenance Checklist</h1>
              {/* Removed Operator and Shift */}
              <div className="grid grid-cols-2 gap-4 text-gray-600">
                <div>
                  <strong>Press:</strong> {selectedPress}
                </div>
                <div>
                  <strong>Date:</strong> {formatDate(new Date())}
                </div>
              </div>
              {supervisorGuidance && (
                <div className="mt-4 p-3 border border-blue-300 bg-blue-50 text-blue-800 break-inside-avoid">
                  <strong>Guidance/Comments:</strong>
                  {/* Use whitespace-pre-wrap to preserve line breaks from Textarea */}
                  <p className="mt-1 whitespace-pre-wrap">{supervisorGuidance}</p>
                </div>
              )}
            </div>

            {categoriesForPrint.map((category) => {
              const categoryTasks = selectedTasksForPrint[category];

              return (
                <div key={category} className="mb-6 break-inside-avoid">
                  <h2 className="bg-gray-100 px-3 py-2 mb-3 border border-gray-300">
                    {category}
                  </h2>

                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="border-b-2 border-gray-300">
                        <th className="text-left py-2 px-2 w-12">☐</th>
                        <th className="text-left py-2 px-2">Task</th>
                        <th className="text-left py-2 px-2 w-48">Opmerkingen</th> {/* Existing Remarks Column */}
                        <th className="text-left py-2 px-2 w-[100px]">Last Done</th> {/* Width 100px */}
                        <th className="text-left py-2 px-2 w-[100px]">Next Due</th> {/* Width 100px */}
                        <th className="text-left py-2 px-2">Notes</th> {/* Operator Input Column (Remaining width) */}
                      </tr>
                    </thead>
                    <tbody>
                      {categoryTasks.map((task) => (
                        <tr key={task.id} className="border-b border-gray-200">
                          <td className="py-3 px-2 align-top">
                            <div className="checklist-checkbox"></div>
                          </td>
                          <td className="py-3 px-2 align-top">
                            <div>
                              <div className="mb-1">{task.task}</div>
                              {task.taskSubtext && (
                                <div className="text-gray-600">{task.taskSubtext}</div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-gray-600 align-top">
                            {/* Assuming task.remarks contains existing notes/remarks */}
                            {(task as any).remarks || '-'}
                          </td>
                          <td className="py-3 px-2 text-gray-600 align-top">
                            {formatDate(task.lastMaintenance)}
                          </td>
                          <td className="py-3 px-2 text-gray-600 align-top">
                            {formatDate(task.nextMaintenance)}
                          </td>
                          <td className="py-3 px-2 align-top">
                            <div className="border-b border-gray-300 h-6"></div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              );
            })}

            <div className="mt-8 pt-4 border-t border-gray-300">
              {/* Retained signature boxes for manual sign-off */}
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="mb-2"><strong>Operator Signature:</strong></p>
                  <div className="border-b-2 border-gray-400 h-8"></div>
                </div>
                <div>
                  <p className="mb-2"><strong>Supervisor Signature:</strong></p>
                  <div className="border-b-2 border-gray-400 h-8"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty States */}
      {!selectedPress && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center text-gray-500">
          Please select a press to generate the checklist
        </div>
      )}

      {(selectedPress && selectedTasks.length === 0) && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center text-gray-500">
          Select at least one task for printing using the list above.
        </div>
      )}
    </div>
  );
}