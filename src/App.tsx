import { useEffect, useState, Profiler, lazy, Suspense, startTransition } from 'react';
import { AuthProvider, useAuth, MaintenanceTask } from './components/AuthContext';
import { GroupedTask } from './components/AuthContext';
import { LoginForm } from './components/LoginForm';
import { Header } from './components/Header'; // Import the new Header component
const MaintenanceTable = lazy(() => import('./components/MaintenanceTable').then(m => ({ default: m.MaintenanceTable })));
import { AddMaintenanceDialog } from './components/AddMaintenanceDialog';
const OperatorManagement = lazy(() => import('./components/OperatorManagement').then(m => ({ default: m.OperatorManagement })));
const CategoryManagement = lazy(() => import('./components/CategoryManagement').then(m => ({ default: m.CategoryManagement })));
const ActivityLog = lazy(() => import('./components/ActivityLog').then(m => ({ default: m.ActivityLog })));
const PasswordManagement = lazy(() => import('./components/PasswordManagement').then(m => ({ default: m.PasswordManagement })));
const PressManagement = lazy(() => import('./components/PressManagement').then(m => ({ default: m.PressManagement })));
const Reports = lazy(() => import('./components/Reports').then(m => ({ default: m.Reports })));
const MaintenanceChecklist = lazy(() => import('./components/MaintenanceChecklist').then(m => ({ default: m.MaintenanceChecklist })));
const Drukwerken = lazy(() => import('./components/Drukwerken').then(m => ({ default: m.Drukwerken })));

import { ScrollToTop } from './components/ScrollToTop';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Button } from './components/ui/button';
import { ClipboardList, Users, FileText, Key, Printer, ListChecks, Factory, Tags, Wrench, LogOut } from 'lucide-react';
import { Toaster, toast } from 'sonner';

