import { useState } from 'react';
import { Card, CardContent, CardTitle } from './ui/card';
import { ScrollArea, ScrollBar } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Tabs, TabsList, TabsTrigger } from './ui/tabs';
import { GroupedTask } from './AuthContext';
import { getStatusInfo } from '../utils/StatusUtils';

// --- Types ---
interface Press {
    id: string;
    name: string;
}

interface ExternalTasksProps {
    tasks: GroupedTask[];
    presses: Press[];
    isEmbedded?: boolean;
}

// --- Helpers ---
// --- Helpers ---
import { formatDisplayDate } from '../utils/dateUtils';
const formatDate = (date: Date) => {
    return formatDisplayDate(date);
};

const getRelativeTimeString = (date: Date) => {
    const now = new Date();
    const then = new Date(date);

    // Reset times to midnight for accurate day difference
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfThen = new Date(then.getFullYear(), then.getMonth(), then.getDate());

    const diffTime = startOfThen.getTime() - startOfToday.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return `${Math.abs(diffDays)} dagen geleden`;
    if (diffDays === 0) return 'Vandaag';
    if (diffDays === 1) return 'Morgen';

    const diffMonths = (then.getFullYear() - now.getFullYear()) * 12 + (then.getMonth() - now.getMonth());

    if (diffDays < 30) return `Binnen ${diffDays} dagen`;
    if (diffMonths === 1) return `Volgende maand`;
    if (diffMonths < 12) return `Over ${diffMonths} maanden`;

    const diffYears = then.getFullYear() - now.getFullYear();
    if (diffYears === 1) return `Volgend jaar`;

    return `Over ${diffYears} jaar`;
};

