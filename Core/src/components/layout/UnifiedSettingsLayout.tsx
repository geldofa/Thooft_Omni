import { startTransition, Suspense, lazy, useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
    Users, Tags, Factory, Key, Tag as TagIcon, Shield, CalendarCog, RefreshCw,
    Calculator, Palette, Bell, CalendarClock, Settings,
    Upload, Database, Printer, Activity, ShieldCheck
} from 'lucide-react';
import { useAuth, pb, Operator, Ploeg, MaintenanceTask, Press, GroupedTask } from '../AuthContext';
import { SettingsSidebar, SidebarGroup } from '../layout/SettingsSidebar';
import { OperatorManagement } from '../management/OperatorManagement';
import { CategoryManagement } from '../management/CategoryManagement';
import { PressManagement } from '../management/PressManagement';
import { PasswordManagement } from '../management/PasswordManagement';
import { ExternalTasks } from '../ExternalTasks';
import { TagManagement } from '../management/TagManagement';
import { PermissionManagement } from '../management/PermissionManagement';
import { ThemeManagement } from '../management/ThemeManagement';
import { Reports } from '../Reports';
import { MaintenanceChecklist } from '../MaintenanceChecklist';
import { ProductionAnalytics } from '../ProductionAnalytics';
import { SystemTasks } from '../SystemTasks';
import { ToolboxContent } from '../Toolbox';
import { DataChecker } from '../management/DataChecker';
import { DrukwerkenDataChecker } from '../management/DrukwerkenDataChecker';

const ParameterManagement = lazy(() => import('../management/ParameterManagement').then(m => ({ default: m.ParameterManagement })));
const NotificationManagement = lazy(() => import('../management/NotificationManagement').then(m => ({ default: m.NotificationManagement })));
const DrukwerkenReports = lazy(() => import('../DrukwerkenReports').then(m => ({ default: m.DrukwerkenReports })));
const TickerSettingsPage = lazy(() => import('../management/TickerSettingsPage').then(m => ({ default: m.TickerSettingsPage })));
const MaintenanceAnalytics = lazy(() => import('../MaintenanceAnalytics').then(m => ({ default: m.MaintenanceAnalytics })));
const PlannerSettings = lazy(() => import('../management/PlannerSettings').then(m => ({ default: m.PlannerSettings })));
const RotationBuilder = lazy(() => import('../management/RotationBuilder').then(m => ({ default: m.RotationBuilder })));

