import { useEffect, useState, Profiler, lazy, Suspense, startTransition, useCallback } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { pb, useAuth, MaintenanceTask, GroupedTask, AuthProvider, EXTERNAL_TAG_NAME, Press, Category, Tag } from './components/AuthContext';
import { LoginForm } from './components/LoginForm';
import { Header } from './components/Header';
import { AddMaintenanceDialog } from './components/AddMaintenanceDialog';
import { ScrollToTop } from './components/ScrollToTop';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Toaster, toast } from 'sonner';
import { OnboardingWizard } from './components/OnboardingWizard';
import { PageHeader } from './components/PageHeader';
import { ListChecks, Plus, RefreshCw } from 'lucide-react';
import { getStatusInfo } from './utils/StatusUtils';
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
  const navigate = useNavigate();
  const [groupedTasks, setGroupedTasks] = useState<GroupedTask[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [presses, setPresses] = useState<Press[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false); // Restore for UI compatibility

  const {
    user,
    addActivityLog,
    isFirstRun,
    checkFirstRun,
    hasPermission,
    fetchActivityLogs, // Restore missing functions
    fetchUserAccounts,
    isLoading: authLoading
  } = useAuth();

  const fetchData = useCallback(async () => {
    try {
      setIsLoadingTasks(true);
      const [records, tagRecords, pressRecords, catRecords] = await Promise.all([
        pb.collection('onderhoud').getFullList({
          sort: 'sort_order,created',
          expand: 'category,pers,assigned_operator,assigned_team,tags',
        }),
        pb.collection('tags').getFullList(),
        pb.collection('persen').getFullList(),
        pb.collection('categorieen').getFullList()
      ]);

      setTags(tagRecords.map((t: any) => ({
        id: t.id,
        naam: t.naam,
        kleur: t.kleur,
        active: t.active !== false,
        system_managed: t.system_managed === true
      })));

      setPresses(pressRecords.map((r: any) => ({
        id: r.id,
        name: r.naam,
        active: r.active !== false,
        archived: r.archived === true,
        category_order: r.category_order
      })));

      setCategories(catRecords.map((r: any) => ({
        id: r.id,
        name: r.naam,
        pressIds: Array.isArray(r.pers_ids) ? r.pers_ids : [],
        active: r.active !== false,
        subtexts: typeof r.subtexts === 'object' ? r.subtexts : {}
      })));

      const grouped: GroupedTask[] = [];
      records.forEach((record: any) => {
        const groupName = record.task;
        const subtext = record.task_subtext;
        const categoryName = record.expand?.category?.naam || 'Ongecategoriseerd';
        const categoryId = record.category;
        const pressName = record.expand?.pers?.naam || 'Onbekend';
        const pressId = record.pers;

        let group = grouped.find(g =>
          g.taskName === groupName &&
          g.pressId === pressId &&
          g.categoryId === categoryId
        );

        if (!group) {
          group = {
            id: record.id,
            taskName: groupName,
            taskSubtext: subtext,
            category: categoryName,
            categoryId: categoryId,
            press: pressName,
            pressId: pressId,
            subtasks: []
          };
          grouped.push(group);
        }

        group.subtasks.push({
          id: record.id,
          subtaskName: record.subtask,
          subtext: record.subtask_subtext,
          lastMaintenance: record.last_date ? new Date(record.last_date) : null,
          nextMaintenance: record.next_date ? new Date(record.next_date) : new Date(),
          maintenanceInterval: record.interval,
          maintenanceIntervalUnit: record.interval_unit === 'Dagen' ? 'days' :
            record.interval_unit === 'Weken' ? 'weeks' :
              record.interval_unit === 'Maanden' ? 'months' :
                record.interval_unit === 'Jaren' ? 'years' : 'days',
          assignedTo: [
            ...(record.expand?.assigned_operator?.map((o: any) => o.naam || o.name || o.username || 'Onbekend') || []),
            ...(record.expand?.assigned_team?.map((t: any) => t.naam || t.name || 'Onbekend') || [])
          ].join(', ') || '',
          assignedToIds: [
            ...(record.assigned_operator || []),
            ...(record.assigned_team || [])
          ],
          assignedToTypes: [
            ...(record.assigned_operator || []).map(() => 'operator'),
            ...(record.assigned_team || []).map(() => 'ploeg')
          ],
          comment: record.opmerkingen || '',
          sort_order: record.sort_order || 0,
          isExternal: record.is_external || false,
          tagIds: record.tags || []
        } as any);
      });

      setGroupedTasks(grouped);
    } catch (e) {
      console.error("Failed to fetch data in App", e);
      toast.error("Fout bij het laden van gegevens");
    } finally {
      setIsLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    const subscribe = async () => {
      try {
        await pb.collection('onderhoud').subscribe('*', () => {
          fetchData();
        });
      } catch (err) {
        console.error("Task subscription failed:", err);
      }
    };

    if (user?.id) {
      subscribe();
    }

    return () => {
      pb.collection('onderhoud').unsubscribe('*').catch(() => { });
    };
  }, [user?.id, fetchData]);

  // Handle Post-Login Redirect
  useEffect(() => {
    if (user && sessionStorage.getItem('redirect_login') === 'true') {
      sessionStorage.removeItem('redirect_login');
      // Navigate to first available page (Tasks view)
      // This will trigger the appropriate route redirects based on role
      navigate('/Taken');
    }
  }, [user, navigate]);

  const addTask = async (task: Omit<MaintenanceTask, 'id' | 'created' | 'updated'>) => {
    try {
      const baseData = {
        task: task.task,
        task_subtext: task.taskSubtext,
        category: task.categoryId,
        pers: task.pressId,
        last_date: task.lastMaintenance,
        next_date: task.nextMaintenance,
        interval: task.maintenanceInterval,
        interval_unit: task.maintenanceIntervalUnit === 'days' ? 'Dagen' :
          task.maintenanceIntervalUnit === 'weeks' ? 'Weken' :
            task.maintenanceIntervalUnit === 'months' ? 'Maanden' :
              task.maintenanceIntervalUnit === 'years' ? 'Jaren' : 'Dagen',
        assigned_operator: task.assignedToIds?.filter((_, i) => task.assignedToTypes?.[i] === 'operator' || task.assignedToTypes?.[i] === 'external') || [],
        assigned_team: task.assignedToIds?.filter((_, i) => task.assignedToTypes?.[i] === 'ploeg') || [],
        opmerkingen: task.opmerkingen,
        comment: task.comment || '',
        commentDate: task.commentDate,
        sort_order: task.sort_order || 0,
        is_external: task.isExternal || false,
        tags: task.tagIds || []
      };

      if (task.subtasks && task.subtasks.length > 0) {
        await Promise.all(task.subtasks.map(sub =>
          pb.collection('onderhoud').create({
            ...baseData,
            subtask: sub.name,
            subtask_subtext: sub.subtext,
            opmerkingen: sub.opmerkingen || task.opmerkingen,
            sort_order: sub.sort_order || 0,
            is_external: sub.isExternal || task.isExternal || false
          })
        ));
      } else {
        await pb.collection('onderhoud').create({
          ...baseData,
          subtask: task.subtaskName || task.task,
          subtask_subtext: task.subtaskSubtext || task.taskSubtext,
        });
      }
      fetchData();
      toast.success('Taak succesvol toegevoegd');
    } catch (e) {
      console.error("Add task failed:", e);
      toast.error('Toevoegen mislukt');
    }
  };

  const updateTask = async (task: MaintenanceTask, refresh: boolean = true) => {
    try {
      const operatorIds = task.assignedToIds?.filter((_, i) => task.assignedToTypes?.[i] === 'operator' || task.assignedToTypes?.[i] === 'external') || [];
      const teamIds = task.assignedToIds?.filter((_, i) => task.assignedToTypes?.[i] === 'ploeg') || [];

      await pb.collection('onderhoud').update(task.id, {
        task: task.task,
        subtask: task.subtaskName || task.task,
        task_subtext: task.taskSubtext,
        subtask_subtext: task.subtaskSubtext || task.taskSubtext,
        category: task.categoryId,
        pers: task.pressId,
        last_date: task.lastMaintenance,
        next_date: task.nextMaintenance,
        interval: task.maintenanceInterval,
        interval_unit: task.maintenanceIntervalUnit === 'days' ? 'Dagen' :
          task.maintenanceIntervalUnit === 'weeks' ? 'Weken' :
            task.maintenanceIntervalUnit === 'months' ? 'Maanden' :
              task.maintenanceIntervalUnit === 'years' ? 'Jaren' : 'Dagen',
        assigned_operator: operatorIds,
        assigned_team: teamIds,
        opmerkingen: task.opmerkingen,
        comment: task.comment || '',
        commentDate: task.commentDate,
        is_external: task.isExternal || false,
        sort_order: task.sort_order || 0,
        tags: task.tagIds || []
      });
      if (refresh) fetchData();
      toast.success('Taak succesvol bijgewerkt');
    } catch (e) {
      console.error("Update task failed:", e);
      toast.error('Bijwerken mislukt');
    }
  };

  const deleteTask = async (id: string) => {
    try {
      await pb.collection('onderhoud').delete(id);
      fetchData();
      toast.success('Taak verwijderd');
    } catch (e) {
      console.error("Delete task failed:", e);
      toast.error('Verwijderen mislukt');
    }
  };

  // --- Router Hooks ---
  // const navigate = useNavigate(); // Duplicate declaration removed
  const location = useLocation();

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
  const [selectedPress, setSelectedPress] = useState<string>(() => {
    if (typeof sessionStorage !== 'undefined') {
      return sessionStorage.getItem('tasks_selectedPress') || 'Lithoman';
    }
    return 'Lithoman';
  });

  const [statusFilter, setStatusFilter] = useState<string | null>(null);

  const handleStatusFilter = (status: string) => {
    setStatusFilter(statusFilter === status ? null : status);
  };

  const currentPressTasks = groupedTasks.filter(group => group.press === decodeURIComponent(location.pathname.split('/').pop() || ''));
  const allSubtasks = currentPressTasks.flatMap(group => group.subtasks);

  const statusCounts = allSubtasks.reduce((acc, subtask) => {
    const status = getStatusInfo(subtask.nextMaintenance).key;
    if (status !== 'Gepland') {
      acc[status] = (acc[status] || 0) + 1;
    }
    return acc;
  }, {} as Record<string, number>);

  useEffect(() => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('tasks_selectedPress', selectedPress);
    }
  }, [selectedPress]);

  // --- Router Hooks ---
  const setActiveTab = (tab: string) => {
    // This now handles both top-level and sub-tabs if passed as a full path
    if (tab.startsWith('/')) {
      navigate(tab);
    } else {
      navigate(tab === 'home' ? '/' : `/${tab}`);
    }
  };

  // Handle post-onboarding redirect
  useEffect(() => {
    const redirect = localStorage.getItem('onboarding_redirect');
    if (redirect === 'import') {
      navigate('/Toolbox/Import');
      localStorage.removeItem('onboarding_redirect');
    } else if (redirect === 'home') {
      navigate('/');
      localStorage.removeItem('onboarding_redirect');
    }
  }, [navigate]);

  // Data fetching based on tab
  useEffect(() => {
    const path = location.pathname.toLowerCase();
    if (path.startsWith('/taken')) {
      fetchData();
    }
    else if (path === '/logboek') fetchActivityLogs();
    else if (path === '/beheer/accounts') fetchUserAccounts();
  }, [location.pathname, fetchData, fetchActivityLogs, fetchUserAccounts]);

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
    const scrollKey = 'scrollPosition_' + location.pathname; // Per-path scroll
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
  }, [location.pathname]);

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
      await fetchData(); // Final refresh after all updates
      setIsAddDialogOpen(false);
      setEditingTask(null);
      setEditingTaskGroup(null);
      toast.success('Groep succesvol bijgewerkt');
    } catch (error) {
      console.error('Failed to update group:', error);
      toast.error('Bijwerken van groep mislukt');
    }
  };


  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900">
      <Toaster position="top-right" />
      <ScrollToTop />



      {authLoading ? (
        <div className="min-h-screen flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-blue-600" />
        </div>
      ) : isFirstRun ? (
        <OnboardingWizard onComplete={checkFirstRun} />
      ) : !user ? (
        <LoginForm />
      ) : (
        <>
          {location.pathname !== '/' && <Header activeTab={location.pathname} setActiveTab={setActiveTab} />}
          <main className={location.pathname === '/' ? "" : "w-full mx-auto px-4 sm:px-6 lg:px-8 py-4"}>
            <Suspense fallback={<div className="p-4 text-center text-gray-500">Laden...</div>}>
              <Routes>
                <Route path="/" element={<Home setActiveTab={setActiveTab} activePresses={activePresses} />} />

                {/* --- TAKEN --- */}
                <Route path="/Taken" element={
                  activePresses.length > 0
                    ? <Navigate to={`/Taken/${encodeURIComponent(activePresses[0].name)}`} replace />
                    : <Navigate to="/" replace />
                } />
                <Route path="/Taken/:pressName" element={
                  hasPermission('tasks_view') ? (
                    <div className="space-y-6">
                      <PageHeader
                        title={
                          <div className="flex items-center gap-4">
                            <span>Onderhoudstaken</span>
                            {isLoadingTasks && (
                              <div className="flex items-center gap-2 text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full animate-pulse">
                                <RefreshCw className="w-3 h-3 animate-spin" />
                                <span>Laden...</span>
                              </div>
                            )}
                          </div>
                        }
                        description="Beheer en plan onderhoudstaken"
                        icon={ListChecks}
                        actions={
                          <div className="flex items-center gap-2">
                            {/* Status Filter Buttons */}
                            {statusCounts['Te laat'] > 0 && (
                              <Button
                                variant={statusFilter === 'Te laat' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleStatusFilter('Te laat')}
                                className="gap-2"
                              >
                                <span className={statusFilter === 'Te laat' ? 'text-white' : 'text-red-600'}>
                                  Te laat
                                </span>
                                <Badge variant={statusFilter === 'Te laat' ? 'secondary' : 'default'} className="bg-red-500">
                                  {statusCounts['Te laat']}
                                </Badge>
                              </Button>
                            )}
                            {statusCounts['Deze Week'] > 0 && (
                              <Button
                                variant={statusFilter === 'Deze Week' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleStatusFilter('Deze Week')}
                                className="gap-2"
                              >
                                <span className={statusFilter === 'Deze Week' ? 'text-white' : 'text-orange-600'}>
                                  Deze Week
                                </span>
                                <Badge variant={statusFilter === 'Deze Week' ? 'secondary' : 'default'} className="bg-orange-500">
                                  {statusCounts['Deze Week']}
                                </Badge>
                              </Button>
                            )}
                            {statusCounts['Deze Maand'] > 0 && (
                              <Button
                                variant={statusFilter === 'Deze Maand' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => handleStatusFilter('Deze Maand')}
                                className="gap-2"
                              >
                                <span className={statusFilter === 'Deze Maand' ? 'text-white' : 'text-yellow-600'}>
                                  Deze Maand
                                </span>
                                <Badge variant={statusFilter === 'Deze Maand' ? 'secondary' : 'default'} className="bg-yellow-500">
                                  {statusCounts['Deze Maand']}
                                </Badge>
                              </Button>
                            )}

                            {hasPermission('tasks_edit') && (
                              <Button onClick={() => {
                                startTransition(() => {
                                  setEditingTask(null);
                                  setEditingTaskGroup(null);
                                  setIsAddDialogOpen(true);
                                });
                              }} className="gap-2 shadow-sm">
                                <Plus className="w-4 h-4" />
                                Nieuwe Taak
                              </Button>
                            )}
                          </div>
                        }
                      />
                      {activePresses.length > 1 && (
                        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                          <Tabs
                            value={decodeURIComponent(location.pathname.split('/').pop() || '')}
                            onValueChange={(value) => navigate(`/Taken/${encodeURIComponent(value)}`)}
                            className="w-full sm:w-auto"
                          >
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
                        tasks={currentPressTasks}
                        statusFilter={statusFilter}
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
                              task: groupTasks.taskName,
                              subtaskName: subtask.subtaskName,
                              taskSubtext: groupTasks.taskSubtext,
                              subtaskSubtext: subtask.subtext,
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
                      />
                    </div>
                  ) : <Navigate to="/" replace />
                } />

                {/* --- DRUKWERKEN --- */}
                <Route path="/Drukwerken" element={
                  user?.role === 'press'
                    ? <Navigate to="/Drukwerken/Nieuw" replace />
                    : <Navigate to="/Drukwerken/Gedrukt" replace />
                } />
                <Route path="/Drukwerken/:subtab" element={
                  hasPermission('drukwerken_view') ? <Drukwerken presses={activePresses} /> : <Navigate to="/" replace />
                } />

                {/* --- EXTERN --- */}
                <Route path="/Extern" element={
                  hasPermission('extern_view') ? <ExternalSummary tasks={groupedTasks} tags={tags} /> : <Navigate to="/" replace />
                } />

                {/* --- BEHEER (MANAGEMENT) --- */}
                <Route path="/Beheer" element={<Navigate to="/Beheer/Personeel" replace />} />
                <Route path="/Beheer/:subtab" element={
                  hasPermission('management_access') ? <ManagementLayout tasks={groupedTasks} tags={tags} /> : <Navigate to="/" replace />
                } />

                {/* --- ANALYSIS & LOGS --- */}
                <Route path="/Rapport" element={hasPermission('reports_view') ? <Reports tasks={tasks} presses={presses} /> : <Navigate to="/" replace />} />
                <Route path="/Checklist" element={hasPermission('checklist_view') ? <MaintenanceChecklist tasks={tasks} presses={presses} categories={categories} /> : <Navigate to="/" replace />} />
                <Route path="/Logboek" element={hasPermission('logs_view') ? <ActivityLog /> : <Navigate to="/" replace />} />
                <Route path="/Feedback" element={hasPermission('feedback_view') ? <FeedbackList /> : <Navigate to="/" replace />} />

                {/* --- TOOLBOX --- */}
                <Route path="/Toolbox" element={<Navigate to="/Toolbox/Tools" replace />} />
                <Route path="/Toolbox/:subtab" element={
                  hasPermission('toolbox_access') ? <Toolbox onNavigateHome={() => navigate('/')} /> : <Navigate to="/" replace />
                } />

                {/* Redirects for old paths */}
                <Route path="/tasks" element={<Navigate to="/Taken" replace />} />
                <Route path="/drukwerken" element={<Navigate to="/Drukwerken" replace />} />
                <Route path="/management" element={<Navigate to="/Beheer" replace />} />
                <Route path="/toolbox" element={<Navigate to="/Toolbox" replace />} />
                <Route path="/reports" element={<Navigate to="/Rapport" replace />} />
                <Route path="/checklist" element={<Navigate to="/Checklist" replace />} />
                <Route path="/logs" element={<Navigate to="/Logboek" replace />} />
                <Route path="/feedback-list" element={<Navigate to="/Feedback" replace />} />
                <Route path="/operators" element={<Navigate to="/Beheer/Personeel" replace />} />
                <Route path="/categories" element={<Navigate to="/Beheer/Categorie" replace />} />
                <Route path="/tags" element={<Navigate to="/Beheer/Tags" replace />} />
                <Route path="/presses" element={<Navigate to="/Beheer/Persen" replace />} />
                <Route path="/passwords" element={<Navigate to="/Beheer/Accounts" replace />} />
                <Route path="/parameters" element={<Navigate to="/Beheer/Parameters" replace />} />
                <Route path="/permissions" element={<Navigate to="/Beheer/Rechten" replace />} />

                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Suspense>
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
  return (
    <AuthProvider>
      <Profiler id="MainApp" onRender={onRenderCallback}>
        <MainApp />
      </Profiler>
    </AuthProvider>
  );
}

export default App;