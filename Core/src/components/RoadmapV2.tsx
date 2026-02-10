import { useState, useEffect, useMemo } from 'react';
import { pb, FeedbackItem } from './AuthContext';
import { PageHeader } from './PageHeader';
import { Rocket, Loader2, Check, Calendar, Bug, Construction, MessageSquare } from 'lucide-react';
import { Badge } from './ui/badge';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { toast } from 'sonner';
import { FeedbackList } from './FeedbackList';

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700 border-gray-200',
    planned: 'bg-blue-50 text-blue-700 border-blue-200',
    in_progress: 'bg-orange-50 text-orange-700 border-orange-200',
    completed: 'bg-green-50 text-green-700 border-green-200',
    rejected: 'bg-red-50 text-red-700 border-red-200'
};

export function RoadmapV2() {
    const [items, setItems] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRoadmap();
        const subscribe = async () => {
            await pb.collection('feedback').subscribe('*', () => loadRoadmap());
        };
        subscribe();
        return () => {
            pb.collection('feedback').unsubscribe('*');
        };
    }, []);

    const loadRoadmap = async () => {
        try {
            const records = await pb.collection('feedback').getFullList<any>({
                sort: '-created'
            });

            setItems(records.map(r => ({
                id: r.id,
                type: r.type,
                message: r.message,
                created: r.created,
                status: r.status,
                show_on_roadmap: r.show_on_roadmap,
                roadmap_title: r.roadmap_title || r.message,
                completed_version: r.completed_version,
                completed_at: r.completed_at
            })));
        } catch (e) {
            console.error("Failed to load roadmap", e);
            toast.error("Kon roadmap niet laden");
        } finally {
            setLoading(false);
        }
    };

    // Interleave them by date so they follow the line down.
    const allSorted = useMemo(() => [...items].sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()), [items]);

    const upcomingItems = useMemo(() => allSorted.filter(i => i.status !== 'completed' && i.status !== 'rejected'), [allSorted]);
    const completedItems = useMemo(() => allSorted.filter(i => i.status === 'completed'), [allSorted]);

    return (
        <div className="w-full flex-1 flex flex-col min-h-[600px] overflow-hidden">
            <div className="shrink-0 px-4 lg:px-8">
                <PageHeader
                    title="Roadmap Alpha"
                    description="Een vereenvoudigd overzicht van onze voortgang."
                    icon={Rocket}
                />
            </div>

            <div className="flex-1 grid grid-cols-[minmax(0,3fr)_minmax(0,1fr)] gap-6 p-4 lg:p-6 overflow-hidden h-full min-h-0">
                {/* Left Side: Feedback List (75% width) */}
                <div className="flex flex-col overflow-hidden min-w-0">
                    <FeedbackList compact={true} />
                </div>

                {/* Right Side: Roadmap Timeline (25% width) */}
                <div className="bg-white rounded-xl shadow-sm border overflow-y-auto min-w-0 pt-6">
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <div className="relative w-full mx-auto mt-8 px-2 pb-24">
                            {/* Vertical Line */}
                            <div className="absolute left-[24px] top-0 bottom-0 w-0.5 bg-gray-100" />

                            <div className="relative pl-12 space-y-10">
                                {/* Upcoming Section */}
                                {upcomingItems.length > 0 && (
                                    <div className="relative">
                                        <div className="flex mb-6">
                                            <span className="bg-gray-100 px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider text-gray-500 border">
                                                In Afwachting
                                            </span>
                                        </div>
                                        <div className="space-y-6">
                                            {upcomingItems.map((item) => (
                                                <div key={item.id} className="relative">
                                                    {/* Better Centered Dot on the line */}
                                                    <div className="absolute left-[-30px] top-2.5 -translate-x-1/2 flex items-center justify-center z-10">
                                                        <div className={`w-3.5 h-3.5 rounded-full border-2 bg-white flex items-center justify-center ${item.type === 'bug' ? 'border-red-400' : 'border-blue-400'}`}>
                                                            <div className={`w-1.5 h-1.5 rounded-full ${item.type === 'bug' ? 'bg-red-400' : 'bg-blue-400'}`} />
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col items-start gap-1">
                                                        <Badge
                                                            variant="outline"
                                                            className={`h-auto py-1 px-2.5 text-[10px] font-semibold rounded-lg border shadow-sm transition-all hover:scale-105 ${STATUS_COLORS[item.status || 'pending']}`}
                                                        >
                                                            {item.roadmap_title}
                                                            {item.completed_version && <span className="ml-1.5 opacity-60 text-[8px]">v{item.completed_version}</span>}
                                                        </Badge>
                                                        <div className="flex items-center gap-1.5 text-[8px] text-gray-400 font-medium px-1">
                                                            <div className="flex items-center gap-1">
                                                                <Calendar className="w-2.5 h-2.5" />
                                                                {format(new Date(item.created), 'MMM yy', { locale: nl })}
                                                            </div>
                                                            <div className="w-1 h-1 rounded-full bg-gray-200" />
                                                            <div className="flex items-center gap-1 text-gray-500">
                                                                {item.type === 'bug' ? <Bug className="w-2.5 h-2.5" /> :
                                                                    item.type === 'feature' ? <Construction className="w-2.5 h-2.5" /> :
                                                                        <MessageSquare className="w-2.5 h-2.5" />}
                                                                <span className="capitalize">{item.type}</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* History Section Label */}
                                {upcomingItems.length > 0 && completedItems.length > 0 && (
                                    <div className="flex py-2 relative z-20">
                                        <span className="text-[9px] font-bold uppercase tracking-[0.2em] text-green-700 bg-white pr-2">
                                            Geïmplementeerd
                                        </span>
                                    </div>
                                )}

                                {/* Completed Items List */}
                                <div className="space-y-6">
                                    {completedItems.map((item) => (
                                        <div key={item.id} className="relative">
                                            {/* Better Centered Dot on the line */}
                                            <div className="absolute left-[-30px] top-2.5 -translate-x-1/2 flex items-center justify-center z-10">
                                                <div className={`w-3 h-3 rounded-full border-2 bg-white flex items-center justify-center ${item.type === 'bug' ? 'border-red-300' : 'border-blue-300'}`}>
                                                    <div className={`w-1 h-1 rounded-full ${item.type === 'bug' ? 'bg-red-300' : 'bg-blue-300'}`} />
                                                </div>
                                            </div>

                                            <div className="flex flex-col items-start gap-1 opacity-80">
                                                <Badge
                                                    variant="outline"
                                                    className={`h-auto py-1 px-2.5 text-[10px] font-semibold rounded-lg border shadow-none ${STATUS_COLORS[item.status || 'pending']}`}
                                                >
                                                    <Check className="w-2.5 h-2.5 mr-1" />
                                                    {item.roadmap_title}
                                                    {item.completed_version && <span className="ml-1.5 opacity-60 text-[8px]">v{item.completed_version}</span>}
                                                </Badge>
                                                <div className="flex items-center gap-1.5 text-[8px] text-gray-400 font-medium px-1">
                                                    <div className="flex items-center gap-1">
                                                        <Calendar className="w-2.5 h-2.5" />
                                                        {format(new Date(item.created), 'MMM yy', { locale: nl })}
                                                    </div>
                                                    <div className="w-1 h-1 rounded-full bg-gray-200" />
                                                    <div className="flex items-center gap-1 text-gray-500">
                                                        {item.type === 'bug' ? <Bug className="w-2.5 h-2.5" /> :
                                                            item.type === 'feature' ? <Construction className="w-2.5 h-2.5" /> :
                                                                <MessageSquare className="w-2.5 h-2.5" />}
                                                        <span className="capitalize">{item.type}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {items.length === 0 && (
                                    <div className="text-center py-20 text-gray-400 italic text-[11px]">
                                        Geen items gevonden.
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