function MainApp() {
  const { user, logout, addActivityLog, presses, tasks: groupedTasks, addTask, updateTask, deleteTask, fetchTasks, fetchActivityLogs, fetchUserAccounts } = useAuth();
  const tasks: MaintenanceTask[] = groupedTasks.flatMap(group =>
    group.subtasks.map(subtask => ({
      ...subtask,
      task: subtask.subtaskName,
      taskSubtext: subtask.subtext,
      category: group.category,
      press: group.press,
      opmerkingen: subtask.comment,
      // Ensure these exist or are mapped correctly
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    }))
  );

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<MaintenanceTask | null>(null);
  const [editingGroup, setEditingTaskGroup] = useState<MaintenanceTask[] | null>(null);
  const [selectedPress, setSelectedPress] = useState<string>(() => { // Changed type from PressType to string
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem('selectedPress') || 'Lithoman';
    }
    return 'Lithoman';
  });
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem('activeTab') || 'tasks';
    }
    return 'tasks';
  });

  // Persist active tab
  useEffect(() => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('activeTab', activeTab);
    }
  }, [activeTab]);

  // Persist selected press
  useEffect(() => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('selectedPress', selectedPress);
    }
  }, [selectedPress]);

  // Lazy loading based on active tab
  useEffect(() => {
    if (activeTab === 'tasks') {
      fetchTasks();
    } else if (activeTab === 'logs') {
      fetchActivityLogs();
    } else if (activeTab === 'passwords') {
      fetchUserAccounts();
    }
  }, [activeTab, fetchTasks, fetchActivityLogs, fetchUserAccounts]);

  // Scroll Persistence
  useEffect(() => {
    const scrollKey = 'scrollPosition';
    // Safety check for sessionStorage
    if (typeof sessionStorage !== 'undefined') {
      try {
        const savedPosition = sessionStorage.getItem(scrollKey);

        if (savedPosition) {
          window.scrollTo(0, parseInt(savedPosition));
        }

        const handleScroll = () => {
          sessionStorage.setItem(scrollKey, window.scrollY.toString());
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
      } catch (e) {
        console.warn('Session storage is not available:', e);
      }
    }
  }, []);

  const handleAddTask = (task: Omit<MaintenanceTask, 'id' | 'created' | 'updated'>) => {
    const newTask = {
      ...task,
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };
    addTask(newTask);
    setIsAddDialogOpen(false);

    addActivityLog({
      user: user?.name || user?.username || 'Unknown',
      action: 'Created',
      entity: 'Task',
      entityId: 'new', // ID is generated in context
      entityName: task.task,
      details: `Created new task in ${task.category} category`,
      press: task.press
    });
  };

  const handleEditTask = async (task: MaintenanceTask) => {
    const oldTask = tasks.find(t => t.id === task.id);
    await updateTask(task);
    setEditingTask(null);

    if (oldTask) {
      const changes: string[] = [];
      let oldValue = '';
      let newValue = '';

      if (oldTask.lastMaintenance?.getTime() !== task.lastMaintenance?.getTime()) {
        changes.push('last maintenance date');
        const formatDate = (d: Date | null) => d ? d.toISOString().split('T')[0] : 'N/A';
        oldValue = formatDate(oldTask.lastMaintenance);
        newValue = formatDate(task.lastMaintenance);
      }
      if (oldTask.assignedTo !== task.assignedTo) {
        changes.push('assigned operator');
        oldValue = oldValue ? `${oldValue}, ${oldTask.assignedTo}` : oldTask.assignedTo;
        newValue = newValue ? `${newValue}, ${task.assignedTo}` : task.assignedTo;
      }
      if (oldTask.opmerkingen !== task.opmerkingen) {
        changes.push('opmerkingen');
        if (!oldValue) {
          oldValue = oldTask.opmerkingen || 'empty';
          newValue = task.opmerkingen || 'empty';
        }
      }
      if (oldTask.task !== task.task || oldTask.category !== task.category) {
        changes.push('task details');
      }

      addActivityLog({
        user: user?.name || user?.username || 'Unknown',
        action: 'Updated',
        entity: 'Task',
        entityId: task.id,
        entityName: task.task,
        details: `Updated ${changes.join(', ')}`,
        oldValue: oldValue || undefined,
        newValue: newValue || undefined,
        press: task.press
      });
    }
  };

  const handleDeleteTask = (id: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      deleteTask(id);
      addActivityLog({
        user: user?.name || user?.username || 'Unknown',
        action: 'Deleted',
        entity: 'Task',
        entityId: id,
        entityName: task.task,
        details: 'Deleted task',
        press: task.press
      });
    }
  };

  const handleUpdateGroup = async (tasks: MaintenanceTask[]) => {
    try {
      for (const task of tasks) {
        if (task.id) {
          await updateTask(task);
        } else {
          const { id, ...rest } = task;
          // Ensure created/updated are present if missing, though they should be in MaintenanceTask
          const newTask = {
            ...rest,
            created: rest.created || new Date().toISOString(),
            updated: new Date().toISOString()
          };
          await addTask(newTask);
        }
      }
      setIsAddDialogOpen(false);
      setEditingTask(null);
      setEditingTaskGroup(null);
      toast.success('Group updated successfully');
    } catch (error) {
      console.error('Failed to update group:', error);
      toast.error('Failed to update group');
    }
  };

  if (!user) {
    return <LoginForm />;
  }

  // Filter tasks by press for press users
  const filteredTasks = user.role === 'press'
    ? groupedTasks.filter(group => group.press === user.press)
    : groupedTasks;

  // Get active presses for tabs
  const activePresses = presses.filter(p => p.active && !p.archived);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <Toaster position="top-right" />

      {/* Header */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {(user.role === 'admin' || user.role === 'meestergast') && (
          <Suspense fallback={<div className="p-4 text-center text-gray-500">Loading…</div>}>
            {activeTab === 'tasks' && (
              <div className="space-y-3">
                <Tabs value={selectedPress} onValueChange={(value) => startTransition(() => setSelectedPress(value as string))} className="space-y-3">
                  <TabsList>
                    {activePresses.map(press => (
                      <TabsTrigger key={press.id} value={press.name}>{press.name}</TabsTrigger>
                    ))}
                  </TabsList>

                  <TabsContent value={selectedPress}> {/* Changed to use selectedPress directly */}
                      <MaintenanceTable
                        tasks={groupedTasks.filter(group => group.press === selectedPress)}
                        onEdit={(task) => {
                          startTransition(() => {
                            setEditingTask(task);
                            setEditingTaskGroup(null);
                            setIsAddDialogOpen(true);
                          });
                        }}
                        onDelete={handleDeleteTask}
                        onUpdate={async (task) => {
                          await startTransition(() => handleEditTask(task));
                        }}
                        onEditGroup={(groupTasks) => {
                          startTransition(() => {
                            setEditingTaskGroup(groupTasks.subtasks.map(subtask => ({
                              id: subtask.id,
                              task: subtask.subtaskName,
                              taskSubtext: subtask.subtext,
                              category: groupTasks.category,
                              press: groupTasks.press,
                              lastMaintenance: subtask.lastMaintenance,
                              nextMaintenance: subtask.nextMaintenance,
                              maintenanceInterval: subtask.maintenanceInterval,
                              maintenanceIntervalUnit: subtask.maintenanceIntervalUnit,
                              assignedTo: subtask.assignedTo,
                              opmerkingen: subtask.comment,
                              commentDate: subtask.commentDate,
                              created: new Date().toISOString(),
                              updated: new Date().toISOString()
                            })));
                            setEditingTask(null);
                            setIsAddDialogOpen(true);
                          });
                        }}
                        onAddTask={() => {
                          startTransition(() => {
                            setEditingTask(null);
                            setEditingTaskGroup(null);
                            setIsAddDialogOpen(true);
                          });
                        }}
                      />
                  </TabsContent>
                </Tabs>
              </div>
            )}
            {activeTab === 'drukwerken' && <Drukwerken
              presses={activePresses}
            />}

            {activeTab === 'reports' && <Reports tasks={tasks} />}
            {activeTab === 'checklist' && <MaintenanceChecklist tasks={tasks} />}
            {activeTab === 'operators' && <OperatorManagement />}
            {activeTab === 'categories' && <CategoryManagement />}
            {activeTab === 'presses' && user.role === 'admin' && <PressManagement />}
            {activeTab === 'passwords' && user.role === 'admin' && <PasswordManagement />}
            {activeTab === 'logs' && <ActivityLog />}
          </Suspense>
        )}

        {user.role === 'press' && (
          <Suspense fallback={<div className="p-4 text-center text-gray-500">Loading…</div>}>
            {activeTab === 'tasks' && (
              <MaintenanceTable
                tasks={filteredTasks}
                onEdit={(task: MaintenanceTask) => {
                  startTransition(() => {
                    setEditingTask(task);
                    setIsAddDialogOpen(true);
                  });
                }}
                onDelete={handleDeleteTask}
                onUpdate={async (task: MaintenanceTask) => {
                  await startTransition(() => handleEditTask(task));
                }}
              />
            )}
            {activeTab === 'drukwerken' && (
              <Drukwerken
                presses={presses.filter(p => p.name === user.press)}
              />
            )}
          </Suspense>
        )}

        {user.role === 'user' && (
          <Suspense fallback={<div className="p-4 text-center text-gray-500">Loading…</div>}>
            <MaintenanceTable
              tasks={filteredTasks}
              onEdit={(task: MaintenanceTask) => {
                startTransition(() => {
                  setEditingTask(task);
                  setIsAddDialogOpen(true);
                });
              }}
              onDelete={handleDeleteTask}
              onUpdate={async (task: MaintenanceTask) => {
                await startTransition(() => handleEditTask(task));
              }}
            />
          </Suspense>
        )}

        <AddMaintenanceDialog
          open={isAddDialogOpen}
          onOpenChange={(open) => startTransition(() => setIsAddDialogOpen(open))}
          onSubmit={async (task) => {
            await startTransition(async () => {
              if (editingTask) {
                await handleEditTask({ ...editingTask, ...task } as MaintenanceTask);
              } else {
                await handleAddTask(task);
              }
            });
          }}
          editTask={editingTask}
          initialGroup={editingGroup || undefined}
          onUpdateGroup={handleUpdateGroup}
        />
      </main>




    </div>
  );
}

