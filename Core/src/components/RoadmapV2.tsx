import { useState, useEffect, useMemo } from 'react';
import { useAuth, pb, FeedbackItem } from './AuthContext';
import { PageHeader } from './PageHeader';
import { Rocket, Loader2, Check, Calendar, Bug, Construction, MessageSquare, Plus, Edit, Archive, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';
import { toast } from 'sonner';
import { FeedbackDialog } from './FeedbackDialog';
import { ConfirmationModal } from './ui/ConfirmationModal';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "./ui/table";

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-700 border-gray-200',
    planned: 'bg-blue-50 text-blue-700 border-blue-200',
    in_progress: 'bg-orange-50 text-orange-700 border-orange-200',
    completed: 'bg-green-50 text-green-700 border-green-200',
    rejected: 'bg-red-50 text-red-700 border-red-200'
};

const STATUS_LABELS: Record<string, string> = {
    pending: 'Nog niet gezien',
    planned: 'Gepland',
    in_progress: 'Bezig',
    completed: 'Uitgevoerd',
    rejected: 'Afgekeurd'
};

const FONT_SIZES = {
    label: 'text-[12px]',
    item: 'text-[11px]',
    sub: 'text-[11px]',
    empty: 'text-[10px]',
    table_body: 'text-sm',
    table_sub: 'text-xs'
};

const COL_WIDTHS = {
    status: '200px',
    message: 'auto',
    user: '140px',
};

