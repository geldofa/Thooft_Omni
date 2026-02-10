import { useState, useEffect } from 'react';
import { pb, FeedbackItem } from './AuthContext';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { PageHeader } from './PageHeader';
import { Rocket, Loader2, Bug, Construction } from 'lucide-react';
import { toast } from 'sonner';

export function Roadmap() {
    const [items, setItems] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRoadmap();

        // Subscribe to real-time updates
        pb.collection('feedback').subscribe('*', () => {
            loadRoadmap();
        });

        return () => {
            pb.collection('feedback').unsubscribe('*');
        };
    }, []);

    const loadRoadmap = async () => {
        try {
            const records = await pb.collection('feedback').getFullList<any>({
                sort: '-created'
            });

            // Map records to FeedbackItem structure
            const mappedItems = records.map(r => ({
                id: r.id,
                type: r.type,
                message: r.message,
                created: r.created,
                status: r.status,
                show_on_roadmap: r.show_on_roadmap,
                roadmap_title: r.roadmap_title || r.message,
                contact_operator: r.contact_operator,
                completed_version: r.completed_version,
                completed_at: r.completed_at
            }));

            setItems(mappedItems);
        } catch (e) {
            console.error("Failed to load roadmap", e);
            toast.error("Kon roadmap niet laden");
        } finally {
            setLoading(false);
        }
    };

    const FeedbackCard = ({ item, color = 'gray', isDeadBug = false }: { item: any, color?: string, isDeadBug?: boolean }) => {
        const colorStyles: Record<string, string> = {
            gray: "bg-white border-gray-100 hover:border-gray-200",
            orange: "bg-white border-orange-100 hover:border-orange-200",
            blue: "bg-white border-blue-100 hover:border-blue-200",
            green: "bg-white border-green-100 hover:border-green-200",
            red: "bg-white border-red-100 hover:border-red-200",
        };

        return (
            <Card key={item.id} className={`${colorStyles[color]} shadow-sm hover:shadow-md transition-all border overflow-hidden shrink-0`}>
                <CardContent className="p-3 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                        <h4 className={`text-sm font-medium text-gray-900 leading-tight ${isDeadBug ? 'line-through text-gray-400' : ''}`}>
                            {item.roadmap_title}
                        </h4>
                    </div>
                    {item.contact_operator && (
                        <div className="text-[10px] font-medium text-blue-500">
                            {item.contact_operator}
                        </div>
                    )}
                    {item.roadmap_title !== item.message && !isDeadBug && (
                        <p className="text-[11px] text-gray-500 line-clamp-2 mt-1">
                            {item.message}
                        </p>
                    )}
                    <div className="text-[9px] text-gray-400 pt-1 mt-1 border-t border-gray-50 flex flex-col gap-1">
                        <div className="flex justify-between items-center">
                            <span>{item.status === 'completed' ? 'Voltooid op: ' : 'Gepland voor: '}{new Date(item.created).toLocaleDateString()}</span>

                            {['planned', 'in_progress', 'completed'].includes(item.status) && item.completed_version && (
                                <span className={`px-1.5 py-0.5 rounded font-bold border ${item.status === 'completed' ? 'bg-green-50 text-green-600 border-green-100' :
                                    item.status === 'in_progress' ? 'bg-orange-50 text-orange-600 border-orange-100' :
                                        'bg-blue-50 text-blue-600 border-blue-100'
                                    }`}>
                                    {item.completed_version}
                                </span>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>
        );
    };

    const Column = ({ title, items, color, subtitle, icon: Icon }: { title: string, items: any[], color: string, subtitle?: string, icon?: any }) => {
        const columnStyles: Record<string, string> = {
            gray: "bg-gray-100/100 border-gray-100 shadow-inner",
            orange: "bg-orange-100/100 border-orange-100 shadow-sm",
            blue: "bg-blue-100/100 border-blue-100 shadow-sm",
            green: "bg-green-100/100 border-green-100 shadow-sm",
            red: "bg-red-100/100 border-red-100 shadow-sm",
        };

        return (
            <div className={`flex flex-col h-full rounded-xl p-3 border ${columnStyles[color]} min-h-[300px] w-full transition-colors duration-300`}>
                <div className="flex items-center gap-2 mb-3 px-1">
                    {Icon && <Icon className={`w-3 h-3 text-${color}-500`} />}
                    {!Icon && <div className={`w-2 h-2 rounded-full bg-${color}-500`} />}
                    <div>
                        <h5 className="text-[11px] font-bold uppercase tracking-wider text-gray-500">{title}</h5>
                        {subtitle && <p className="text-[9px] text-gray-400 leading-none mt-0.5">{subtitle}</p>}
                    </div>
                    <span className="text-[10px] text-gray-400 ml-auto bg-white px-1.5 py-0.5 rounded border border-gray-100">{items.length}</span>
                </div>
                <div className="space-y-4 overflow-y-auto pr-1 flex-1 scrollbar-thin scrollbar-thumb-gray-200">
                    {items.length === 0 ? (
                        <div className="text-center py-6 text-[11px] text-gray-300 italic border border-dashed rounded-lg bg-white/90 border-gray-200">
                            Geen items
                        </div>
                    ) : (
                        items.map(item => (
                            <FeedbackCard
                                key={item.id}
                                item={item}
                                color={color}
                                isDeadBug={item.type === 'bug' && item.status === 'completed'}
                            />
                        ))
                    )}
                </div>
            </div>
        );
    };

    return (
        <div className="w-full flex-1 flex flex-col space-y-6">
            <style>{`
                @media (min-width: 1024px) {
                    .roadmap-flex-row {
                        flex-direction: row !important;
                        flex-wrap: nowrap !important;
                    }
                    .roadmap-flex-1 {
                        flex: 1 1 0% !important;
                        min-width: 0 !important;
                    }
                    .roadmap-divider {
                        display: block !important;
                    }
                }
            `}</style>

            <div className="shrink-0 px-4 lg:px-8">
                <PageHeader
                    title="Roadmap & Bug Tracker"
                    description="Planbare functies en actieve issues in één overzicht."
                    icon={Rocket}
                    iconColor="text-blue-600"
                    iconBgColor="bg-blue-100"
                    actions={
                        <Button
                            variant="outline"
                            size="sm"
                            className="bg-white border-blue-200 text-blue-600 hover:bg-blue-50"
                            onClick={() => window.location.href = '/RoadmapV2'}
                        >
                            Try Roadmap V2 (Beta)
                        </Button>
                    }
                />
            </div>

            {loading ? (
                <div className="flex justify-center p-12 shrink-0">
                    <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
            ) : (
                <div className="w-full flex-1 px-4 lg:px-8 pb-12">
                    <div className="roadmap-flex-row flex flex-col gap-8 w-full items-start">
                        {/* FEATURE COLUMN 1 */}
                        <div className="roadmap-flex-1 flex flex-col gap-8 w-full">
                            <Column
                                title="Nog niet gezien"
                                subtitle="Nieuwe suggesties"
                                icon={Construction}
                                items={items.filter(i => i.type === 'feature' && (i.status === 'pending' || !i.status))}
                                color="gray"
                            />
                            <Column
                                title="Mee Bezig"
                                subtitle="Nu in ontwikkeling"
                                icon={Construction}
                                items={items.filter(i => i.type === 'feature' && i.status === 'in_progress')}
                                color="orange"
                            />
                        </div>

                        {/* FEATURE COLUMN 2 */}
                        <div className="roadmap-flex-1 flex flex-col gap-8 w-full">
                            <Column
                                title="Gepland"
                                subtitle="Volgende op de lijst"
                                icon={Construction}
                                items={items.filter(i => i.type === 'feature' && i.status === 'planned')}
                                color="blue"
                            />
                            <Column
                                title="Uitgevoerd"
                                subtitle="Klaar voor gebruik"
                                icon={Construction}
                                items={items.filter(i => i.type === 'feature' && i.status === 'completed')}
                                color="green"
                            />
                        </div>

                        {/* VISUAL DIVIDER */}
                        <div className="roadmap-divider hidden w-[2px] self-stretch bg-gray-200 shrink-0 mx-2 shadow-sm" />

                        {/* BUG COLUMN 3 */}
                        <div className="roadmap-flex-1 flex flex-col gap-8 w-full">
                            <Column
                                title="Live Bugs"
                                subtitle="Actieve issues"
                                icon={Bug}
                                items={items.filter(i => i.type === 'bug' && i.status !== 'completed')}
                                color="red"
                            />
                            <Column
                                title="Dead Bugs"
                                subtitle="Gefixte issues"
                                icon={Bug}
                                items={items.filter(i => i.type === 'bug' && i.status === 'completed')}
                                color="gray"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