function onRenderCallback(
  id: string,
  phase: 'mount' | 'update' | 'nested-update',
  actualDuration: number,
  _baseDuration: number,
  _startTime: number,
  _commitTime: number,
  _interactions?: Set<any>
) {
  if (actualDuration > 16) {
    console.warn(`[Profiler] ${id} ${phase} took ${actualDuration.toFixed(2)} ms`);
  }
}

function App() {
  const [tasks] = useState<GroupedTask[]>([
    {
      id: '1',
      taskName: 'HVAC System Maintenance',
      taskSubtext: 'Comprehensive maintenance for all HVAC units',
      category: 'HVAC',
      press: 'Lithoman',
      subtasks: [
        {
          id: '1-1',
          subtaskName: 'Filter Replacement',
          subtext: 'All air handling units',
          lastMaintenance: new Date('2025-10-15'),
          nextMaintenance: new Date('2026-01-15'),
          maintenanceInterval: 3,
          maintenanceIntervalUnit: 'months',
          assignedTo: 'John Smith',
          comment: 'Completed on schedule. All filters replaced successfully.',
          commentDate: new Date('2025-10-15T14:30:00')
        },
        {
          id: '1-2',
          subtaskName: 'Coil Cleaning',
          subtext: 'Evaporator and condenser coils',
          lastMaintenance: new Date('2025-09-20'),
          nextMaintenance: new Date('2025-12-20'),
          maintenanceInterval: 3,
          maintenanceIntervalUnit: 'months',
          assignedTo: 'John Smith',
          comment: 'Coils cleaned and inspected. No issues found.',
          commentDate: new Date('2025-09-20T10:00:00')
        }
      ]
    },
    {
      id: '2',
      taskName: 'Safety Equipment Checks',
      taskSubtext: 'Regular inspection of all safety gear',
      category: 'Safety',
      press: 'C80',
      subtasks: [
        {
          id: '2-1',
          subtaskName: 'Fire Extinguisher Inspection',
          subtext: 'All floors - 45 units total',
          lastMaintenance: new Date('2025-09-01'),
          nextMaintenance: new Date('2025-12-01'),
          maintenanceInterval: 3,
          maintenanceIntervalUnit: 'months',
          assignedTo: 'Sarah Johnson',
          comment: 'All extinguishers passed inspection.',
          commentDate: new Date('2025-09-01T09:15:00')
        }
      ]
    },
    {
      id: '3',
      taskName: 'Lighting Inspection',
      taskSubtext: 'Check all overhead lights',
      category: 'Building',
      press: 'Lithoman',
      subtasks: [
        {
          id: '3-1',
          subtaskName: 'Replace flicker tubes',
          subtext: 'Main hall',
          lastMaintenance: new Date('2025-11-01'),
          nextMaintenance: new Date('2026-02-01'),
          maintenanceInterval: 3,
          maintenanceIntervalUnit: 'months',
          assignedTo: 'Mike Chen',
          comment: '',
          commentDate: null
        }
      ]
    }
  ]);

  return (
    <AuthProvider tasks={tasks}>
      <Profiler id="MainApp" onRender={onRenderCallback}>
        <MainApp />
      </Profiler>
    </AuthProvider>
  );
}

export default App;
