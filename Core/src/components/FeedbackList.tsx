import { useState, useEffect } from 'react';
import { Loader2, MessageSquare, Trash2, Archive, ChevronDown, ChevronRight, Edit, Plus } from 'lucide-react';
import { useAuth, pb, FeedbackItem } from './AuthContext';
import { Card, CardHeader, CardContent } from './ui/card';
import { PageHeader } from './PageHeader';
import { Button } from './ui/button';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "./ui/table";
import { Badge } from './ui/badge';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { FeedbackDialog } from './FeedbackDialog';

const STATUS_LABELS: Record<string, string> = {
    pending: 'Nog niet gezien',
    planned: 'Gepland',
    in_progress: 'Bezig',
    completed: 'Uitgevoerd',
    rejected: 'Afgekeurd'
};

const STATUS_COLORS: Record<string, string> = {
    pending: 'bg-gray-100 text-gray-600',
    planned: 'bg-blue-100 text-blue-700',
    in_progress: 'bg-orange-100 text-orange-700',
    completed: 'bg-green-100 text-green-700',
    rejected: 'bg-red-100 text-red-700'
};

// --- CONFIGURATION CONSTANTS ---
// EDIT THESE TO CHANGE LAYOUT AND TYPOGRAPHY FROM ONE PLACE
const COL_WIDTHS = {
    status: '200px',
    type: '90px',
    message: '30%',
    comment: '30%',
    user: '140px',
    date: '120px',
    actions: '95px'
};

const FONT_SIZES = {
    title: 'text-xl',        // Card title
    section: 'text-sm',      // Section headers
    body: 'text-sm',         // Table content
    subtext: 'text-xs'       // Dates and extra info
};

