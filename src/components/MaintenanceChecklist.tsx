import { useState, useRef } from 'react';
import { MaintenanceTask } from './AuthContext';
import { useAuth, PressType } from './AuthContext';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Printer } from 'lucide-react';

interface MaintenanceChecklistProps {
  tasks: MaintenanceTask[];
}

export function MaintenanceChecklist({ tasks }: MaintenanceChecklistProps) {
  const { presses } = useAuth();
  const [selectedPress, setSelectedPress] = useState<PressType | ''>('');
  const printRef = useRef<HTMLDivElement>(null);

  const formatDate = (date: Date | null): string => {
    if (!date) return 'N/A';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year} /${month}/${day} `;
  };

  const handlePrint = () => {
    if (!selectedPress) {
      return;
    }
    window.print();
  };

  const activePresses = presses.filter(p => p.active && !p.archived);
  const pressTasksGrouped = selectedPress
    ? tasks.filter(task => task.press === selectedPress).reduce((acc, task) => {
      if (!acc[task.category]) {
        acc[task.category] = [];
      }
      acc[task.category].push(task);
      return acc;
    }, {} as Record<string, MaintenanceTask[]>)
    : {};

  const categories = Object.keys(pressTasksGrouped).sort();

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
          disabled={!selectedPress}
        >
          <Printer className="w-4 h-4" />
          Print Checklist
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 no-print">
        <div className="grid gap-4 max-w-xs">
          <div className="grid gap-2">
            <Label>Select Press</Label>
            <Select value={selectedPress} onValueChange={(value) => setSelectedPress(value as PressType)}>
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
        </div>
      </div>

      {/* Printable Content */}
      {selectedPress && (
        <div ref={printRef} className="print-content">
          <style>{`
@media print {
  body * {
    visibility: hidden;
  }
    .print - content, .print - content * {
      visibility: visible;
    }
      .print - content {
    position: absolute;
    left: 0;
    top: 0;
    width: 100 %;
  }
              .no - print {
    display: none!important;
  }
  @page {
    size: A4;
    margin: 20mm;
  }
              .checklist - checkbox {
    width: 16px;
    height: 16px;
    border: 2px solid #000;
    display: inline - block;
    margin - right: 8px;
  }
}
`}</style>

          <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
            <div className="border-b border-gray-300 pb-4 mb-6">
              <h1 className="text-gray-900 mb-2">Maintenance Checklist</h1>
              <div className="grid grid-cols-2 gap-4 text-gray-600">
                <div>
                  <strong>Press:</strong> {selectedPress}
                </div>
                <div>
                  <strong>Date:</strong> {formatDate(new Date())}
                </div>
                <div>
                  <strong>Operator:</strong> ___________________________
                </div>
                <div>
                  <strong>Shift:</strong> ___________________________
                </div>
              </div>
            </div>

            {categories.map((category) => {
              const categoryTasks = pressTasksGrouped[category];

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
                        <th className="text-left py-2 px-2 w-32">Last Done</th>
                        <th className="text-left py-2 px-2 w-32">Next Due</th>
                        <th className="text-left py-2 px-2 w-48">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {categoryTasks.map((task) => (
                        <tr key={task.id} className="border-b border-gray-200">
                          <td className="py-3 px-2 align-top">
                            <div className="checklist-checkbox"></div>
                          </td>
                          <td className="py-3 px-2">
                            <div>
                              <div className="mb-1">{task.task}</div>
                              {task.taskSubtext && (
                                <div className="text-gray-600">{task.taskSubtext}</div>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-2 text-gray-600">
                            {formatDate(task.lastMaintenance)}
                          </td>
                          <td className="py-3 px-2 text-gray-600">
                            {formatDate(task.nextMaintenance)}
                          </td>
                          <td className="py-3 px-2">
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

      {!selectedPress && (
        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-12 text-center text-gray-500">
          Please select a press to generate the checklist
        </div>
      )}
    </div>
  );
}
