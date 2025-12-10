import { useEffect, useState, Profiler, lazy, Suspense, startTransition } from 'react';
import { AuthProvider, useAuth, MaintenanceTask } from './components/AuthContext';
import { GroupedTask } from './components/AuthContext';
import { LoginForm } from './components/LoginForm';
import { Header } from './components/Header';
import { AddMaintenanceDialog } from './components/AddMaintenanceDialog';
import { ScrollToTop } from './components/ScrollToTop';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './components/ui/tabs';
import { Toaster, toast } from 'sonner';

// Lazy Imports
const MaintenanceTable = lazy(() => import('./components/MaintenanceTable').then(m => ({ default: m.MaintenanceTable })));
const OperatorManagement = lazy(() => import('./components/OperatorManagement').then(m => ({ default: m.OperatorManagement })));
const CategoryManagement = lazy(() => import('./components/CategoryManagement').then(m => ({ default: m.CategoryManagement })));
const ActivityLog = lazy(() => import('./components/ActivityLog').then(m => ({ default: m.ActivityLog })));
const PasswordManagement = lazy(() => import('./components/PasswordManagement').then(m => ({ default: m.PasswordManagement })));
const PressManagement = lazy(() => import('./components/PressManagement').then(m => ({ default: m.PressManagement })));
const Reports = lazy(() => import('./components/Reports').then(m => ({ default: m.Reports })));
const MaintenanceChecklist = lazy(() => import('./components/MaintenanceChecklist').then(m => ({ default: m.MaintenanceChecklist })));
const Drukwerken = lazy(() => import('./components/Drukwerken').then(m => ({ default: m.Drukwerken })));