export function UnifiedSettingsLayout() {
    const { hasPermission } = useAuth();
    const { subtab, subsubtab } = useParams<{ subtab: string, subsubtab?: string }>();
    const navigate = useNavigate();
    const location = useLocation();
    const [prevPath, setPrevPath] = useState(location.pathname);

    // Scroll to top on subtab change
    useEffect(() => {
        if (location.pathname !== prevPath) {
            window.scrollTo({ top: 0, behavior: 'instant' });
            setPrevPath(location.pathname);
        }
    }, [location.pathname, prevPath]);

    // Data states
    const [operators, setOperators] = useState<Operator[]>([]);
    const [ploegen, setPloegen] = useState<Ploeg[]>([]);
    const [presses, setPresses] = useState<Press[]>([]);
    const [tasks, setTasks] = useState<GroupedTask[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [opsResult, ploegResult, pressResult, records] = await Promise.all([
                pb.collection('operatoren').getFullList(),
                pb.collection('ploegen').getFullList({ expand: 'pers' }),
                pb.collection('persen').getFullList(),
                pb.collection('onderhoud').getFullList({
                    sort: 'sort_order,created',
                    expand: 'category,pers,assigned_operator,assigned_team,tags',
                })
            ]);

            setOperators(opsResult.map((r: any) => ({
                id: r.id,
                employeeId: r.employeeId || '',
                name: r.naam || '',
                presses: Array.isArray(r.presses) ? r.presses : [],
                active: r.active !== false,
                canEditTasks: r.canEditTasks === true,
                canAccessOperatorManagement: r.canAccessOperatorManagement === true,
                dienstverband: r.dienstverband || 'Intern'
            })));

            setPloegen(ploegResult.map((r: any) => {
                let pressNames: string[] = Array.isArray(r.presses) && r.presses.length > 0 ? r.presses : [];
                if (pressNames.length === 0 && r.expand?.pers) {
                    const persRec = r.expand.pers;
                    const name = persRec?.naam || persRec?.name;
                    if (name) pressNames = [name];
                }
                return {
                    id: r.id,
                    name: r.naam || '',
                    operatorIds: Array.isArray(r.leden) ? r.leden : [],
                    presses: pressNames,
                    active: r.active !== false
                };
            }));

            setPresses(pressResult.map((p: any) => ({
                id: p.id,
                name: p.naam,
                active: p.status !== 'niet actief',
                archived: p.archived || false,
                category_order: []
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
                        ...(record.expand?.assigned_operator?.map((o: any) => o.naam) || []),
                        ...(record.expand?.assigned_team?.map((t: any) => t.name) || [])
                    ].join(', '),
                    comment: record.opmerkingen || '',
                    sort_order: record.sort_order || 0,
                    isExternal: record.is_external || false,
                    tagIds: Array.isArray(record.tags) ? record.tags : (record.tags ? [record.tags] : [])
                } as any);
            });
            setTasks(grouped);
        } catch (e) {
            console.error("Failed to fetch settings data", e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        const sub1 = pb.collection('operatoren').subscribe('*', () => fetchData());
        const sub2 = pb.collection('ploegen').subscribe('*', () => fetchData());
        const sub3 = pb.collection('onderhoud').subscribe('*', () => fetchData());
        const sub4 = pb.collection('tags').subscribe('*', () => fetchData());
        return () => {
            sub1.then(unsub => unsub?.());
            sub2.then(unsub => unsub?.());
            sub3.then(unsub => unsub?.());
            sub4.then(unsub => unsub?.());
        };
    }, [fetchData]);

    const flattenedTasks = useMemo(() => {
        const result: MaintenanceTask[] = [];
        tasks.forEach(group => {
            group.subtasks.forEach(sub => {
                result.push({
                    ...sub,
                    task: group.taskName,
                    taskSubtext: group.taskSubtext,
                    category: group.category,
                    categoryId: group.categoryId,
                    press: group.press,
                    pressId: group.pressId,
                    created: '',
                    updated: ''
                } as MaintenanceTask);
            });
        });
        return result;
    }, [tasks]);

    const activeArea = location.pathname.split('/')[1]; // 'Beheer', 'Toolbox', or 'Analyses'
    const fullTabPath = subsubtab ? `${subtab}/${subsubtab}` : subtab;
    const activeTab = fullTabPath || (
        activeArea === 'Analyses' ? 'Rapport' :
            activeArea === 'Toolbox' ? 'Tools' : 'Personeel'
    );


    let sidebarGroups: SidebarGroup[] = [];

    if (activeArea === 'Analyses') {
        sidebarGroups = [
            {
                label: 'PDF Rapporten',
                items: [
                    ...(hasPermission('reports_view') || hasPermission('reports_archive_view') ? [{ value: 'Rapport', label: 'Onderhoud', icon: Calculator, description: 'PDF hub voor onderhoud' }] : []),
                    ...(hasPermission('drukwerken_view') ? [{ value: 'Drukwerken', label: 'Drukwerken', icon: Printer, description: 'PDF hub voor drukwerken' }] : []),
                    ...(hasPermission('checklist_view') ? [{ value: 'Checklist', label: 'Checklist', icon: CalendarClock, description: 'Checklist voor onderhoud aanmaken' }] : []),
                ]
            },
            {
                label: 'Statistieken',
                items: [
                    ...(hasPermission('maintenance_analytics_view') ? [
                        { value: 'statistieken/onderhoud', label: 'Onderhoud', icon: Activity, description: 'Onderhoud statistieken' }
                    ] : []),
                    ...(hasPermission('production_analytics_view') ? [
                        { value: 'statistieken/productie', label: 'Productie', icon: Activity, description: 'Productie data & uptime' }
                    ] : []),
                ]
            }
        ];
    } else {
        sidebarGroups = [
            {
                label: 'Organisatie',
                items: [
                    ...(hasPermission('manage_personnel') ? [{ value: 'Personeel', label: 'Personeel', icon: Users, description: 'Operatoren, Teams & Externen' }] : []),
                    ...(hasPermission('manage_categories') ? [{ value: 'Categorie', label: 'Categorieën', icon: Tags, description: 'Taak groepering' }] : []),
                    ...(hasPermission('manage_tags') ? [{ value: 'Tags', label: 'Tags', icon: TagIcon, description: 'Highlights & Labels' }] : []),
                    ...(hasPermission('manage_presses') ? [{ value: 'Persen', label: 'Persen', icon: Factory, description: 'Machine park' }] : []),
                    ...(hasPermission('management_access') ? [{ value: 'Planner', label: 'Planner', icon: CalendarCog, description: 'Ploegen & planning' }] : []),
                    ...(hasPermission('management_access') ? [{ value: 'Rotatie', label: 'Rotatie', icon: RefreshCw, description: 'Ploegen schema\'s' }] : []),
                    ...(hasPermission('manage_parameters') ? [{ value: 'Parameters', label: 'Parameters', icon: Calculator, description: 'Productie berekening' }] : []),
                ]
            },
            {
                label: 'Toegang & Stijl',
                items: [
                    ...(hasPermission('manage_accounts') ? [{ value: 'Accounts', label: 'Accounts', icon: Key, description: 'Inloggegevens' }] : []),
                    ...(hasPermission('manage_permissions') ? [{ value: 'Rechten', label: 'Rechten', icon: Shield, description: 'Rol permissies' }] : []),
                    ...(hasPermission('manage_themes') ? [{ value: 'Thema', label: 'Thema', icon: Palette, description: 'Kleuren & Look' }] : []),
                ]
            },
            {
                label: 'Systeem & Tools',
                items: [
                    ...(hasPermission('manage_notifications') ? [{ value: 'Notificaties', label: 'Notificaties', icon: Bell, description: 'Meldingen beheer' }] : []),
                    ...(hasPermission('manage_system_tasks') ? [{ value: 'Taken', label: 'Systeem Taken', icon: CalendarClock, description: 'Geplande jobs' }] : []),
                    ...(hasPermission('manage_ticker') ? [
                        { value: 'Ticker', label: 'Activiteit Ticker', icon: Activity, description: 'Header activiteit' },
                    ] : []),
                    ...(hasPermission('toolbox_access') ? [
                        { value: 'Tools', label: 'Tools', icon: Settings, description: 'Algemene tools' },
                        { value: 'Import', label: 'Import', icon: Upload, description: 'Data importeren' },
                    ] : []),
                    ...(hasPermission('data_checker_view') ? [
                        { value: 'Fixes', label: 'Data Checker', icon: ShieldCheck, description: 'Logboek vs Database' },
                        { value: 'DrukwerkenFixes', label: 'Data Checker Drukwerken', icon: ShieldCheck, description: 'Duplicaten & berekeningsfouten' },
                    ] : []),
                    ...(hasPermission('toolbox_access') ? [
                        { value: 'Backup', label: 'Backup & Herstel', icon: Database, description: 'Cloud & snapshots' },
                    ] : []),
                ]
            },
        ];
    }

    sidebarGroups = sidebarGroups.filter(g => g.items.length > 0);

    const onSelect = (value: string) => {
        const isToolboxValue = ['Tools', 'Import', 'Fixes', 'DrukwerkenFixes', 'Backup'].includes(value);
        const isAnalysesValue = ['Rapport', 'Checklist', 'Drukwerken', 'Extern', 'statistieken/onderhoud', 'statistieken/productie'].includes(value);
        const prefix = isAnalysesValue ? 'Analyses' : isToolboxValue ? 'Toolbox' : 'Beheer';
        startTransition(() => navigate(`/${prefix}/${value}`));
    };


    return (
        <div className="flex bg-slate-50 rounded-2xl border border-gray-100/80 shadow-sm overflow-hidden h-[calc(100vh-7rem)] sm:h-[calc(100vh-7rem)] lg:h-[calc(100vh-7rem)] w-full">
            <SettingsSidebar
                groups={sidebarGroups}
                activeValue={activeTab}
                onSelect={onSelect}
                title={activeArea === 'Analyses' ? 'Analyses' : "Systeembeheer"}
            />

            <div className="flex-1 bg-white pt-0 overflow-y-auto w-full h-full relative">
                <div className="h-full w-full animate-in fade-in slide-in-from-bottom-2 duration-500">
                    <Suspense fallback={<div className="flex items-center justify-center p-12 text-slate-400 font-medium">Laden...</div>}>
                        {activeTab === 'Personeel' && (
                            <div className="max-w-6xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8">
                                <OperatorManagement
                                    operators={operators}
                                    ploegen={ploegen}
                                    presses={presses}
                                    isLoading={isLoading}
                                    onRefresh={fetchData}
                                />
                            </div>
                        )}
                        {activeTab === 'Categorie' && <div className="max-w-6xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8"><CategoryManagement /></div>}
                        {activeTab === 'Tags' && <div className="max-w-6xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8"><TagManagement /></div>}
                        {activeTab === 'Persen' && <div className="max-w-6xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8"><PressManagement /></div>}
                        {activeTab === 'Planner' && <div className="max-w-6xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8"><PlannerSettings /></div>}
                        {activeTab === 'Rotatie' && <div className="max-w-6xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8"><RotationBuilder /></div>}
                        {activeTab === 'Parameters' && (
                            <div className="max-w-6xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8"><ParameterManagement /></div>
                        )}
                        {activeTab === 'Accounts' && <div className="max-w-6xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8"><PasswordManagement /></div>}
                        {activeTab === 'Rechten' && <div className="max-w-6xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8"><PermissionManagement /></div>}
                        {activeTab === 'Thema' && <div className="max-w-6xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8"><ThemeManagement /></div>}
                        {activeTab === 'Notificaties' && (
                            <div className="max-w-6xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8"><NotificationManagement /></div>
                        )}
                        {activeTab === 'Taken' && <div className="max-w-6xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8"><SystemTasks /></div>}
                        {activeTab === 'Ticker' && <div className="max-w-6xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8"><TickerSettingsPage /></div>}
                        {activeTab === 'Rapport' && <div className="w-full h-full absolute inset-0 p-2 sm:p-3 lg:p-4"><Reports tasks={flattenedTasks} /></div>}
                        {activeTab === 'Checklist' && <div className="w-full h-full absolute inset-0 p-2 sm:p-3 lg:p-4"><MaintenanceChecklist tasks={flattenedTasks} /></div>}
                        {activeTab === 'Drukwerken' && <div className="w-full h-full absolute inset-0 p-2 sm:p-3 lg:p-4"><DrukwerkenReports presses={presses} /></div>}
                        {activeTab === 'Extern' && (
                            <div className="w-full h-full absolute inset-0">
                                <ExternalTasks tasks={tasks} presses={presses} />
                            </div>
                        )}
                        {activeTab === 'statistieken/onderhoud' && <div className="w-full h-full absolute inset-0 p-4 overflow-y-auto bg-slate-50/50"><MaintenanceAnalytics /></div>}
                        {activeTab === 'statistieken/productie' && <div className="w-full h-full absolute inset-0 p-4 overflow-y-auto bg-slate-50/50"><ProductionAnalytics /></div>}

                        {/* Toolbox screens */}
                        {activeTab === 'Fixes' && <DataChecker />}
                        {activeTab === 'DrukwerkenFixes' && <DrukwerkenDataChecker />}
                        {['Tools', 'Import', 'Backup'].includes(activeTab) && (
                            <div className="max-w-6xl mx-auto space-y-8 px-4 sm:px-6 lg:px-8 pb-4 sm:pb-6 lg:pb-8">
                                <ToolboxContent onNavigateHome={() => navigate('/')} />
                            </div>
                        )}
                    </Suspense>
                </div>
            </div>
        </div>
    );
}
