import { useEffect, useState, lazy, Suspense, useCallback, useMemo } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { pb, useAuth, MaintenanceTask, GroupedTask, AuthProvider, Press } from './components/AuthContext';
import { ThemeProvider } from './components/ThemeProvider';
import { LoginForm } from './components/LoginForm';
import { Header } from './components/layout/Header';
import { AddMaintenanceDialog } from './components/dialogs/AddMaintenanceDialog';
import { ForceRefreshDialog } from './components/dialogs/ForceRefreshDialog';
import { UpdateDialog } from './components/dialogs/UpdateDialog';
import { ScrollToTop } from './components/ScrollToTop';
import { Tabs, TabsList, TabsTrigger } from './components/ui/tabs';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { Toaster, toast } from 'sonner';
import { OnboardingWizard } from './components/OnboardingWizard';
import { Plus, RefreshCw } from 'lucide-react';
import { getStatusInfo } from './utils/StatusUtils';
import { APP_TITLE } from './config';
import { useAutoReports } from './hooks/useAutoReports';
import { formatDisplayDate } from './utils/dateUtils';

// Lazy Imports
const MaintenanceTable = lazy(() => import('./components/MaintenanceTable').then(m => ({ default: m.MaintenanceTable })));
const ActivityLog = lazy(() => import('./components/ActivityLog').then(m => ({ default: m.ActivityLog })));
const Drukwerken = lazy(() => import('./components/Drukwerken').then(m => ({ default: m.Drukwerken })));
const UnifiedSettingsLayout = lazy(() => import('./components/layout/UnifiedSettingsLayout').then(m => ({ default: m.UnifiedSettingsLayout })));
const Roadmap = lazy(() => import('./components/Roadmap').then(m => ({ default: m.Roadmap })));
const ExternalTasks = lazy(() => import('./components/ExternalTasks').then(m => ({ default: m.ExternalTasks })));
import { Homepage } from './components/Homepage';

