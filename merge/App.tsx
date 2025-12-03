import { useEffect, useState, Profiler, lazy, Suspense } from 'react';
import { AuthProvider, useAuth, PressType, MaintenanceTask } from './components/AuthContext';
import { LoginForm } from './components/LoginForm';
const MaintenanceTable = lazy(() => import('./components/MaintenanceTable').then(m => ({ default: m.MaintenanceTable })));
const AddMaintenanceDialog = lazy(() => import('./components/AddMaintenanceDialog').then(m => ({ default: m.AddMaintenanceDialog })));
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
import { Plus, ClipboardList, Users, FileText, Key, Printer, ListChecks, Factory, Tags, Wrench, LogOut } from 'lucide-react';
import { Toaster, toast } from 'sonner';

function MainApp() {
  const { user, logout, addActivityLog, presses, tasks, addTask, updateTask, deleteTask, fetchTasks, fetchActivityLogs, fetchUserAccounts } = useAuth();

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<MaintenanceTask | null>(null);
  const [editingGroup, setEditingGroup] = useState<MaintenanceTask[] | null>(null);
  const [selectedPress, setSelectedPress] = useState<PressType>('Lithoman');
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

  const handleDeleteTask = (id: string, taskName: string) => {
    const task = tasks.find(t => t.id === id);
    if (task) {
      deleteTask(id);
      addActivityLog({
        user: user?.name || user?.username || 'Unknown',
        action: 'Deleted',
        entity: 'Task',
        entityId: id,
        entityName: taskName,
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
      setEditingGroup(null);
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
    ? tasks.filter(task => task.press === user.press)
    : tasks;

  // Get active presses for tabs
  const activePresses = presses.filter(p => p.active && !p.archived);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <Toaster position="top-right" />

      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <Wrench className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
              Maintenance Manager
            </h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-6 mr-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-sm font-medium text-gray-600">All Systems Operational</span>
              </div>
              <div className="h-4 w-px bg-gray-200"></div>
              <div className="text-sm text-gray-500">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
            </div>

            <div className="flex items-center gap-3 pl-4 border-l border-gray-200">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">{user?.name || user?.username}</div>
                <div className="text-xs text-gray-500 capitalize">{user?.role}</div>
              </div>
              <Button variant="ghost" size="icon" onClick={logout}>
                <LogOut className="w-5 h-5 text-gray-500 hover:text-red-600" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {user.role === 'admin' || user.role === 'meestergast' ? (
          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="ml-4">
                <TabsTrigger value="tasks" className="gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Taken
                </TabsTrigger>
                <TabsTrigger value="drukwerken" className="gap-2">
                  <Printer className="w-4 h-4" />
                  Drukwerken
                </TabsTrigger>
                <TabsTrigger value="reports" className="gap-2">
                  <Printer className="w-4 h-4" />
                  Rapport
                </TabsTrigger>
                <TabsTrigger value="checklist" className="gap-2">
                  <ListChecks className="w-4 h-4" />
                  Checklist
                </TabsTrigger>
                <TabsTrigger value="operators" className="gap-2">
                  <Users className="w-4 h-4" />
                  Personeel
                </TabsTrigger>
                <TabsTrigger value="categories" className="gap-2">
                  <Tags className="w-4 h-4" />
                  Categorieën
                </TabsTrigger>
                {user.role === 'admin' && (
                  <TabsTrigger value="presses" className="gap-2">
                    <Factory className="w-4 h-4" />
                    Persen
                  </TabsTrigger>
                )}
                {user.role === 'admin' && (
                  <TabsTrigger value="passwords" className="gap-2">
                    <Key className="w-4 h-4" />
                    Accounts
                  </TabsTrigger>
                )}
                <TabsTrigger value="logs" className="gap-2">
                  <FileText className="w-4 h-4" />
                  Logboek
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Suspense fallback={<div className="p-4 text-center text-gray-500">Loading…</div>}>
              {activeTab === 'tasks' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h1 className="text-gray-900">Tasks Overview</h1>
                      <p className="text-gray-600 mt-1">
                        Manage and track all maintenance tasks and schedules
                      </p>
                    </div>
                    <Button onClick={() => {
                      setEditingTask(null);
                      setEditingGroup(null);
                      setIsAddDialogOpen(true);
                    }} className="gap-2">
                      <Plus className="w-4 h-4" />
                      Add Task
                    </Button>
                  </div>

                  <Tabs value={selectedPress} onValueChange={(value) => setSelectedPress(value as PressType)} className="space-y-4">
                    <TabsList>
                      {activePresses.map(press => (
                        <TabsTrigger key={press.id} value={press.name}>{press.name}</TabsTrigger>
                      ))}
                    </TabsList>

                    {activePresses.map(press => (
                      <TabsContent key={press.id} value={press.name}>
                        <MaintenanceTable
                          tasks={tasks.filter(task => task.press === press.name)}
                          onEdit={(task) => {
                            setEditingTask(task);
                            setEditingGroup(null);
                            setIsAddDialogOpen(true);
                          }}
                          onDelete={handleDeleteTask}
                          onUpdate={async (task) => {
                            await handleEditTask(task);
                          }}
                          onEditGroup={(groupTasks) => {
                            setEditingGroup(groupTasks);
                            setEditingTask(null);
                            setIsAddDialogOpen(true);
                          }}
                        />
                      </TabsContent>
                    ))}
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
          </div>
        ) : user.role === 'press' ? (
          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="ml-4">
                <TabsTrigger value="tasks" className="gap-2">
                  <ClipboardList className="w-4 h-4" />
                  Taken
                </TabsTrigger>
                <TabsTrigger value="drukwerken" className="gap-2">
                  <Printer className="w-4 h-4" />
                  Drukwerken
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <Suspense fallback={<div className="p-4 text-center text-gray-500">Loading…</div>}>
              {activeTab === 'tasks' && (
                <MaintenanceTable
                  tasks={filteredTasks}
                  onEdit={(task: MaintenanceTask) => {
                    setEditingTask(task);
                    setIsAddDialogOpen(true);
                  }}
                  onDelete={handleDeleteTask}
                  onUpdate={async (task: MaintenanceTask) => {
                    await handleEditTask(task);
                  }}
                />
              )}
              {activeTab === 'drukwerken' && (
                <Drukwerken
                  presses={presses.filter(p => p.name === user.press)}
                />
              )}
            </Suspense>
          </div>
        ) : (
          <div className="space-y-4">
            <Suspense fallback={<div className="p-4 text-center text-gray-500">Loading…</div>}>
              <MaintenanceTable
                tasks={filteredTasks}
                onEdit={(task: MaintenanceTask) => {
                  setEditingTask(task);
                  setIsAddDialogOpen(true);
                }}
                onDelete={handleDeleteTask}
                onUpdate={async (task: MaintenanceTask) => {
                  await handleEditTask(task);
                }}
              />
            </Suspense>
          </div>
        )}

        <AddMaintenanceDialog
          open={isAddDialogOpen}
          onOpenChange={setIsAddDialogOpen}
          onSubmit={async (task) => {
            if (editingTask) {
              await handleEditTask({ ...editingTask, ...task } as MaintenanceTask);
            } else {
              await handleAddTask(task);
            }
          }}
          editTask={editingTask}
          initialGroup={editingGroup || undefined}
          onUpdateGroup={handleUpdateGroup}
        />
      </main>
      <ScrollToTop />
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
  return (
    <AuthProvider>
      <Profiler id="MainApp" onRender={onRenderCallback}>
        <MainApp />
      </Profiler>
    </AuthProvider>
  );
}

export default App;