export function ExternalTasks({ tasks, presses, isEmbedded = false }: ExternalTasksProps) {
    const [viewMode, setViewMode] = useState('kanban');

    // Group tasks dynamically based on presses
    const activePresses = presses.filter(p => p.name !== 'Geen specifieke pers');

    const tasksByPress = activePresses.map(press => {
        // Collect all external subtasks for this press
        const pressTasks = tasks
            .filter(group => group.pressId === press.id)
            .flatMap(group =>
                group.subtasks
                    .filter((sub: any) => sub.isExternal)
                    .map(sub => ({
                        ...sub,
                        taskName: group.taskName,
                        statusInfo: getStatusInfo(sub.nextMaintenance)
                    }))
            );

        // Sort tasks by next maintenance date (closest first)
        pressTasks.sort((a, b) => a.nextMaintenance.getTime() - b.nextMaintenance.getTime());

        return {
            ...press,
            tasks: pressTasks
        };
    }).filter(press => press.tasks.length > 0); // Only show presses that have external tasks

    return (
        // 1. MAIN CONTAINER: hide overflow so page never scrolls
        <div className={`h-full w-full bg-slate-50 overflow-hidden ${isEmbedded ? '' : 'pb-4 sm:pb-6 lg:pb-8'}`}>
            <div className="max-w-6xl mx-auto w-full h-full flex flex-col">
                {/* 2. HEADER */}
                {!isEmbedded && (
                    <div className="flex-none px-4 sm:px-6 lg:px-8 py-4 bg-transparent flex items-center justify-between z-10 w-full relative">
                        <div>
                            <h1 className="text-2xl font-semibold text-slate-900 tracking-tight">Externe Taken</h1>
                            <p className="text-sm text-slate-500 mt-1">Overzicht en status van alle externe taken per machine</p>
                        </div>

                        {/* Placeholder for future View Toggle */}
                        <div className="flex items-center gap-3">
                            <Tabs value={viewMode} onValueChange={setViewMode} className="w-full sm:w-[300px]">
                                <TabsList className="grid w-full grid-cols-3 h-9 p-1 shadow-sm">
                                    <TabsTrigger value="kanban" className="text-xs">Overzicht</TabsTrigger>
                                    <TabsTrigger value="timeline" disabled className="text-xs">Tijdlijn</TabsTrigger>
                                    <TabsTrigger value="list" disabled className="text-xs">Lijst</TabsTrigger>
                                </TabsList>
                            </Tabs>
                        </div>
                    </div>
                )}

                {/* 3. BOARD CONTAINER: Horizontal scroll, remaining height */}
                <div className="flex-1 overflow-x-auto overflow-y-hidden px-4 sm:px-6 lg:px-8 [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-transparent">
                    <div className="flex h-full gap-6 items-stretch w-full pb-2">

                        {/* 4. COLUMNS */}
                        {tasksByPress.map(press => (
                            <div
                                key={press.id}
                                className="flex flex-col h-full min-h-0 bg-slate-100/50 rounded-xl border border-slate-200 shadow-sm flex-1 min-w-[300px]"
                            >
                                {/* Column Header */}
                                <div className="flex-none p-4 flex items-center justify-between border-b border-slate-200/60 bg-slate-50 rounded-t-xl">
                                    <h2 className="font-semibold text-slate-800">{press.name}</h2>
                                    <Badge variant="secondary" className="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-2 py-0.5 shadow-sm">
                                        {press.tasks.length} {press.tasks.length === 1 ? 'taak' : 'taken'}
                                    </Badge>
                                </div>

                                {/* 5. COLUMN CONTENT: Vertical Scroll inside column only */}
                                <ScrollArea className="flex-1 min-h-0 w-full px-3 py-3">
                                    <div className="flex flex-col gap-3 pb-4">
                                        {press.tasks.length === 0 ? (
                                            <div className="text-center p-6 mt-4 text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg">
                                                Geen externe taken
                                            </div>
                                        ) : (
                                            // 6. TASK CARDS
                                            press.tasks.map(task => {
                                                const showSubtaskName = task.subtaskName && task.subtaskName !== task.taskName;
                                                const isOverdue = task.statusInfo.key === 'Te laat';
                                                return (
                                                    <Card key={task.id} className={`shadow-sm border-slate-200/60 hover:shadow-md transition-shadow cursor-default !gap-0 ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-white'}`}>
                                                        <div className="p-4 pb-2">
                                                            {task.assignedTo && (
                                                                <div className="float-right ml-3 mb-1 flex items-center bg-white/80 backdrop-blur-sm border border-slate-200 px-2 py-0.5 rounded-md text-[10px] font-bold text-slate-600 shadow-sm">
                                                                    <span className="truncate max-w-[100px]">{task.assignedTo}</span>
                                                                </div>
                                                            )}
                                                            <CardTitle className={`text-sm ${showSubtaskName ? 'text-slate-500 font-semibold tracking-wide uppercase text-[10px]' : 'font-medium leading-snug text-slate-800'}`}>
                                                                {task.taskName}
                                                            </CardTitle>
                                                            {showSubtaskName && (
                                                                <div className="text-sm font-medium leading-snug text-slate-800 mt-2 pt-2 border-t border-slate-100 clear-right">
                                                                    {task.subtaskName}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <CardContent className="px-4 !pb-3 pt-1">
                                                            <div className="flex flex-col">
                                                                <div className="flex flex-col gap-1.5 pt-1.5 border-t border-slate-100">
                                                                    {task.lastMaintenance && (
                                                                        <div className="flex items-center text-[11px] text-slate-400">
                                                                            <span className="w-16">Laatste:</span>
                                                                            <span className="font-medium text-slate-500">{formatDate(new Date(task.lastMaintenance))}</span>
                                                                        </div>
                                                                    )}
                                                                    <div className="flex items-center text-[11px] text-slate-400">
                                                                        <span className="w-16">Volgende:</span>
                                                                        <div className="flex items-center gap-1.5 font-medium text-slate-700">
                                                                            <span>{formatDate(task.nextMaintenance)}</span>
                                                                            <span className="text-slate-300">•</span>
                                                                            <span className={`${isOverdue ? 'text-red-600 font-bold' : 'text-blue-600'}`}>{getRelativeTimeString(task.nextMaintenance)}</span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </CardContent>
                                                    </Card>
                                                );
                                            })
                                        )}
                                    </div>
                                    <ScrollBar orientation="vertical" />
                                </ScrollArea>
                            </div>
                        ))}

                    </div>
                </div>
            </div>
        </div>
    );
}

export default ExternalTasks;