function MainApp() {
  const navigate = useNavigate();
  const [groupedTasks, setGroupedTasks] = useState<GroupedTask[]>([]);
  const [presses, setPresses] = useState<Press[]>([]);
  const [isLoadingTasks, setIsLoadingTasks] = useState(false);

  const {
    user,
    addActivityLog,
    isFirstRun,
    checkFirstRun,
    hasPermission,
    fetchActivityLogs,
    isLoading: authLoading
  } = useAuth();

  // Auto-generate pending reports in the background
  useAutoReports(!!user && hasPermission('reports_view'));

  const isHighlightRuleActive = useCallback((rule: any) => {
    if (!rule || !rule.enabled) return false;
    const now = new Date();
    const currentDay = now.getDay();
    if (!rule.days || !Array.isArray(rule.days) || !rule.days.includes(currentDay)) return false;
    if (rule.allDay) return true;
    if (!rule.startTime || !rule.endTime) return false;
    const [startH, startM] = rule.startTime.split(':').map(Number);
    const [endH, endM] = rule.endTime.split(':').map(Number);
    const currentH = now.getHours();
    const currentM = now.getMinutes();
    const startMinutes = (isNaN(startH) ? 0 : startH) * 60 + (isNaN(startM) ? 0 : startM);
    const endMinutes = (isNaN(endH) ? 23 : endH) * 60 + (isNaN(endM) ? 59 : endM);
    const currentMinutes = currentH * 60 + currentM;
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }, []);

  const fetchData = useCallback(async () => {
    console.log("[App] fetchData starting...");
    try {
      setIsLoadingTasks(true);
      console.log("[App] Fetching onderhoud, tags, persen...");
      const [records, tagRecords, pressRecords] = await Promise.all([
        pb.collection('onderhoud').getFullList({
          sort: 'sort_order,created',
          expand: 'category,pers,assigned_operator,assigned_team,tags',
        }),
        pb.collection('tags').getFullList(),
        pb.collection('persen').getFullList()
      ]);

      console.log(`[App] Data fetched: ${records.length} records, ${tagRecords.length} tags, ${pressRecords.length} presses`);

      const mappedTags = tagRecords.map((t: any) => ({
        id: t.id,
        naam: t.naam,
        kleur: t.kleur,
        active: t.active !== false,
        system_managed: t.system_managed === true,
        highlights: t.highlights || []
      }));

      const mappedPresses = pressRecords.map((r: any) => ({
        id: r.id,
        name: r.naam,
        active: r.active !== false,
        archived: r.archived === true,
        category_order: r.category_order
      }));
      setPresses(mappedPresses);

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
            ...(Array.isArray(record.expand?.assigned_operator)
              ? record.expand.assigned_operator.map((o: any) => o.naam || o.name || 'Onbekend')
              : (record.expand?.assigned_operator ? [record.expand.assigned_operator.naam || record.expand.assigned_operator.name || 'Onbekend'] : [])),
            ...(Array.isArray(record.expand?.assigned_team)
              ? record.expand.assigned_team.map((t: any) => t.naam || t.name || 'Onbekend')
              : (record.expand?.assigned_team ? [record.expand.assigned_team.naam || record.expand.assigned_team.name || 'Onbekend'] : []))
          ].join(', ') || '',
          assignedToIds: [
            ...(Array.isArray(record.assigned_operator) ? record.assigned_operator : (record.assigned_operator ? [record.assigned_operator] : [])),
            ...(Array.isArray(record.assigned_team) ? record.assigned_team : (record.assigned_team ? [record.assigned_team] : []))
          ],
          assignedToTypes: [
            ...(Array.isArray(record.assigned_operator) ? record.assigned_operator : (record.assigned_operator ? [record.assigned_operator] : [])).map(() => 'operator'),
            ...(Array.isArray(record.assigned_team) ? record.assigned_team : (record.assigned_team ? [record.assigned_team] : [])).map(() => 'ploeg')
          ],
          opmerkingen: record.opmerkingen || '',
          comment: record.opmerkingen || '',
          commentDate: record.commentDate ? new Date(record.commentDate) : null,
          sort_order: record.sort_order || 0,
          isExternal: record.is_external || false,
          tagIds: Array.isArray(record.tags) ? record.tags : (record.tags ? [record.tags] : []),
          pressId: pressId,
          press: pressName
        } as any);
      });

      const highlightCategories: GroupedTask[] = [];
      mappedTags.forEach(tag => {
        if (!tag.highlights || tag.highlights.length === 0) return;
        const activeRule = tag.highlights?.find((r: any) => r.enabled && r.method === 'category' && isHighlightRuleActive(r));
        if (activeRule) {
          grouped.forEach((origGroup: any) => {
            const tagMatchingSubtasks = origGroup.subtasks.filter((st: any) => {
              const tagIds = Array.isArray(st.tagIds) ? st.tagIds : (st.tagIds ? [st.tagIds] : []);
              return tagIds.includes(tag.id);
            });
            if (tagMatchingSubtasks.length > 0) {
              highlightCategories.push({
                ...origGroup,
                id: `highlight-${tag.id}-${origGroup.id}`,
                categoryId: `highlight-${tag.id}`,
                category: tag.naam,
                isHighlightGroup: true,
                highlightColor: tag.kleur,
                subtasks: tagMatchingSubtasks.map((s: any) => ({
                  ...s,
                  isHighlight: true,
                  highlightColor: tag.kleur,
                  highlightTag: tag.naam
                }))
              });
            }
          });
        }
      });

      console.log(`[App] Grouping complete. Total groups: ${grouped.length + highlightCategories.length}`);
      setGroupedTasks([...highlightCategories, ...grouped]);
    } catch (e: any) {
      console.error("[App] Failed to fetch data in App", e);
      if (e.status === 403) console.warn("[App] Permission denied during fetchData");
      toast.error(`Fout bij het laden van gegevens: ${e.message}`);
    } finally {
      setIsLoadingTasks(false);
      console.log("[App] fetchData finished.");
    }
  }, [isHighlightRuleActive]);

  useEffect(() => {
    fetchData();
    const subscribe = async () => {
      try {
        await Promise.all([
          pb.collection('onderhoud').subscribe('*', () => fetchData()),
          pb.collection('tags').subscribe('*', () => fetchData())
        ]);
      } catch (err) {
        console.error("Subscriptions failed:", err);
      }
    };
    if (user?.id) subscribe();
    return () => {
      pb.collection('onderhoud').unsubscribe('*').catch(() => { });
      pb.collection('tags').unsubscribe('*').catch(() => { });
    };
  }, [user?.id, fetchData]);

  useEffect(() => {
    if (user && sessionStorage.getItem('redirect_login') === 'true') {
      sessionStorage.removeItem('redirect_login');
      navigate('/');
    }
  }, [user, navigate]);

  const addTask = async (task: Omit<MaintenanceTask, 'id' | 'created' | 'updated'>, refresh: boolean = true, silent: boolean = false) => {
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
      if (refresh) await fetchData();
      if (!silent) toast.success('Taak succesvol toegevoegd');
    } catch (e) {
      console.error("Add task failed:", e);
      if (!silent) toast.error('Toevoegen mislukt');
      throw e;
    }
  };

  const updateTask = async (task: MaintenanceTask, refresh: boolean = true, silent: boolean = false) => {
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
      if (!silent) toast.success('Taak succesvol bijgewerkt');
    } catch (e: any) {
      console.error("Update task failed:", e);
      toast.error(`Bijwerken mislukt: ${e.message}`);
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

  const location = useLocation();

  useEffect(() => {
    document.title = APP_TITLE;
  }, []);

  const activePresses = presses.filter(p => p.active && !p.archived).filter(p => {
    if (user?.role === 'press' && user.press) return p.name === user.press;
    return true;
  });

  const tasks: MaintenanceTask[] = groupedTasks.flatMap(group =>
    group.subtasks.map(subtask => ({
      ...subtask,
      task: group.taskName,
      taskSubtext: group.taskSubtext,
      subtaskName: subtask.subtaskName,
      subtaskSubtext: subtask.subtext,
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

  const { currentPressId, pressNameFromUrl } = useMemo(() => {
    const segments = location.pathname.split('/').filter(Boolean);
    const name = segments.length > 0 ? decodeURIComponent(segments[segments.length - 1]) : '';
    const id = presses.find(p => p.name.toLowerCase() === name.toLowerCase())?.id;
    return { currentPressId: id, pressNameFromUrl: name };
  }, [location.pathname, presses]);

  const currentPressTasks = useMemo(() => {
    if (!pressNameFromUrl || pressNameFromUrl === 'Taken') return [];
    return groupedTasks.map(group => {
      if (group.isHighlightGroup) {
        const pressSubtasks = group.subtasks.filter((st: any) => st.pressId === currentPressId);
        if (pressSubtasks.length > 0) return { ...group, subtasks: pressSubtasks };
        return null;
      }
      return (group.pressId === currentPressId) ? group : null;
    }).filter((g): g is GroupedTask => g !== null);
  }, [groupedTasks, pressNameFromUrl, currentPressId]);

  useEffect(() => {
    if (typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('tasks_selectedPress', selectedPress);
    }
  }, [selectedPress]);

  const getEarliestStatusColor = useCallback((subtasks: any[]) => {
    if (!subtasks || subtasks.length === 0) return null;
    const sorted = [...subtasks].sort((a, b) => {
      const dateA = a.nextMaintenance ? new Date(a.nextMaintenance).getTime() : Infinity;
      const dateB = b.nextMaintenance ? new Date(b.nextMaintenance).getTime() : Infinity;
      return dateA - dateB;
    });
    const earliest = sorted[0];
    const status = getStatusInfo(earliest.nextMaintenance);
    if (status.key === 'Gepland') return null;

    // Return a Tailwind color class based on status
    if (status.key === 'Te laat') return 'bg-red-950';
    if (status.key === 'Deze Week') return 'bg-orange-950';
    if (status.key === 'Deze Maand') return 'bg-yellow-950';
    return null;
  }, []);

  const tabStatusCues = useMemo(() => {
    const cues: Record<string, string | null> = {};

    // Cues for press tabs (Internal only)
    activePresses.forEach(press => {
      const pressSubtasks = groupedTasks
        .filter(g => g.pressId === press.id && !g.isHighlightGroup)
        .flatMap(g => g.subtasks)
        .filter((st: any) => !st.isExternal); // DO NOT count external tasks for press dots
      cues[press.name] = getEarliestStatusColor(pressSubtasks);
    });

    // Cue for Extern tab (External only)
    const externalSubtasks = groupedTasks
      .flatMap(g => g.subtasks)
      .filter((st: any) => st.isExternal);
    cues['Extern'] = getEarliestStatusColor(externalSubtasks);

    return cues;
  }, [activePresses, groupedTasks, getEarliestStatusColor]);

  const allSubtasks = currentPressTasks.flatMap((group: any) => group.subtasks);
  const statusCounts = allSubtasks.reduce((acc: any, subtask: any) => {
    const status = getStatusInfo(subtask.nextMaintenance).key;
    if (status !== 'Gepland') acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const setActiveTab = (tab: string) => {
    if (tab.startsWith('/')) navigate(tab);
    else navigate(tab === 'home' ? '/' : `/${tab}`);
  };

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

  useEffect(() => {
    const path = location.pathname.toLowerCase();
    if (path === '/logboek') fetchActivityLogs();
  }, [location.pathname, fetchActivityLogs]);

  useEffect(() => {
    if (activePresses.length > 0) {
      if (!activePresses.some(p => p.name === selectedPress)) {
        setSelectedPress(activePresses[0].name);
      }
    }
  }, [activePresses, selectedPress]);

  // Scroll position handling
  useEffect(() => {
    // Skip restoration for routes that manage their own scroll (like UnifiedSettingsLayout)
    const isSettings = ['/Beheer', '/Toolbox', '/Rapport', '/Checklist', '/Extern'].some(p => location.pathname.startsWith(p));
    if (isSettings) return;

    const scrollKey = 'scrollPosition_' + location.pathname;
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

  const formatDateForLog = (date: Date | null | undefined): string => {
    return formatDisplayDate(date);
  };

  const formatIntervalForLog = (interval: number | undefined, unit: string | undefined): string => {
    if (!interval) return '-';
    const unitMap: Record<string, string> = { days: 'dagen', weeks: 'weken', months: 'maanden', years: 'jaar' };
    return `${interval} ${unitMap[unit || 'days'] || unit || 'dagen'}`;
  };

  const handleAddTask = (task: Omit<MaintenanceTask, 'id' | 'created' | 'updated'>) => {
    const newTask = { ...task, created: new Date().toISOString(), updated: new Date().toISOString() };
    addTask(newTask);
    setIsAddDialogOpen(false);
    addActivityLog({
      user: user?.name || user?.username || 'Onbekend',
      action: 'Created',
      entity: 'Task',
      entityId: 'new',
      entityName: `${task.category} | ${task.task}`,
      details: `Nieuwe taak aangemaakt in ${task.category}`,
      press: task.press,
      newValue: [
        `Taak: ${task.task}${task.subtaskName ? ` → ${task.subtaskName}` : ''}`,
        `Laatste onderhoud: ${formatDateForLog(task.lastMaintenance)}`,
        `Volgend onderhoud: ${formatDateForLog(task.nextMaintenance)}`,
        `Interval: ${formatIntervalForLog(task.maintenanceInterval, task.maintenanceIntervalUnit)}`
      ].join('|||')
    });
  };

  const handleEditTask = async (task: MaintenanceTask) => {
    const oldTask = tasks.find(t => t.id === task.id);
    await updateTask(task);
    setEditingTask(null);
    if (oldTask) {
      addActivityLog({
        user: user?.name || user?.username || 'Onbekend',
        action: 'Updated',
        entity: 'Task',
        entityId: task.id,
        entityName: `${task.category} | ${task.task}`,
        details: 'Taak bijgewerkt',
        press: task.press
      });
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
        entityName: `${task.category} | ${task.task}`,
        details: 'Taak verwijderd',
        press: task.press
      });
    }
  };

  const handleUpdateGroup = async (tasks: MaintenanceTask[], originalTasks?: MaintenanceTask[] | null) => {
    try {
      const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      if (originalTasks && originalTasks.length > 0) {
        const newTaskIds = new Set(tasks.map(t => t.id).filter(id => id && !id.startsWith('subtask-')));
        const tasksToDelete = originalTasks.filter(ot => ot.id && !newTaskIds.has(ot.id));
        for (const taskToDelete of tasksToDelete) {
          await pb.collection('onderhoud').delete(taskToDelete.id);
          await delay(100);
        }
      }
      for (const task of tasks) {
        const isNewSubtask = !task.id || (typeof task.id === 'string' && task.id.startsWith('subtask-'));
        if (!isNewSubtask) await updateTask(task, false, true);
        else {
          const { id, created, updated, ...rest } = task;
          await addTask(rest, false, true);
        }
        await delay(100);
      }
      await fetchData();
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
    <div className="min-h-screen bg-gray-50 font-sans text-gray-900 shadow-sm overflow-x-clip">
      <Toaster position="top-right" />
      <ForceRefreshDialog />
      <UpdateDialog />
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
          <main className={
            location.pathname === '/' || location.pathname.toLowerCase().startsWith('/extern')
              ? ""
              : `w-full mx-auto px-4 sm:px-6 lg:px-8 ${['/Beheer', '/Toolbox', '/Analyses'].some(p => location.pathname.startsWith(p)) ? 'pb-4 pt-4' : 'py-4'}`
          }>
            <Suspense fallback={<div className="p-4 text-center text-gray-500">Laden...</div>}>
              <Routes>
                <Route path="/" element={<Homepage setActiveTab={setActiveTab} activePresses={activePresses} />} />
                <Route path="/Taken" element={activePresses.length > 0 ? <Navigate to={`/Taken/${encodeURIComponent(activePresses[0].name)}`} replace /> : <Navigate to="/" replace />} />
                <Route path="/Taken/*" element={hasPermission('tasks_view') ? (
                  <div className="space-y-6">
                    <div className={`flex flex-col sm:flex-row ${((activePresses.length + (hasPermission('extern_view') ? 1 : 0)) > 1) ? 'justify-between' : 'justify-center'} items-start sm:items-center gap-4 mb-2 mt-2`}>
                      <div className="flex items-center gap-4">
                        {(activePresses.length + (hasPermission('extern_view') ? 1 : 0)) > 1 && (
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
                              <div className="w-px h-6 bg-slate-200/50 mx-1 self-center" />
                              {hasPermission('extern_view') && (() => {
                                const statusColor = tabStatusCues['Extern'];
                                const triggerHueClass = statusColor === 'bg-red-950' ? '!bg-red-600 !text-white data-[state=active]:!bg-red-700' :
                                  statusColor === 'bg-orange-950' ? '!bg-orange-500 !text-white data-[state=active]:!bg-orange-600' :
                                    statusColor === 'bg-yellow-950' ? '!bg-yellow-400 !text-black data-[state=active]:!bg-yellow-50' : '';
                                return (
                                  <TabsTrigger
                                    value="Extern"
                                    className={`tab-pill-trigger relative ${triggerHueClass}`}
                                  >
                                    Extern
                                  </TabsTrigger>
                                );
                              })()}
                            </TabsList>
                          </Tabs>
                        )}
                        {isLoadingTasks && (
                          <div className="flex items-center gap-2 text-sm font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full animate-pulse">
                            <RefreshCw className="w-3 h-3 animate-spin" />
                            <span>Laden...</span>
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        {statusCounts['Te laat'] > 0 && (
                          <Button
                            variant={statusFilter === 'Te laat' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleStatusFilter('Te laat')}
                            className="gap-2"
                          >
                            <span className={statusFilter === 'Te laat' ? 'text-white' : 'text-red-600'}>Te laat</span>
                            <Badge variant={statusFilter === 'Te laat' ? 'secondary' : 'default'} className="bg-red-500">{statusCounts['Te laat']}</Badge>
                          </Button>
                        )}
                        {statusCounts['Deze Week'] > 0 && (
                          <Button
                            variant={statusFilter === 'Deze Week' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleStatusFilter('Deze Week')}
                            className="gap-2"
                          >
                            <span className={statusFilter === 'Deze Week' ? 'text-white' : 'text-orange-600'}>Deze Week</span>
                            <Badge variant={statusFilter === 'Deze Week' ? 'secondary' : 'default'} className="bg-orange-500">{statusCounts['Deze Week']}</Badge>
                          </Button>
                        )}
                        {statusCounts['Deze Maand'] > 0 && (
                          <Button
                            variant={statusFilter === 'Deze Maand' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => handleStatusFilter('Deze Maand')}
                            className="gap-2"
                          >
                            <span className={statusFilter === 'Deze Maand' ? 'text-white' : 'text-yellow-600'}>Deze Maand</span>
                            <Badge variant={statusFilter === 'Deze Maand' ? 'secondary' : 'default'} className="bg-yellow-500">{statusCounts['Deze Maand']}</Badge>
                          </Button>
                        )}
                        {hasPermission('tasks_edit') && location.pathname.toLowerCase() !== '/taken/extern' && (
                          <Button
                            onClick={() => { setEditingTask(null); setEditingTaskGroup(null); setIsAddDialogOpen(true); }}
                            className="gap-2 shadow-sm"
                          >
                            <Plus className="w-4 h-4" />Nieuwe Taak
                          </Button>
                        )}
                      </div>
                    </div>

                    <Routes>
                      {hasPermission('extern_view') && <Route path="Extern" element={<ExternalTasks tasks={groupedTasks} presses={presses} isEmbedded={true} />} />}
                      <Route path=":pressName" element={
                        <MaintenanceTable
                          tasks={currentPressTasks}
                          pressId={currentPressId}
                          pressName={pressNameFromUrl}
                          statusFilter={statusFilter}
                          onEdit={(task) => { setEditingTask(task); setEditingTaskGroup(null); setIsAddDialogOpen(true); }}
                          onDelete={handleDeleteTask}
                          onUpdate={handleEditTask}
                          onEditGroup={(groupTasks) => {
                            setEditingTaskGroup(groupTasks.subtasks.map(subtask => ({
                              ...subtask,
                              task: groupTasks.taskName,
                              taskSubtext: groupTasks.taskSubtext,
                              category: groupTasks.category,
                              categoryId: groupTasks.categoryId,
                              press: groupTasks.press,
                              pressId: groupTasks.pressId,
                              opmerkingen: subtask.opmerkingen || '',
                              comment: subtask.opmerkingen || '',
                              created: new Date().toISOString(),
                              updated: new Date().toISOString()
                            } as MaintenanceTask)));
                            setEditingTask(null);
                            setIsAddDialogOpen(true);
                          }}
                        />
                      } />
                    </Routes>
                  </div>
                ) : <Navigate to="/" replace />} />

                <Route path="/Drukwerken" element={user?.role === 'press' ? <Navigate to="/Drukwerken/Nieuw" replace /> : <Navigate to="/Drukwerken/Gedrukt" replace />} />
                <Route path="/Drukwerken/:subtab" element={hasPermission('drukwerken_view') ? <Drukwerken presses={activePresses} /> : <Navigate to="/" replace />} />

                <Route path="/Beheer" element={<Navigate to="/Beheer/Personeel" replace />} />
                <Route path="/Beheer/:subtab" element={hasPermission('management_access') ? <UnifiedSettingsLayout /> : <Navigate to="/" replace />} />

                <Route path="/Analyses" element={<Navigate to="/Analyses/Rapport" replace />} />
                <Route path="/Analyses/:subtab" element={(hasPermission('reports_view') || hasPermission('checklist_view') || hasPermission('drukwerken_view')) ? <UnifiedSettingsLayout /> : <Navigate to="/" replace />} />
                <Route path="/Analyses/:subtab/:subsubtab" element={(hasPermission('reports_view') || hasPermission('checklist_view') || hasPermission('drukwerken_view')) ? <UnifiedSettingsLayout /> : <Navigate to="/" replace />} />

                <Route path="/Rapport" element={<Navigate to="/Analyses/Rapport" replace />} />
                <Route path="/Checklist" element={<Navigate to="/Analyses/Checklist" replace />} />
                <Route path="/Extern" element={<Navigate to="/Taken/Extern" replace />} />
                <Route path="/Logboek" element={hasPermission('logs_view') ? <ActivityLog /> : <Navigate to="/" replace />} />
                <Route path="/Feedback" element={<Roadmap />} />
                <Route path="/Roadmap" element={<Navigate to="/Feedback" replace />} />

                <Route path="/Toolbox" element={<Navigate to="/Toolbox/Tools" replace />} />
                <Route path="/Toolbox/:subtab" element={hasPermission('toolbox_access') ? <UnifiedSettingsLayout /> : <Navigate to="/" replace />} />

                {/* Redirects */}
                <Route path="/tasks" element={<Navigate to="/Taken" replace />} />
                <Route path="/management" element={<Navigate to="/Beheer" replace />} />
                <Route path="/toolbox" element={<Navigate to="/Toolbox" replace />} />
                <Route path="/reports" element={<Navigate to="/Rapport" replace />} />
                <Route path="/checklist" element={<Navigate to="/Checklist" replace />} />
                <Route path="/logs" element={<Navigate to="/Logboek" replace />} />
                <Route path="/operators" element={<Navigate to="/Beheer/Personeel" replace />} />
                <Route path="/categories" element={<Navigate to="/Beheer/Categorie" replace />} />
                <Route path="/tags" element={<Navigate to="/Beheer/Tags" replace />} />
                <Route path="/presses" element={<Navigate to="/Beheer/Persen" replace />} />
                <Route path="/passwords" element={<Navigate to="/Beheer/Accounts" replace />} />
              </Routes>
            </Suspense>
          </main>
          <AddMaintenanceDialog
            open={isAddDialogOpen}
            onOpenChange={setIsAddDialogOpen}
            onSubmit={(task) => {
              if (editingTask) {
                handleEditTask({ ...task, id: editingTask.id } as MaintenanceTask);
              } else {
                handleAddTask(task);
              }
            }}
            onUpdateGroup={handleUpdateGroup}
            editTask={editingTask}
            initialGroup={editingGroup}
          />
        </>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <MainApp />
      </ThemeProvider>
    </AuthProvider>
  );
}