export function FeedbackList() {
    const { user, hasPermission } = useAuth();
    const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showArchived, setShowArchived] = useState(false);
    const [isFeedbackOpen, setIsFeedbackOpen] = useState(false);
    const [editingFeedback, setEditingFeedback] = useState<FeedbackItem | null>(null);

    // Editing state
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [commentText, setCommentText] = useState('');

    const canManage = hasPermission('feedback_manage');
    const canSeeArchived = hasPermission('feedback_view');

    // Split feedback into sections
    const activeFeedback = feedback.filter(f => !f.archived && f.status !== 'completed');
    const completedFeedback = feedback.filter(f => !f.archived && f.status === 'completed');
    const archivedFeedback = feedback.filter(f => f.archived);

    useEffect(() => {
        loadFeedback();

        // Subscribe to real-time updates
        pb.collection('feedback').subscribe('*', () => {
            loadFeedback();
        });

        return () => {
            pb.collection('feedback').unsubscribe('*');
        };
    }, [user]);

    const loadFeedback = async () => {
        setLoading(true);
        try {
            const records = await pb.collection('feedback').getFullList<any>({
                sort: '-created'
            });
            setFeedback(records.map(r => {
                // Try context.operator as fallback for older records
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
                    user_agent: r.user_agent,
                    url: r.url,
                    created: r.created,
                    username: r.username,
                    ip: r.ip,
                    contact_operator: operator,
                    status: r.status,
                    admin_comment: r.admin_comment,
                    archived: r.archived === true
                };
            }));
        } catch (e) {
            console.error("Failed to load feedback", e);
            toast.error("Fout bij laden feedback");
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (id: string, newStatus: string) => {
        try {
            setFeedback(prev => prev.map(item =>
                item.id === id ? { ...item, status: newStatus as any } : item
            ));
            await pb.collection('feedback').update(id, { status: newStatus });
            toast.success("Status bijgewerkt");
        } catch (e) {
            toast.error("Fout bij updaten status");
            loadFeedback();
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Weet je zeker dat je deze feedback wilt verwijderen?")) return;

        try {
            setFeedback(prev => prev.filter(item => item.id !== id));
            await pb.collection('feedback').delete(id);
            toast.success("Feedback verwijderd");
        } catch (e) {
            toast.error("Fout bij verwijderen");
            loadFeedback();
        }
    };

    const handleArchive = async (id: string) => {
        try {
            setFeedback(prev => prev.map(item =>
                item.id === id ? { ...item, archived: true } : item
            ));
            await pb.collection('feedback').update(id, { archived: true });
            toast.success("Feedback gearchiveerd");
        } catch (e) {
            toast.error("Fout bij archiveren");
            loadFeedback();
        }
    };

    const startEditingComment = (item: FeedbackItem) => {
        setEditingCommentId(item.id);
        setCommentText(item.admin_comment || '');
    };

    const saveComment = async (id: string) => {
        try {
            setFeedback(prev => prev.map(item =>
                item.id === id ? { ...item, admin_comment: commentText } : item
            ));
            setEditingCommentId(null);
            await pb.collection('feedback').update(id, { admin_comment: commentText });
            toast.success("Reactie opgeslagen");
        } catch (e) {
            toast.error("Fout bij opslaan reactie");
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            if (!dateStr) return '';
            return format(new Date(dateStr), 'dd/MM/yyyy HH:mm');
        } catch (e) {
            return '';
        }
    };

    const renderFeedbackTable = (items: FeedbackItem[], isArchivedTable: boolean = false) => (
        <Table className={`table-fixed ${FONT_SIZES.body}`}>
            <TableHeader className="bg-gray-50">
                <TableRow>
                    <TableHead style={{ width: COL_WIDTHS.status }}>Status</TableHead>
                    <TableHead style={{ width: COL_WIDTHS.type }}>Type</TableHead>
                    <TableHead style={{ width: COL_WIDTHS.message }}>Bericht</TableHead>
                    <TableHead style={{ width: COL_WIDTHS.comment }}>{canManage ? 'Opmerking Beheer' : 'Reactie'}</TableHead>
                    <TableHead style={{ width: COL_WIDTHS.user }}>Contact</TableHead>
                    <TableHead style={{ width: COL_WIDTHS.date }} className="text-right">Datum</TableHead>
                    {canManage && <TableHead style={{ width: COL_WIDTHS.actions }} className="text-right">Acties</TableHead>}
                </TableRow>
            </TableHeader>
            <TableBody>
                {items.map((item) => (
                    <TableRow key={item.id} className={`hover:bg-gray-50/50 ${isArchivedTable ? 'opacity-60' : ''}`}>
                        <TableCell>
                            {canManage && !isArchivedTable ? (
                                <Select
                                    value={item.status || 'pending'}
                                    onValueChange={(val) => handleStatusChange(item.id, val)}
                                >
                                    <SelectTrigger className={`h-8 w-[140px] border-0 text-xs font-medium ${STATUS_COLORS[item.status || 'pending']}`}>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {Object.entries(STATUS_LABELS).map(([key, label]) => (
                                            <SelectItem key={key} value={key}>
                                                <span className="flex items-center gap-2">
                                                    <div className={`w-2 h-2 rounded-full ${STATUS_COLORS[key].split(' ')[0]}`} />
                                                    {label}
                                                </span>
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            ) : (
                                <Badge variant="outline" className={`font-normal whitespace-nowrap border-0 ${STATUS_COLORS[item.status || 'pending']}`}>
                                    {STATUS_LABELS[item.status || 'pending']}
                                </Badge>
                            )}
                        </TableCell>
                        <TableCell>
                            <Badge variant={item.type === 'bug' ? 'destructive' : 'secondary'} className="capitalize">
                                {item.type}
                            </Badge>
                        </TableCell>
                        <TableCell className="align-top py-4">
                            <div className={`font-medium ${FONT_SIZES.body} whitespace-pre-wrap`}>{item.message}</div>
                            {item.url && canManage && (
                                <div className={`${FONT_SIZES.subtext} text-gray-400 mt-1 truncate max-w-[300px]`} title={item.url}>
                                    Op: {item.url}
                                </div>
                            )}
                        </TableCell>
                        <TableCell className="align-top py-4">
                            {canManage && !isArchivedTable ? (
                                editingCommentId === item.id ? (
                                    <div className="space-y-2">
                                        <Textarea
                                            value={commentText}
                                            onChange={(e) => setCommentText(e.target.value)}
                                            className="text-xs min-h-[60px]"
                                            placeholder="Schrijf een interne opmerking of reactie..."
                                            autoFocus
                                        />
                                        <div className="flex gap-2 justify-end">
                                            <Button size="sm" variant="ghost" onClick={() => setEditingCommentId(null)} className="h-6 text-xs">Annuleren</Button>
                                            <Button size="sm" onClick={() => saveComment(item.id)} className="h-6 text-xs">Opslaan</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        onClick={() => startEditingComment(item)}
                                        className={`${FONT_SIZES.body} text-gray-500 cursor-pointer hover:text-gray-900 min-h-[1.5em] border border-transparent hover:border-dashed hover:border-gray-300 rounded px-1 -ml-1`}
                                    >
                                        {item.admin_comment || <span className="text-gray-300 italic text-xs">Klik om opmerking toe te voegen...</span>}
                                    </div>
                                )
                            ) : (
                                <div className={`${FONT_SIZES.body} text-gray-600`}>
                                    {item.admin_comment || '-'}
                                </div>
                            )}
                        </TableCell>
                        <TableCell>
                            <div className="flex flex-col">

                                {item.contact_operator && (
                                    <span className={`${FONT_SIZES.text} text-blue-600`}>{item.contact_operator}</span>
                                )}
                                {canManage && item.ip && <span className="text-[10px] text-gray-400">{item.ip}</span>}
                            </div>
                        </TableCell>
                        <TableCell className={`text-right ${FONT_SIZES.subtext} text-gray-500 whitespace-nowrap`}>
                            {formatDate(item.created)}
                        </TableCell>
                        {canManage && (
                            <TableCell className="text-right">
                                <div className="flex gap-1 justify-end">
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0 hover:bg-blue-100"
                                        onClick={() => {
                                            setEditingFeedback(item);
                                            setIsFeedbackOpen(true);
                                        }}
                                        title="Bewerken"
                                    >
                                        <Edit className="w-4 h-4 text-blue-500" />
                                    </Button>
                                    {!isArchivedTable && (
                                        <Button
                                            size="sm"
                                            variant="ghost"
                                            className="h-7 w-7 p-0 hover:bg-orange-100"
                                            onClick={() => handleArchive(item.id)}
                                            title="Archiveren"
                                        >
                                            <Archive className="w-4 h-4 text-orange-500" />
                                        </Button>
                                    )}
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0 hover:bg-red-100"
                                        onClick={() => handleDelete(item.id)}
                                        title="Verwijderen"
                                    >
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
        <Card className="w-full shadow-sm bg-white overflow-hidden">
            <CardHeader>
                <PageHeader
                    title={canManage ? 'Feedback Beheer' : 'Feedback Overzicht'}
                    icon={MessageSquare}
                    actions={
                        <Button
                            onClick={() => setIsFeedbackOpen(true)}
                            className="gap-2"
                        >
                            <Plus className="w-4 h-4" /> Feedback
                        </Button>
                    }
                    className="mb-2"
                />
            </CardHeader>
            <CardContent className="space-y-6">
                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                ) : activeFeedback.length === 0 && archivedFeedback.length === 0 ? (
                    <div className="text-center py-12 bg-gray-50/30 rounded-lg border border-dashed flex flex-col items-center gap-4">
                        <div className="p-4 bg-white rounded-full shadow-sm border">
                            <MessageSquare className="w-8 h-8 text-gray-300" />
                        </div>
                        <div className="text-gray-500 font-medium">Nog geen feedback gevonden</div>
                        <p className="text-sm text-gray-400 max-w-xs">
                            Heb je een suggestie, bug of opmerking? Laat het ons weten.
                        </p>
                        <Button
                            onClick={() => setIsFeedbackOpen(true)}
                            className="mt-2 gap-2"
                        >
                            <Plus className="w-4 h-4" /> Feedback versturen
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-8">
                        {/* Active Feedback */}
                        {activeFeedback.length > 0 && (
                            <div className="space-y-3">
                                <h3 className={`${FONT_SIZES.section} font-semibold text-gray-900 flex items-center gap-2 px-1`}>
                                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                                    Openstaande Feedback ({activeFeedback.length})
                                </h3>
                                <div className="rounded-md border overflow-hidden bg-white shadow-sm">
                                    {renderFeedbackTable(activeFeedback)}
                                </div>
                            </div>
                        )}

                        {/* Completed Feedback */}
                        {completedFeedback.length > 0 && (
                            <div className="space-y-3">
                                <h3 className={`${FONT_SIZES.section} font-semibold text-green-700 flex items-center gap-2 px-1`}>
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
                                    className={`flex items-center gap-2 ${FONT_SIZES.section} font-medium text-gray-500 hover:text-gray-700 transition-colors px-1`}
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
                    </div>
                )}
            </CardContent>
            <FeedbackDialog
                open={isFeedbackOpen}
                onOpenChange={(open) => {
                    setIsFeedbackOpen(open);
                    if (!open) setEditingFeedback(null);
                }}
                feedbackItem={editingFeedback}
            />
        </Card>
    );
}