function MainApp() {
  const {
    user,
    addActivityLog,
    presses,
    tasks: groupedTasks,
    addTask,
    updateTask,
    deleteTask,
    fetchTasks,
    fetchActivityLogs,
    fetchUserAccounts
  } = useAuth();

  // Flatten grouped tasks for specific views (like Reports)
  const tasks: MaintenanceTask[] = groupedTasks.flatMap(group =>
    group.subtasks.map(subtask => ({
      ...subtask,
      task: subtask.subtaskName,
      taskSubtext: subtask.subtext,
      category: group.category,
      press: group.press,
      opmerkingen: subtask.comment,
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    }))
  );

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<MaintenanceTask | null>(null);
  const [editingGroup, setEditingTaskGroup] = useState<MaintenanceTask[] | null>(null);

  // State initialization
  const [selectedPress, setSelectedPress] = useState<string>(() => {
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

  // Effects for persistence
  useEffect(() => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('activeTab', activeTab);
    }
  }, [activeTab]);

  useEffect(() => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('selectedPress', selectedPress);
    }
  }, [selectedPress]);

  // Data fetching based on tab
  useEffect(() => {
    if (activeTab === 'tasks') fetchTasks();
    else if (activeTab === 'logs') fetchActivityLogs();
    else if (activeTab === 'passwords') fetchUserAccounts();
  }, [activeTab, fetchTasks, fetchActivityLogs, fetchUserAccounts]);

  // Scroll position handling
  useEffect(() => {
    const scrollKey = 'scrollPosition';
    if (typeof sessionStorage !== 'undefined') {
      try {
        const savedPosition = sessionStorage.getItem(scrollKey);
        if (savedPosition) window.scrollTo(0, parseInt(savedPosition));

        const handleScroll = () => sessionStorage.setItem(scrollKey, window.scrollY.toString());
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
      } catch (e) {
        console.warn('Session storage error:', e);
      }
    }
  }, []);

  // --- Handlers ---

  const handleAddTask = (task: Omit<MaintenanceTask, 'id' | 'created' | 'updated'>) => {
    const newTask = { ...task, created: new Date().toISOString(), updated: new Date().toISOString() };
    addTask(newTask);
    setIsAddDialogOpen(false);
    addActivityLog({
      user: user?.name || user?.username || 'Unknown',
      action: 'Created',
      entity: 'Task',
      entityId: 'new',
      entityName: task.task,
      details: `Created new task in ${task.category}`,
      press: task.press
    });
  };

  const handleEditTask = async (task: MaintenanceTask) => {
    const oldTask = tasks.find(t => t.id === task.id);
    await updateTask(task);
    setEditingTask(null);

    // Activity Log logic for updates
    if (oldTask) {
      const changes: string[] = [];
      if (oldTask.lastMaintenance?.getTime() !== task.lastMaintenance?.getTime()) changes.push('last maintenance date');
      if (oldTask.assignedTo !== task.assignedTo) changes.push('assigned operator');
      if (oldTask.opmerkingen !== task.opmerkingen) changes.push('opmerkingen');

      if (changes.length > 0) {
        addActivityLog({
          user: user?.name || user?.username || 'Unknown',
          action: 'Updated',
          entity: 'Task',
          entityId: task.id,
          entityName: task.task,
          details: `Updated ${changes.join(', ')}`,
          press: task.press
        });
      }
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
        if (task.id) await updateTask(task);
        else {
          const { id, ...rest } = task;
          await addTask({ ...rest, created: rest.created || new Date().toISOString(), updated: new Date().toISOString() });
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

  if (!user) return <LoginForm />;

  // Filter tasks for 'press' role
  const filteredTasks = user.role === 'press'
    ? groupedTasks.filter(group => group.press === user.press)
    : groupedTasks;

  const activePresses = presses.filter(p => p.active && !p.archived);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <Toaster position="top-right" />
      <ScrollToTop /> {/* Ensure this is used if imported */}

      {/* --- NEW HEADER INTEGRATION --- */}
      {/* The Header now handles the Navigation Tabs and Admin Actions */}
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* --- ADMIN / MEESTERGAST VIEW --- */}
        {(user.role === 'admin' || user.role === 'meestergast') && (
          <Suspense fallback={<div className="p-4 text-center text-gray-500">Loading modules...</div>}>

            {/* TASKS VIEW: Contains Press Selection Tabs */}
            {activeTab === 'tasks' && (
              <div className="space-y-3">
                <Tabs value={selectedPress} onValueChange={(value) => startTransition(() => setSelectedPress(value as string))} className="space-y-3">
                  <TabsList>
                    {activePresses.map(press => (
                      <TabsTrigger key={press.id} value={press.name}>{press.name}</TabsTrigger>
                    ))}
                  </TabsList>

                  <TabsContent value={selectedPress}>
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
                      onUpdate={async (task) => await startTransition(() => handleEditTask(task))}
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

            {/* OTHER MODULES */}
            {activeTab === 'drukwerken' && <Drukwerken presses={activePresses} />}
            {activeTab === 'reports' && <Reports tasks={tasks} />}
            {activeTab === 'checklist' && <MaintenanceChecklist tasks={tasks} />}
            {activeTab === 'operators' && <OperatorManagement />}
            {activeTab === 'categories' && <CategoryManagement />}
            {activeTab === 'presses' && user.role === 'admin' && <PressManagement />}
            {activeTab === 'passwords' && user.role === 'admin' && <PasswordManagement />}
            {activeTab === 'logs' && <ActivityLog />}
          </Suspense>
        )}

        {/* --- PRESS ROLE VIEW --- */}
        {user.role === 'press' && (
          <Suspense fallback={<div className="p-4 text-center text-gray-500">Loading...</div>}>
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
                onUpdate={async (task: MaintenanceTask) => await startTransition(() => handleEditTask(task))}
              />
            )}
            {activeTab === 'drukwerken' && <Drukwerken presses={presses.filter(p => p.name === user.press)} />}
          </Suspense>
        )}

        {/* --- GENERIC USER ROLE VIEW --- */}
        {user.role === 'user' && (
          <Suspense fallback={<div className="p-4 text-center text-gray-500">Loading...</div>}>
            <MaintenanceTable
              tasks={filteredTasks}
              onEdit={(task: MaintenanceTask) => {
                startTransition(() => {
                  setEditingTask(task);
                  setIsAddDialogOpen(true);
                });
              }}
              onDelete={handleDeleteTask}
              onUpdate={async (task: MaintenanceTask) => await startTransition(() => handleEditTask(task))}
            />
          </Suspense>
        )}

        <AddMaintenanceDialog
          open={isAddDialogOpen}
          onOpenChange={(open) => startTransition(() => setIsAddDialogOpen(open))}
          onSubmit={async (task) => {
            await startTransition(async () => {
              if (editingTask) await handleEditTask({ ...editingTask, ...task } as MaintenanceTask);
              else await handleAddTask(task);
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

// Performance Profiler Callback
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
    // console.warn(`[Profiler] ${id} ${phase} took ${actualDuration.toFixed(2)} ms`);
  }
}

function App() {
  // Initial demo data (kept from your original code)
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
          comment: 'Completed on schedule.',
          commentDate: new Date('2025-10-15T14:30:00')
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