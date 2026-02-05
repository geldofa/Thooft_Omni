import { useMemo, useState, useEffect, useCallback } from 'react';
import { useAuth, MaintenanceTask, EXTERNAL_TAG_NAME, GroupedTask, pb, Tag } from './AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Calendar, User, Factory } from 'lucide-react';
import { PageHeader } from './PageHeader';

interface ExternalSummaryProps {
    tasks?: GroupedTask[];
    tags?: Tag[];
}

export function ExternalSummary({ tasks: propsTasks, tags: propsTags }: ExternalSummaryProps) {
    const [tasks, setTasks] = useState<GroupedTask[]>(propsTasks || []);
    const [tags, setTags] = useState<Tag[]>(propsTags || []);
    const [isLoading, setIsLoading] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setIsLoading(true);
            const [records, tagRecords] = await Promise.all([
                pb.collection('onderhoud').getFullList({
                    sort: 'sort_order,created',
                    expand: 'category,pers,assigned_operator,assigned_team,tags',
                }),
                pb.collection('tags').getFullList()
            ]);

            const mappedTags = tagRecords.map((t: any) => ({
                id: t.id,
                naam: t.naam,
                kleur: t.kleur,
                active: t.active !== false,
                system_managed: t.system_managed === true
            }));
            setTags(mappedTags);

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
            console.error("Failed to fetch data in ExternalSummary", e);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!propsTasks || !propsTags) {
            fetchData();
        }
    }, [fetchData, propsTasks, propsTags]);

    // Flatten all subtasks and filter those marked as external
    const externalTasks = useMemo(() => {
        const result: MaintenanceTask[] = [];
        tasks.forEach(group => {
            group.subtasks.forEach(sub => {
                const isTagExternal = tags.some(t => t.naam === EXTERNAL_TAG_NAME && sub.tagIds?.includes(t.id));
                if (sub.isExternal || isTagExternal) {
                    result.push({
                        id: sub.id,
                        task: group.taskName,
                        subtaskName: sub.subtaskName,
                        taskSubtext: group.taskSubtext,
                        subtaskSubtext: sub.subtext,
                        category: group.category,
                        categoryId: group.categoryId,
                        press: group.press,
                        pressId: group.pressId,
                        lastMaintenance: sub.lastMaintenance,
                        nextMaintenance: sub.nextMaintenance,
                        maintenanceInterval: sub.maintenanceInterval,
                        maintenanceIntervalUnit: sub.maintenanceIntervalUnit,
                        assignedTo: sub.assignedTo,
                        opmerkingen: sub.comment,
                        comment: sub.comment,
                        commentDate: sub.commentDate,
                        sort_order: sub.sort_order || 0,
                        isExternal: true,
                        tagIds: sub.tagIds,
                        created: '',
                        updated: ''
                    });
                }
            });
        });
        // Sort by nextMaintenance (deadline)
        result.sort((a, b) => {
            const dateA = a.nextMaintenance ? new Date(a.nextMaintenance).getTime() : 0;
            const dateB = b.nextMaintenance ? new Date(b.nextMaintenance).getTime() : 0;
            return dateA - dateB;
        });

        return result;
    }, [tasks, tags]);

    // Group by Press
    const groupedByPress = useMemo(() => {
        const groups: Record<string, MaintenanceTask[]> = {};
        externalTasks.forEach(task => {
            const pressName = task.press as string;
            if (!groups[pressName]) groups[pressName] = [];
            groups[pressName].push(task);
        });
        return groups;
    }, [externalTasks]);

    const formatDate = (date: Date | null) => {
        if (!date) return 'N.v.t.';
        return new Date(date).toLocaleDateString('nl-NL', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    };

    const getStatusBadge = (nextDate: Date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const next = new Date(nextDate);
        next.setHours(0, 0, 0, 0);

        const diffTime = next.getTime() - today.getTime();
        const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysUntil < 0) return <Badge variant="destructive">Te laat</Badge>;
        if (daysUntil <= 7) return <Badge className="bg-orange-500 hover:bg-orange-600 border-none">Binnenkort</Badge>;
        return <Badge variant="secondary">Gepland</Badge>;
    };

    return (
        <div className="w-full mx-auto">
            {isLoading && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/50 backdrop-blur-sm">
                    <div className="flex flex-col items-center gap-2">
                        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                        <p className="font-medium text-blue-900 text-lg">Laden...</p>
                    </div>
                </div>
            )}
            <PageHeader
                title="Totaaloverzicht Externe Taken"
                description="Alle taken die door externe partijen uitgevoerd moeten worden, verzameld over alle persen"
                icon={Factory}
                className="mb-8"
                actions={
                    <Badge variant="outline" className="px-3 py-1 text-sm font-medium border-blue-200 bg-blue-50 text-blue-700">
                        {externalTasks.length} Externe Taken
                    </Badge>
                }
            />

            {externalTasks.length === 0 ? (
                <Card className="border-dashed">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <User className="h-12 w-12 text-gray-300 mb-4" />
                        <CardTitle className="text-gray-400">Geen externe taken gevonden</CardTitle>
                        <p className="text-gray-500 text-sm mt-2 text-center">
                            Er zijn momenteel geen taken gemarkeerd als 'Externe Taak'.<br />
                            Gebruik de 'Externe Taak' toggle bij een taak om deze hier te tonen.
                        </p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-8">
                    {Object.entries(groupedByPress).map(([pressName, pressTasks]) => (
                        <Card key={pressName} className="overflow-hidden border-gray-200">
                            <CardHeader className="bg-gray-50/50 border-b border-gray-100 py-4">
                                <div className="flex items-center gap-2">
                                    <Factory className="h-5 w-5 text-gray-400" />
                                    <CardTitle className="text-lg">{pressName}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent className="p-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-gray-50/30">
                                            <TableHead className="w-[30%]">Taak</TableHead>
                                            <TableHead className="w-[20%]">Categorie</TableHead>
                                            <TableHead className="w-[15%]">Status</TableHead>
                                            <TableHead className="w-[15%]">Deadline</TableHead>
                                            <TableHead className="w-[20%]">Toegewezen aan</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {pressTasks.map((task) => (
                                            <TableRow key={task.id} className="hover:bg-gray-50 transition-colors">
                                                <TableCell>
                                                    <div className="font-medium text-gray-900">{task.subtaskName || task.task}</div>
                                                    {(task.subtaskSubtext || task.taskSubtext) && (
                                                        <div className="text-xs text-gray-500 mt-0.5 italic">
                                                            {task.subtaskSubtext || task.taskSubtext}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>{task.category}</TableCell>
                                                <TableCell>{getStatusBadge(task.nextMaintenance as Date)}</TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                                                        <Calendar className="h-3 w-3" />
                                                        {formatDate(task.nextMaintenance)}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                                                        <User className="h-3 w-3" />
                                                        {task.assignedTo || '-'}
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