export function RoadmapV2() {
    const { user, hasPermission } = useAuth();
    const [items, setItems] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);

    // Feedback Management State
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [editingFeedback, setEditingFeedback] = useState<FeedbackItem | null>(null);
    const [deleteModalOpen, setDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);
    const [showArchived, setShowArchived] = useState(false);

    const canManage = hasPermission('feedback_manage');
    const canSeeArchived = hasPermission('feedback_view');

    useEffect(() => {
        loadData();
        let isSubscribed = false;
        const subscribe = async () => {
            if (!user) return;
            try {
                await pb.collection('feedback').subscribe('*', () => loadData());
                isSubscribed = true;
            } catch (err) {
                console.error("RoadmapV2 feedback subscription failed:", err);
            }
        };
        subscribe();
        return () => {
            if (isSubscribed) {
                pb.collection('feedback').unsubscribe('*').catch(() => { });
            }
        };
    }, [user?.id]);

    const loadData = async () => {
        try {
            const records = await pb.collection('feedback').getFullList<any>({
                sort: '-created'
            });

            setItems(records.map(r => {
                // Try context.operator as fallback
                let operator = r.contact_operator;
                if (!operator && r.context) {
                    try {
                        const ctx = typeof r.context === 'string' ? JSON.parse(r.context) : r.context;
                        operator = ctx?.operator;
                    } catch { }
                }

                return {
                    id: r.id,
                    type: r.type,
                    message: r.message,
                    created: r.created,
                    status: r.status,
                    show_on_roadmap: r.show_on_roadmap,
                    roadmap_title: r.roadmap_title || r.message,
                    completed_version: r.completed_version,
                    completed_at: r.completed_at,
                    url: r.url,
                    username: r.username,
                    ip: r.ip,
                    contact_operator: operator,
                    admin_comment: r.admin_comment,
                    archived: r.archived === true,
                };
            }));
        } catch (e) {
            console.error("Failed to load feedback", e);
            toast.error("Kon data niet laden");
        } finally {
            setLoading(false);
        }
    };

    // --- TIMELINE LOGIC ---
    const allSorted = useMemo(() => [...items].sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime()), [items]);
    const roadmapUpcoming = useMemo(() => allSorted.filter(i => i.status !== 'completed' && i.status !== 'rejected' && !i.archived), [allSorted]);
    const roadmapCompleted = useMemo(() => allSorted.filter(i => i.status === 'completed' && !i.archived), [allSorted]);

    // --- LIST LOGIC ---
    const activeFeedback = useMemo(() => items.filter(f => !f.archived && f.status !== 'completed'), [items]);
    const completedFeedback = useMemo(() => items.filter(f => !f.archived && f.status === 'completed'), [items]);
    const archivedFeedback = useMemo(() => items.filter(f => f.archived), [items]);

    // --- ACTIONS ---
    const handleDelete = (id: string) => {
        setItemToDelete(id);
        setDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        try {
            await pb.collection('feedback').delete(itemToDelete);
            toast.success("Feedback verwijderd");
            // Realtime update will reload data
        } catch (e) {
            toast.error("Fout bij verwijderen");
            loadData();
        } finally {
            setItemToDelete(null);
        }
    };

    const handleArchive = async (id: string) => {
        try {
            await pb.collection('feedback').update(id, { archived: true });
            toast.success("Feedback gearchiveerd");
            // Realtime update will reload data
        } catch (e) {
            toast.error("Fout bij archiveren");
            loadData();
        }
    };

    // --- RENDER HELPERS ---
    const renderFeedbackTable = (tableItems: FeedbackItem[], isArchivedTable: boolean = false) => (
        <Table className={`table-fixed ${FONT_SIZES.table_body}`}>
            <TableHeader className="bg-gray-50">
                <TableRow>
                    <TableHead style={{ width: COL_WIDTHS.status }}>Status</TableHead>
                    <TableHead style={{ width: COL_WIDTHS.message }}>Bericht</TableHead>
                    <TableHead style={{ width: COL_WIDTHS.user }}>Contact</TableHead>
                    {canManage && <TableHead className="text-right w-[100px]">Acties</TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {tableItems.map((item) => (
                    <TableRow
                        key={item.id}
                        className={`hover:bg-gray-50/50 group ${isArchivedTable ? 'opacity-60' : ''} ${canManage ? 'cursor-pointer' : ''}`}
                        onClick={() => {
                            if (canManage) {
                                setEditingFeedback(item);
                                setIsFeedbackOpen(true);
                            }
                        }}
                    >
                        <TableCell>
                            <div className="flex items-center gap-2 overflow-hidden">
                                <Badge variant="outline" className={`font-normal whitespace-nowrap border-0 flex items-center gap-1.5 ${STATUS_COLORS[item.status || 'pending']}`}>
                                    {item.status === 'completed' ? <Check className="w-3.5 h-3.5" /> : STATUS_LABELS[item.status || 'pending']}
                                </Badge>
                                {item.completed_version && (
                                    <Badge variant="outline" className={`text-[10px] h-5 px-1.5 font-medium border-0 whitespace-nowrap ${STATUS_COLORS[item.status || 'pending']}`}>
                                        {item.completed_version}
                                    </Badge>
                                )}
                            </div>
                        </TableCell>
                        <TableCell className="align-top py-4">
                            <div className={`font-medium ${FONT_SIZES.table_body} whitespace-pre-wrap truncate max-w-full`} title={item.message}>{item.message}</div>
                            {item.url && canManage && (
                                <div className={`${FONT_SIZES.table_sub} text-gray-400 mt-1 truncate max-w-[300px]`} title={item.url}>
                                    Op: {item.url}
                                </div>
                            )}
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col">
                                {item.contact_operator && (
                                    <span className="text-blue-600 font-medium">{item.contact_operator}</span>
                                )}
                                <span className={`${FONT_SIZES.table_sub} text-gray-400`}>
                                    {format(new Date(item.created), 'dd/MM/yyyy')}
                                </span>
                            </div>
                        </TableCell>
                        {canManage && (
                            <TableCell className="text-right">
                                <div className="flex gap-1 justify-end" onClick={(e) => e.stopPropagation()}>
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-blue-100" onClick={() => { setEditingFeedback(item); setIsFeedbackOpen(true); }}>
                                        <Edit className="w-4 h-4 text-blue-500" />
                                    </Button>
                                    {!isArchivedTable && (
                                        <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-orange-100" onClick={() => handleArchive(item.id)}>
                                            <Archive className="w-4 h-4 text-orange-500" />
                                        </Button>
                                    )}
                                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 hover:bg-red-100" onClick={() => handleDelete(item.id)}>
                                        <Trash2 className="w-4 h-4 text-red-500" />
                                    </Button>
                                </div>
                            </TableCell>
                        )}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );

    return (
        <div className="w-full flex-1 flex flex-col min-h-[600px] overflow-hidden">
            <div className="shrink-0 px-4 lg:px-8">
                <PageHeader
                    title="Feedback & Roadmap"
                    description="Beheer feedback en bekijk de voortgang."
                    icon={Rocket}
                />
            </div>

            <div className="flex-1 grid grid-cols-[minmax(0,3fr)_minmax(0,1fr)] gap-6 p-4 lg:p-6 overflow-hidden h-full min-h-0">
                {/* Left Side: Feedback List (75% width) */}
                <div className="flex flex-col overflow-hidden min-w-0 bg-white rounded-xl shadow-sm border">
                    <div className="p-4 border-b flex justify-between items-center bg-gray-50/50">
                        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                            <MessageSquare className="w-4 h-4 text-gray-500" />
                            Feedback Overzicht
                        </h3>
                        <Button onClick={() => setIsFeedbackOpen(true)} size="sm" className="gap-2 h-8">
                            <Plus className="w-4 h-4" /> Nieuwe Feedback
                        </Button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 space-y-8">
                        {loading ? (
                            <div className="flex justify-center p-8">
                                <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                            </div>
                        ) : activeFeedback.length === 0 && archivedFeedback.length === 0 ? (
                            <div className="text-center py-12 flex flex-col items-center gap-4">
                                <MessageSquare className="w-12 h-12 text-gray-200" />
                                <div className="text-gray-500 font-medium">Nog geen feedback gevonden</div>
                            </div>
                        ) : (
                            <>
                                {/* Active Feedback */}
                                {activeFeedback.length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-2 px-1">
                                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                                            To Do ({activeFeedback.length})
                                        </h3>
                                        <div className="rounded-md border overflow-hidden bg-white shadow-sm">
                                            {renderFeedbackTable(activeFeedback)}
                                        </div>
                                    </div>
                                )}

                                {/* Completed Feedback */}
                                {completedFeedback.length > 0 && (
                                    <div className="space-y-3">
                                        <h3 className="text-sm font-semibold text-green-700 flex items-center gap-2 px-1">
                                            <div className="w-2 h-2 rounded-full bg-green-500" />
                                            Afgerond ({completedFeedback.length})
                                        </h3>
                                        <div className="rounded-md border border-green-100 overflow-hidden bg-green-50/10 shadow-sm">
                                            {renderFeedbackTable(completedFeedback)}
                                        </div>
                                    </div>
                                )}

                                {/* Archived Feedback */}
                                {canSeeArchived && archivedFeedback.length > 0 && (
                                    <div className="pt-4 border-t border-dashed">
                                        <button
                                            onClick={() => setShowArchived(!showArchived)}
                                            className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-gray-700 transition-colors px-1"
                                        >
                                            {showArchived ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                            Gearchiveerd ({archivedFeedback.length})
                                        </button>
                                        {showArchived && (
                                            <div className="mt-3 rounded-md border overflow-hidden opacity-75 grayscale-[0.5] hover:grayscale-0 transition-all duration-300">
                                                {renderFeedbackTable(archivedFeedback, true)}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Right Side: Roadmap Timeline (25% width) */}
                <div className="bg-white rounded-xl shadow-sm border min-w-0 flex flex-col overflow-hidden">
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                        </div>
                    ) : (
                        <>
                            <div className="shrink-0 px-6 pt-6 pb-3">
                                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                                    <Rocket className="w-4 h-4 text-blue-600" />
                                    Tijdlijn
                                </h3>
                                <p className="text-xs text-gray-500">Recente updates en planning</p>
                            </div>

                            <div className="flex-1 overflow-y-auto">
                                <div className="relative w-full mx-auto px-2 pb-12">
                                    {/* Vertical Line */}
                                    <div className="absolute left-[24px] top-0 bottom-0 w-0.5 bg-gray-100" />

                                    <div className="relative pl-12 space-y-4">
                                        {/* Upcoming Section */}
                                        {roadmapUpcoming.length > 0 && (
                                            <div className="relative">
                                                <div className="flex mb-3">
                                                    <span className={`${FONT_SIZES.label} font-bold uppercase tracking-[0.2em] text-gray-500 bg-white pr-2`}>
                                                        In Afwachting
                                                    </span>
                                                </div>
                                                <div className="space-y-5">
                                                    {roadmapUpcoming.map((item) => (
                                                        <div key={item.id} className="relative">
                                                            <div className="absolute left-[-30px] top-2.5 -translate-x-1/2 flex items-center justify-center z-10">
                                                                <div className={`w-3 h-3 rounded-full border-2 bg-white flex items-center justify-center ${item.type === 'bug' ? 'border-red-300' : 'border-blue-300'}`}>
                                                                    <div className={`w-1 h-1 rounded-full ${item.type === 'bug' ? 'bg-red-300' : 'bg-blue-300'}`} />
                                                                </div>
                                                            </div>

                                                            <div className="flex flex-col items-start gap-1 opacity-80">
                                                                <Badge variant="outline" className={`h-auto py-1 px-2.5 ${FONT_SIZES.item} font-semibold rounded-lg border shadow-none ${STATUS_COLORS[item.status || 'pending']}`}>
                                                                    {item.roadmap_title}
                                                                    {item.completed_version && <span className={`ml-1.5 opacity-60 ${FONT_SIZES.sub}`}>v{item.completed_version}</span>}
                                                                </Badge>
                                                                <div className={`flex items-center gap-1.5 ${FONT_SIZES.sub} text-gray-400 font-medium px-1`}>
                                                                    <div className="flex items-center gap-1">
                                                                        <Calendar className="w-2.5 h-2.5" />
                                                                        {format(new Date(item.created), 'MMM yy', { locale: nl })}
                                                                    </div>
                                                                    <div className="w-1 h-1 rounded-full bg-gray-200" />
                                                                    <div className="flex items-center gap-1 text-gray-500">
                                                                        {item.type === 'bug' ? <Bug className="w-2.5 h-2.5" /> : item.type === 'feature' ? <Construction className="w-2.5 h-2.5" /> : <MessageSquare className="w-2.5 h-2.5" />}
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
                                        {roadmapCompleted.length > 0 && (
                                            <div className="flex relative z-20">
                                                <span className={`${FONT_SIZES.label} font-bold uppercase tracking-[0.2em] text-green-700 bg-white pr-2`}>
                                                    Geïmplementeerd
                                                </span>
                                            </div>
                                        )}

                                        {/* Completed Items List */}
                                        <div className="space-y-5">
                                            {roadmapCompleted.map((item) => (
                                                <div key={item.id} className="relative">
                                                    <div className="absolute left-[-30px] top-2.5 -translate-x-1/2 flex items-center justify-center z-10">
                                                        <div className={`w-3 h-3 rounded-full border-2 bg-white flex items-center justify-center ${item.type === 'bug' ? 'border-red-300' : 'border-blue-300'}`}>
                                                            <div className={`w-1 h-1 rounded-full ${item.type === 'bug' ? 'bg-red-300' : 'bg-blue-300'}`} />
                                                        </div>
                                                    </div>

                                                    <div className="flex flex-col items-start gap-1 opacity-80">
                                                        <Badge variant="outline" className={`h-auto py-1 px-2.5 ${FONT_SIZES.item} font-semibold rounded-lg border shadow-none ${STATUS_COLORS[item.status || 'pending']}`}>
                                                            <Check className="w-2.5 h-2.5 mr-1" />
                                                            {item.roadmap_title}
                                                            {item.completed_version && <span className={`ml-1.5 opacity-60 ${FONT_SIZES.sub}`}>v{item.completed_version}</span>}
                                                        </Badge>
                                                        <div className={`flex items-center gap-1.5 ${FONT_SIZES.sub} text-gray-400 font-medium px-1`}>
                                                            <div className="flex items-center gap-1">
                                                                <Calendar className="w-2.5 h-2.5" />
                                                                {format(new Date(item.created), 'MMM yy', { locale: nl })}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <FeedbackDialog
                open={isFeedbackOpen}
                onOpenChange={(open) => {
                    setIsFeedbackOpen(open);
                    if (!open) setEditingFeedback(null);
                }}
                feedbackItem={editingFeedback}
            />
            <ConfirmationModal
                open={deleteModalOpen}
                onOpenChange={setDeleteModalOpen}
                onConfirm={confirmDelete}
                title="Feedback verwijderen"
                description="Weet je zeker dat je deze feedback wilt verwijderen?"
                confirmText="Verwijderen"
                variant="destructive"
            />
        </div>
    );
}
