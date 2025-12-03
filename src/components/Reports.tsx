import { useState, useRef } from 'react';
import { MaintenanceTask } from './AuthContext';
import { useAuth, PressType } from './AuthContext';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Printer } from 'lucide-react';

interface ReportsProps {
  tasks: MaintenanceTask[];
}

export function Reports({ tasks }: ReportsProps) {
  const { presses } = useAuth();
  const [selectedPress, setSelectedPress] = useState<PressType | 'all'>('all');
  const printRef = useRef<HTMLDivElement>(null);

  const formatDate = (date: Date | null): string => {
    if (!date) return 'N/A';
    const d = new Date(date);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}/${month}/${day}`;
  };

  const getOverdueTasks = (press?: PressType) => {
    const today = new Date();
    let filteredTasks = tasks.filter(task => {
      const next = new Date(task.nextMaintenance);
      return next < today;
    });

    if (press) {
      filteredTasks = filteredTasks.filter(task => task.press === press);
    }

    return filteredTasks;
  };

  const getDueSoonTasks = (press?: PressType) => {
    const today = new Date();
    const weekFromNow = new Date(today);
    weekFromNow.setDate(weekFromNow.getDate() + 7);

    let filteredTasks = tasks.filter(task => {
      const next = new Date(task.nextMaintenance);
      return next >= today && next <= weekFromNow;
    });

    if (press) {
      filteredTasks = filteredTasks.filter(task => task.press === press);
    }

    return filteredTasks;
  };

  const handlePrint = () => {
    window.print();
  };

  const activePresses = presses.filter(p => p.active && !p.archived);
  const pressesToShow = selectedPress === 'all'
    ? activePresses.map(p => p.name as PressType)
    : [selectedPress as PressType];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between no-print">
        <div>
          <h2 className="text-gray-900">Maintenance Reports</h2>
          <p className="text-gray-600 mt-1">
            View and print overdue and upcoming maintenance tasks
          </p>
        </div>
        <Button onClick={handlePrint} className="gap-2">
          <Printer className="w-4 h-4" />
          Print Report
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 no-print">
        <div className="grid gap-4 max-w-xs">
          <div className="grid gap-2">
            <Label>Select Press</Label>
            <Select value={selectedPress} onValueChange={(value) => setSelectedPress(value as PressType | 'all')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Presses</SelectItem>
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
          }
        `}</style>

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-6">
          <div className="mb-6">
            <h1 className="text-gray-900 mb-2">Maintenance Report</h1>
            <p className="text-gray-600">
              Generated on {formatDate(new Date())}
            </p>
          </div>

          {pressesToShow.map((press) => {
            const overdueTasks = getOverdueTasks(press);
            const dueSoonTasks = getDueSoonTasks(press);

            return (
              <div key={press} className="mb-8 break-inside-avoid">
                <div className="border-b border-gray-200 pb-2 mb-4">
                  <h2 className="text-gray-900 flex items-center gap-2">
                    {press}
                    <Badge variant="secondary">
                      {overdueTasks.length + dueSoonTasks.length} tasks
                    </Badge>
                  </h2>
                </div>

                {/* Overdue Tasks */}
                {overdueTasks.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-red-700 mb-3 flex items-center gap-2">
                      Overdue Tasks
                      <Badge className="bg-red-500">{overdueTasks.length}</Badge>
                    </h3>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 text-gray-700">Task</th>
                          <th className="text-left py-2 text-gray-700">Category</th>
                          <th className="text-left py-2 text-gray-700">Due Date</th>
                          <th className="text-left py-2 text-gray-700">Days Overdue</th>
                          <th className="text-left py-2 text-gray-700">Assigned To</th>
                        </tr>
                      </thead>
                      <tbody>
                        {overdueTasks.map((task) => {
                          const today = new Date();
                          const dueDate = new Date(task.nextMaintenance);
                          const daysOverdue = Math.ceil((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));

                          return (
                            <tr key={task.id} className="border-b border-gray-100">
                              <td className="py-2">
                                <div>
                                  <div>{task.task}</div>
                                  {task.taskSubtext && (
                                    <div className="text-gray-500">{task.taskSubtext}</div>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 text-gray-600">{task.category}</td>
                              <td className="py-2 text-gray-600">{formatDate(task.nextMaintenance)}</td>
                              <td className="py-2 text-red-600">{daysOverdue} days</td>
                              <td className="py-2 text-gray-600">{task.assignedTo}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Due Soon Tasks */}
                {dueSoonTasks.length > 0 && (
                  <div className="mb-6">
                    <h3 className="text-orange-700 mb-3 flex items-center gap-2">
                      Due This Week
                      <Badge className="bg-orange-500">{dueSoonTasks.length}</Badge>
                    </h3>
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-2 text-gray-700">Task</th>
                          <th className="text-left py-2 text-gray-700">Category</th>
                          <th className="text-left py-2 text-gray-700">Due Date</th>
                          <th className="text-left py-2 text-gray-700">Days Until Due</th>
                          <th className="text-left py-2 text-gray-700">Assigned To</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dueSoonTasks.map((task) => {
                          const today = new Date();
                          const dueDate = new Date(task.nextMaintenance);
                          const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

                          return (
                            <tr key={task.id} className="border-b border-gray-100">
                              <td className="py-2">
                                <div>
                                  <div>{task.task}</div>
                                  {task.taskSubtext && (
                                    <div className="text-gray-500">{task.taskSubtext}</div>
                                  )}
                                </div>
                              </td>
                              <td className="py-2 text-gray-600">{task.category}</td>
                              <td className="py-2 text-gray-600">{formatDate(task.nextMaintenance)}</td>
                              <td className="py-2 text-orange-600">{daysUntil} days</td>
                              <td className="py-2 text-gray-600">{task.assignedTo}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {overdueTasks.length === 0 && dueSoonTasks.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    No overdue or upcoming tasks for {press}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
