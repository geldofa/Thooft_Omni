import { startTransition, Suspense, lazy, useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { GroupedTask } from './AuthContext';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { Users, Tags, Factory, Key, Tag as TagIcon, Shield, Calculator } from 'lucide-react';
import { useAuth, pb, Operator, Ploeg, MaintenanceTask, Tag, Press } from './AuthContext';
import { OperatorManagement } from './OperatorManagement';
import { CategoryManagement } from './CategoryManagement';
import { PressManagement } from './PressManagement';
import { PasswordManagement } from './PasswordManagement';
import { ExternalSummary } from './ExternalSummary';
import { TagManagement } from './TagManagement';
import { PermissionManagement } from './PermissionManagement';
import { Reports } from './Reports';
import { MaintenanceChecklist } from './MaintenanceChecklist';

const ParameterManagement = lazy(() => import('./ParameterManagement').then(m => ({ default: m.ParameterManagement })));

interface ManagementLayoutProps {
    tasks?: GroupedTask[];
    tags?: Tag[];
}

export function ManagementLayout({ tasks: propsTasks, tags: propsTags }: ManagementLayoutProps) {
    const { hasPermission } = useAuth();
    const { subtab } = useParams<{ subtab: string }>();
    const navigate = useNavigate();

    const [operators, setOperators] = useState<Operator[]>([]);
    const [ploegen, setPloegen] = useState<Ploeg[]>([]);
    const [presses, setPresses] = useState<Press[]>([]);
    const [tasks, setTasks] = useState<GroupedTask[]>(propsTasks || []);
    const [tags, setTags] = useState<Tag[]>(propsTags || []);
    const [isLoading, setIsLoading] = useState(true);

    const fetchPersonnel = useCallback(async () => {
        try {
            setIsLoading(true);
            const [opsResult, ploegResult, pressResult] = await Promise.all([
                pb.collection('operatoren').getFullList(),
                pb.collection('ploegen').getFullList(),
                pb.collection('persen').getFullList()
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
                const press = pressResult.find((p: any) => p.id === r.pers);
                return {
                    id: r.id,
                    name: r.naam || '',
                    operatorIds: Array.isArray(r.leden) ? r.leden : [],
                    presses: press ? [press.naam] : [],
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
        } catch (e) {
            console.error("Failed to fetch personnel data", e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchManagementData = useCallback(async () => {
        try {
            const [records, tagRecords] = await Promise.all([
                pb.collection('onderhoud').getFullList({
                    sort: 'sort_order,created',
                    expand: 'category,pers,assigned_operator,assigned_team,tags',
                }),
                pb.collection('tags').getFullList()
            ]);

            setTags(tagRecords.map((t: any) => ({
                id: t.id,
                naam: t.naam,
                kleur: t.kleur,
                active: t.active !== false,
                system_managed: t.system_managed === true
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
                    tagIds: record.tags || []
                } as any);
            });

            setTasks(grouped);
        } catch (e) {
            console.error("Failed to fetch management data", e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!propsTasks || !propsTags) {
            fetchManagementData();
        }
    }, [fetchManagementData, propsTasks, propsTags]);

    useEffect(() => {
        fetchPersonnel();

        // Subscribe to changes
        const unsubscribe = Promise.all([
            pb.collection('operatoren').subscribe('*', () => fetchPersonnel()),
            pb.collection('ploegen').subscribe('*', () => fetchPersonnel()),
            pb.collection('onderhoud').subscribe('*', () => fetchManagementData()),
            pb.collection('tags').subscribe('*', () => fetchManagementData())
        ]);

        return () => {
            unsubscribe.then(subs => subs.forEach(unsub => {
                if (typeof unsub === 'function') unsub();
            }));
            pb.collection('operatoren').unsubscribe('*');
            pb.collection('ploegen').unsubscribe('*');
            pb.collection('onderhoud').unsubscribe('*');
            pb.collection('tags').unsubscribe('*');
        };
    }, [fetchPersonnel, fetchManagementData]);

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
                    created: '', // Not strictly needed for UI usually
                    updated: ''
                } as MaintenanceTask);
            });
        });
        return result;
    }, [tasks]);

    const activeTab = subtab || 'Personeel';

    const tabMapping: Record<string, string> = {
        'Personeel': 'operators',
        'Categorie': 'categories',
        'Tags': 'tags',
        'Persen': 'presses',
        'Parameters': 'parameters',
        'Accounts': 'passwords',
        'Rechten': 'permissions',
        'Extern': 'extern',
        'Rapport': 'reports',
        'Checklist': 'checklist'
    };

    const currentTab = tabMapping[activeTab] || 'operators';

    // Generic header logic removed, components execute their own header


    return (
        <div className="p-2 w-full mx-auto">


            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
                <Tabs
                    value={activeTab}
                    onValueChange={(value) => startTransition(() => navigate(`/Beheer/${value}`))}
                    className="w-full sm:w-auto"
                >
                    <TabsList className="tab-pill-list flex items-center flex-wrap">
                        {hasPermission('manage_personnel') && (
                            <TabsTrigger value="Personeel" className="tab-pill-trigger">
                                <Users className="w-4 h-4 mr-2" /> Personeel
                            </TabsTrigger>
                        )}

                        {hasPermission('manage_categories') && (
                            <TabsTrigger value="Categorie" className="tab-pill-trigger">
                                <Tags className="w-4 h-4 mr-2" /> Categorieën
                            </TabsTrigger>
                        )}

                        {hasPermission('manage_tags') && (
                            <TabsTrigger value="Tags" className="tab-pill-trigger">
                                <TagIcon className="w-4 h-4 mr-2" /> Tags
                            </TabsTrigger>
                        )}

                        {hasPermission('manage_presses') && (
                            <TabsTrigger value="Persen" className="tab-pill-trigger">
                                <Factory className="w-4 h-4 mr-2" /> Persen
                            </TabsTrigger>
                        )}

                        {(hasPermission('manage_parameters') || true) && (
                            <TabsTrigger value="Parameters" className="tab-pill-trigger">
                                <Calculator className="w-4 h-4 mr-2" /> Parameters
                            </TabsTrigger>
                        )}

                        {hasPermission('manage_accounts') && (
                            <TabsTrigger value="Accounts" className="tab-pill-trigger">
                                <Key className="w-4 h-4 mr-2" /> Accounts
                            </TabsTrigger>
                        )}

                        {hasPermission('manage_permissions') && (
                            <TabsTrigger value="Rechten" className="tab-pill-trigger">
                                <Shield className="w-4 h-4 mr-2" /> Rechten
                            </TabsTrigger>
                        )}


                    </TabsList>
                </Tabs>
            </div>

            <main>
                <Suspense fallback={<div className="p-8 text-center text-gray-500">Laden...</div>}>
                    {currentTab === 'operators' && (
                        <OperatorManagement
                            operators={operators}
                            ploegen={ploegen}
                            presses={presses}
                            isLoading={isLoading}
                            onRefresh={fetchPersonnel}
                        />
                    )}
                    {currentTab === 'extern' && <ExternalSummary tasks={tasks} tags={tags} />}
                    {currentTab === 'categories' && <CategoryManagement />}
                    {currentTab === 'tags' && <TagManagement />}
                    {currentTab === 'presses' && <PressManagement />}
                    {currentTab === 'parameters' && <ParameterManagement />}
                    {currentTab === 'passwords' && <PasswordManagement />}
                    {currentTab === 'permissions' && <PermissionManagement />}
                    {currentTab === 'reports' && <Reports tasks={flattenedTasks} />}
                    {currentTab === 'checklist' && <MaintenanceChecklist tasks={flattenedTasks} />}
                </Suspense>
            </main>
        </div>
    );
}
