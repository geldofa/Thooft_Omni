import { useEffect, useState, Profiler, lazy, Suspense, startTransition } from 'react';
import { AuthProvider, useAuth, MaintenanceTask } from './components/AuthContext';
import { GroupedTask } from './components/AuthContext';
import { LoginForm } from './components/LoginForm';
import { Header } from './components/Header';
import { AddMaintenanceDialog } from './components/AddMaintenanceDialog';
import { ScrollToTop } from './components/ScrollToTop';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs';
import { Toaster, toast } from 'sonner';
import { OnboardingWizard } from './components/OnboardingWizard';
import { APP_TITLE } from './config';

// Lazy Imports
const MaintenanceTable = lazy(() => import('./components/MaintenanceTable').then(m => ({ default: m.MaintenanceTable })));
const ActivityLog = lazy(() => import('./components/ActivityLog').then(m => ({ default: m.ActivityLog })));
const Reports = lazy(() => import('./components/Reports').then(m => ({ default: m.Reports })));
const MaintenanceChecklist = lazy(() => import('./components/MaintenanceChecklist').then(m => ({ default: m.MaintenanceChecklist })));
const Drukwerken = lazy(() => import('./components/Drukwerken').then(m => ({ default: m.Drukwerken })));
const FeedbackList = lazy(() => import('./components/FeedbackList').then(m => ({ default: m.FeedbackList })));
const Toolbox = lazy(() => import('./components/Toolbox').then(m => ({ default: m.Toolbox })));
const ManagementLayout = lazy(() => import('./components/ManagementLayout').then(m => ({ default: m.ManagementLayout })));
const ExternalSummary = lazy(() => import('./components/ExternalSummary').then(m => ({ default: m.ExternalSummary })));
import { Home } from './components/Home';

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
    fetchUserAccounts,
    isFirstRun,
    checkFirstRun,
    hasPermission
  } = useAuth();

  useEffect(() => {
    document.title = APP_TITLE;
  }, []);

  const activePresses = presses
    .filter(p => p.active && !p.archived)
    .filter(p => {
      if (user?.role === 'press' && user.press) {
        return p.name === user.press;
      }
      return true;
    });

  // Flatten grouped tasks for specific views (like Reports)
  const tasks: MaintenanceTask[] = groupedTasks.flatMap(group =>
    group.subtasks.map(subtask => ({
      ...subtask,
      task: group.taskName, // Group Name
      taskSubtext: group.taskSubtext, // Parent Subtext
      subtaskName: subtask.subtaskName, // Specific item name
      subtaskSubtext: subtask.subtext, // Specific item subtext
      category: group.category,
      categoryId: group.categoryId,
      press: group.press,
      pressId: group.pressId,
      opmerkingen: subtask.comment,
      comment: subtask.comment,
      isExternal: subtask.isExternal || false,
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    }))
  );

  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<MaintenanceTask | null>(null);
  const [editingGroup, setEditingTaskGroup] = useState<MaintenanceTask[] | null>(null);
  const [selectedPress, setSelectedPress] = useState<string>('Lithoman');

  const [activeTab, setActiveTab] = useState(() => {
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem('activeTab') || 'home';
    }
    return 'home';
  });

  // Effects for persistence
  useEffect(() => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('activeTab', activeTab);
    }
  }, [activeTab]);

  // Handle post-onboarding redirect
  useEffect(() => {
    const redirect = localStorage.getItem('onboarding_redirect');
    if (redirect === 'import') {
      setActiveTab('toolbox');
      localStorage.removeItem('onboarding_redirect');
    } else if (redirect === 'home') {
      setActiveTab('home');
      localStorage.removeItem('onboarding_redirect');
    }
  }, []);

  // Data fetching based on tab
  useEffect(() => {
    if (activeTab === 'tasks') {
      fetchTasks();
    }
    else if (activeTab === 'logs') fetchActivityLogs();
    else if (activeTab === 'passwords') fetchUserAccounts();
  }, [activeTab, fetchTasks, fetchActivityLogs, fetchUserAccounts]);

  // Ensure a valid press is selected when they load or active list changes
  useEffect(() => {
    if (activePresses.length > 0) {
      const isValid = activePresses.some(p => p.name === selectedPress);
      if (!isValid) {
        setSelectedPress(activePresses[0].name);
      }
    }
  }, [activePresses, selectedPress]);

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
      user: user?.name || user?.username || 'Onbekend',
      action: 'Created',
      entity: 'Task',
      entityId: 'new',
      entityName: task.task,
      details: `Nieuwe taak aangemaakt in ${task.category}`,
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
          user: user?.name || user?.username || 'Onbekend',
          action: 'Updated',
          entity: 'Task',
          entityId: task.id,
          entityName: task.task,
          details: `Heeft ${changes.join(', ')} bijgewerkt`,
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
        user: user?.name || user?.username || 'Onbekend',
        action: 'Deleted',
        entity: 'Task',
        entityId: id,
        entityName: task.task,
        details: 'Taak verwijderd',
        press: task.press
      });
    }
  };

  const handleUpdateGroup = async (tasks: MaintenanceTask[]) => {
    try {
      for (const task of tasks) {
        if (task.id) await updateTask(task, false); // Update without immediate refresh
        else {
          const { id, created, updated, ...rest } = task;
          await addTask(rest);
        }
      }
      await fetchTasks(); // Final refresh after all updates
      setIsAddDialogOpen(false);
      setEditingTask(null);
      setEditingTaskGroup(null);
      toast.success('Groep succesvol bijgewerkt');
    } catch (error) {
      console.error('Failed to update group:', error);
      toast.error('Bijwerken van groep mislukt');
    }
  };

  const filteredTasks = hasPermission('tasks_view')
    ? groupedTasks
    : groupedTasks.filter(group => group.press === user?.press);

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <Toaster position="bottom-right" />
      <ScrollToTop />

      {isFirstRun ? (
        <OnboardingWizard onComplete={checkFirstRun} />
      ) : !user ? (
        <LoginForm />
      ) : user && activeTab === 'home' ? (
        <Home setActiveTab={setActiveTab} />
      ) : (
        <>
          <Header activeTab={activeTab} setActiveTab={setActiveTab} />
          <main className="w-full mx-auto px-4 sm:px-6 lg:px-8 py-4">
            {hasPermission('tasks_view') ? (
              <Suspense fallback={<div className="p-4 text-center text-gray-500">Modules laden...</div>}>
                {activeTab === 'tasks' && (
                  <div className="space-y-6">
                    {activePresses.length > 1 && (
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                        <Tabs value={selectedPress} onValueChange={(value) => startTransition(() => setSelectedPress(value as string))} className="w-full sm:w-auto">
                          <TabsList className="tab-pill-list">
                            {activePresses.map(press => (
                              <TabsTrigger
                                key={press.id}
                                value={press.name}
                                className="tab-pill-trigger"
                              >
                                {press.name}
                              </TabsTrigger>
                            ))}
                          </TabsList>
                        </Tabs>
                      </div>
                    )}

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
                            task: groupTasks.taskName, // Parent Group Name
                            subtaskName: subtask.subtaskName, // Child Task Name
                            taskSubtext: groupTasks.taskSubtext, // Parent Subtext
                            subtaskSubtext: subtask.subtext, // Child Subtext
                            category: groupTasks.category,
                            categoryId: groupTasks.categoryId,
                            press: groupTasks.press,
                            pressId: groupTasks.pressId,
                            lastMaintenance: subtask.lastMaintenance,
                            nextMaintenance: subtask.nextMaintenance,
                            maintenanceInterval: subtask.maintenanceInterval,
                            maintenanceIntervalUnit: subtask.maintenanceIntervalUnit,
                            assignedTo: subtask.assignedTo,
                            opmerkingen: subtask.opmerkingen || subtask.comment || '',
                            comment: subtask.comment || '',
                            commentDate: subtask.commentDate,
                            sort_order: subtask.sort_order || 0,
                            isExternal: subtask.isExternal || false,
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
                  </div>
                )}

                {(activeTab === 'drukwerken' && hasPermission('drukwerken_view')) && <Drukwerken presses={activePresses} />}
                {(activeTab === 'extern' && hasPermission('extern_view')) && <ExternalSummary />}
                {['operators', 'categories', 'tags', 'presses', 'passwords', 'permissions'].includes(activeTab) && hasPermission('management_access') && (
                  <ManagementLayout activeTab={activeTab} setActiveTab={setActiveTab} user={user} />
                )}
                {(activeTab === 'reports' && hasPermission('reports_view')) && <Reports tasks={tasks} />}
                {(activeTab === 'checklist' && hasPermission('checklist_view')) && <MaintenanceChecklist tasks={tasks} />}
                {(activeTab === 'logs' && hasPermission('logs_view')) && <ActivityLog />}
                {(activeTab === 'feedback-list' && hasPermission('feedback_view')) && <FeedbackList />}
                {(activeTab === 'toolbox' && hasPermission('toolbox_access')) && <Toolbox onNavigateHome={() => setActiveTab('home')} />}
              </Suspense>
            ) : (
              <Suspense fallback={<div className="p-4 text-center text-gray-500">Laden...</div>}>
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
                {(activeTab === 'drukwerken' && hasPermission('drukwerken_view')) && <Drukwerken presses={presses.filter(p => p.name === user.press)} />}
                {(activeTab === 'logs' && hasPermission('logs_view')) && <ActivityLog />}
                {(activeTab === 'feedback-list' && hasPermission('feedback_view')) && <FeedbackList />}
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
              activePress={selectedPress}
            />
          </main>
        </>
      )}
    </div>
  );
}

// Performance Profiler Callback
function onRenderCallback(
  _id: string,
  _phase: 'mount' | 'update' | 'nested-update',
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
  const [tasks] = useState<GroupedTask[]>([
    {
      id: '1',
      taskName: 'HVAC System Maintenance',
      taskSubtext: 'Comprehensive maintenance for all HVAC units',
      category: 'HVAC',
      categoryId: 'cat-hvac',
      press: 'Lithoman',
      pressId: 'press-litho',
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
          commentDate: new Date('2025-10-15T14:30:00'),
          sort_order: 0,
          isExternal: false
        }
      ]
    },
    {
      id: '2',
      taskName: 'Safety Equipment Checks',
      taskSubtext: 'Regular inspection of all safety gear',
      category: 'Safety',
      categoryId: 'cat-safety',
      press: 'C80',
      pressId: 'press-c80',
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
          commentDate: new Date('2025-09-01T09:15:00'),
          sort_order: 0,
          isExternal: false
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