import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Switch } from './ui/switch';
import { useAuth, FeedbackItem, pb } from './AuthContext';
import { toast } from 'sonner';

interface FeedbackDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    feedbackItem?: FeedbackItem | null;
}

export function FeedbackDialog({ open, onOpenChange, feedbackItem }: FeedbackDialogProps) {
    const { sendFeedback, user } = useAuth();
    const [type, setType] = useState('bug');
    const [message, setMessage] = useState('');
    const [selectedOperator, setSelectedOperator] = useState('');
    const [ip, setIp] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [operators, setOperators] = useState<any[]>([]);

    const [status, setStatus] = useState<'pending' | 'planned' | 'in_progress' | 'completed' | 'rejected'>('pending');

    // Roadmap fields
    const [showOnRoadmap, setShowOnRoadmap] = useState(false);
    const [roadmapTitle, setRoadmapTitle] = useState('');
    const [useMessageAsTitle, setUseMessageAsTitle] = useState(true);
    const [completedVersion, setCompletedVersion] = useState('');
    const [completedAt, setCompletedAt] = useState('');

    const isAdmin = user?.role === 'admin';

    // Sync title with message if enabled
    useEffect(() => {
        if (useMessageAsTitle && message) {
            setRoadmapTitle(message);
        }
    }, [message, useMessageAsTitle]);

    useEffect(() => {
        if (open) {
            if (feedbackItem) {
                // Editing mode
                setType(feedbackItem.type);
                setMessage(feedbackItem.message);
                // Find operator if possible, or use name direct if not in list
                // For editing, we might only have the name. 
                // We'll try to find an operator with that name.
                const matchedOp = operators.find(o => o.name === feedbackItem.contact_operator);
                setSelectedOperator(matchedOp?.id || feedbackItem.contact_operator || '');
                // Map old status values to new simplified ones
                const statusMap: Record<string, 'pending' | 'planned' | 'in_progress' | 'completed' | 'rejected'> = {
                    'pending': 'pending', 'planned': 'planned', 'in_progress': 'in_progress',
                    'completed': 'completed', 'rejected': 'rejected',
                    'review': 'planned', 'completed_success': 'completed', 'completed_impossible': 'rejected'
                };
                setStatus(statusMap[feedbackItem.status || 'pending'] || 'pending');
                setShowOnRoadmap(feedbackItem.show_on_roadmap || false);
                setRoadmapTitle(feedbackItem.roadmap_title || feedbackItem.message);
                setUseMessageAsTitle(feedbackItem.use_message_as_title ?? (feedbackItem.roadmap_title === feedbackItem.message || !feedbackItem.roadmap_title));
                setCompletedVersion(feedbackItem.completed_version || '');
                setCompletedAt(feedbackItem.completed_at ? new Date(feedbackItem.completed_at).toISOString().split('T')[0] : '');
            } else {
                // New feedback mode
                setType('bug');
                setMessage('');

                // Pre-set for meestergast (fallback to username if no operator_id linked)
                if (user?.role === 'meestergast') {
                    const initialId = user.operator_id || 'self';
                    const initialName = user.name || user.username || '...';
                    setSelectedOperator(initialId);
                    setOperators([{ id: initialId, name: initialName }]);
                } else {
                    setSelectedOperator('');
                }

                setShowOnRoadmap(false);
                setStatus('pending');
                setRoadmapTitle('');
                setUseMessageAsTitle(true);
                setCompletedVersion('');
                setCompletedAt('');

                fetch('https://api.ipify.org?format=json')
                    .then(res => res.json())
                    .then(data => setIp(data.ip))
                    .catch(err => console.warn('Failed to fetch IP', err));
            }

            // Role-based operator loading
            const loadOperators = async () => {
                try {
                    if (user?.role === 'admin') {
                        // Admin: all internal operators
                        const records = await pb.collection('operatoren').getFullList({
                            filter: 'dienstverband = "Intern"',
                            sort: 'naam'
                        });
                        setOperators(records.map((r: any) => ({ id: r.id, name: r.naam || r.name })));
                    } else if (user?.role === 'meestergast') {
                        // Meestergast: only their linked operator
                        const operatorId = user?.operator_id;
                        if (operatorId) {
                            try {
                                const record = await pb.collection('operatoren').getOne(operatorId);
                                const operatorName = record.naam || record.name;
                                setOperators([{ id: record.id, name: operatorName }]);
                                setSelectedOperator(record.id);
                            } catch (err) {
                                console.warn("Failed to fetch linked operator, falling back to user name", err);
                                const userName = user?.name || user?.username || 'Unknown';
                                setOperators([{ id: 'self', name: userName }]);
                                setSelectedOperator('self');
                            }
                        } else {
                            const userName = user?.name || user?.username || 'Unknown';
                            setOperators([{ id: 'self', name: userName }]);
                            setSelectedOperator('self');
                        }
                    } else if (user?.role === 'press') {
                        // Press: active operators for that press (internal)
                        const pressId = user.press;
                        if (pressId) {
                            const records = await pb.collection('operatoren').getFullList({
                                filter: `dienstverband = "Intern" && (presses ~ "${pressId}")`,
                                sort: 'naam'
                            });
                            setOperators(records.map((r: any) => ({ id: r.id, name: r.naam || r.name })));
                        } else {
                            setOperators([]);
                        }
                    } else {
                        // Other roles: fallback to user identification
                        const userName = user?.name || user?.username || 'Unknown';
                        setOperators([{ id: 'self', name: userName }]);
                        setSelectedOperator('self');
                    }
                } catch (err) {
                    console.error("Failed to fetch operators for feedback", err);
                }
            };
            loadOperators();
        }
    }, [open, feedbackItem, user]);

    const canEdit = !feedbackItem || isAdmin;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !canEdit) return;



        setIsSubmitting(true);
        try {
            if (feedbackItem && isAdmin) {
                // Find operator name for display/logging
                const opName = selectedOperator === 'other' ? 'Other' :
                    operators.find(o => o.id === selectedOperator)?.name || selectedOperator;

                // Update existing feedback
                const updates: any = {
                    type,
                    message,
                    contact_operator: opName,
                    status: status,
                    show_on_roadmap: showOnRoadmap,
                    roadmap_title: roadmapTitle || message,
                    use_message_as_title: useMessageAsTitle,
                    completed_version: completedVersion,
                    completed_at: completedAt ? new Date(completedAt).toISOString() : null
                };

                await pb.collection('feedback').update(feedbackItem.id, updates);
                toast.success('Feedback bijgewerkt!');
            } else {
                // Find operator name
                const opName = selectedOperator === 'other' ? 'Other' :
                    operators.find(o => o.id === selectedOperator)?.name || selectedOperator;

                // Create new feedback
                const context = {
                    url: window.location.href,
                    userAgent: navigator.userAgent,
                    timestamp: new Date().toISOString(),
                    userRole: user?.role,
                    ip: ip || 'Unknown',
                    operator: opName
                };

                const additionalData = isAdmin ? {
                    status: status,
                    show_on_roadmap: showOnRoadmap,
                    roadmap_title: roadmapTitle || message,
                    use_message_as_title: useMessageAsTitle,
                    completed_version: completedVersion,
                    completed_at: completedAt ? new Date(completedAt).toISOString() : null
                } : {};

                await sendFeedback(type, message, context, additionalData);
                toast.success('Feedback sent!');
            }

            setMessage('');
            setSelectedOperator('');
            onOpenChange(false);
        } catch (error) {
            toast.error('Failed to save feedback');
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[80vw] min-w-[600px] max-w-[95vw] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{feedbackItem ? 'Feedback Bewerken' : 'Feedback Versturen'}</DialogTitle>
                    <DialogDescription>
                        {feedbackItem ? 'Pas de feedback gegevens aan.' : 'Gebruik dit formulier om een probleem te melden of een suggestie te doen.'}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="type">Type</Label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger id="type">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="bug">Probleem</SelectItem>
                                <SelectItem value="feature">Functie</SelectItem>
                                <SelectItem value="general">Opmerking</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {/* Contact Person Selector */}
                    <div className="space-y-2">
                        <Label htmlFor="operator">Contactpersoon (Optioneel)</Label>
                        <Select value={selectedOperator} onValueChange={setSelectedOperator} disabled={user?.role !== 'admin' && (user?.role === 'meestergast' || !!selectedOperator)}>
                            <SelectTrigger id="operator">
                                <SelectValue placeholder="Selecteer contactpersoon" />
                            </SelectTrigger>
                            <SelectContent>
                                {(operators || []).filter(op => op.id && op.id.trim() !== '' && op.name && op.name.trim() !== '').map((op) => (
                                    <SelectItem key={op.id} value={op.id}>
                                        {op.name}
                                    </SelectItem>
                                ))}
                                {user?.role === 'admin' && (
                                    <SelectItem value="other">Andere / Niet in lijst</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                            id="message"
                            value={message}
                            onChange={(e) => setMessage(e.target.value)}
                            placeholder="Describe the issue or idea..."
                            required
                            className="resize-none h-32"
                            disabled={!canEdit}
                        />
                    </div>

                    {isAdmin && (
                        <div className="pt-4 border-t space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                                    <SelectTrigger id="status">
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="pending">Nog niet gezien</SelectItem>
                                        <SelectItem value="planned">Gepland</SelectItem>
                                        <SelectItem value="in_progress">Bezig</SelectItem>
                                        <SelectItem value="completed">Uitgevoerd</SelectItem>
                                        <SelectItem value="rejected">Afgekeurd</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="roadmap_toggle">Toon op Roadmap</Label>
                                        <p className="text-[12px] text-muted-foreground">Toon dit item op de publieke roadmap tijdlijn.</p>
                                    </div>
                                    <Switch
                                        id="roadmap_toggle"
                                        checked={showOnRoadmap}
                                        onCheckedChange={setShowOnRoadmap}
                                    />
                                </div>

                                {showOnRoadmap && (
                                    <div className="space-y-4 pt-2 border-t mt-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label htmlFor="use_message_toggle">Bericht als Titel</Label>
                                                <p className="text-[12px] text-muted-foreground">Gebruik het feedback bericht als titel op de roadmap.</p>
                                            </div>
                                            <Switch
                                                id="use_message_toggle"
                                                checked={useMessageAsTitle}
                                                onCheckedChange={setUseMessageAsTitle}
                                            />
                                        </div>

                                        {!useMessageAsTitle && (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-200">
                                                <Label htmlFor="roadmap_title">Roadmap Titel</Label>
                                                <input
                                                    id="roadmap_title"
                                                    value={roadmapTitle}
                                                    onChange={(e) => setRoadmapTitle(e.target.value)}
                                                    placeholder="Korte, duidelijke titel voor op de roadmap..."
                                                    className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {['planned', 'in_progress', 'completed'].includes(status) && (
                                <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                                    <div className="space-y-2">
                                        <Label htmlFor="completed_version">Versie</Label>
                                        <input
                                            id="completed_version"
                                            value={completedVersion}
                                            onChange={(e) => setCompletedVersion(e.target.value)}
                                            placeholder="v0.1.0"
                                            className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="completed_at">Datum</Label>
                                        <input
                                            id="completed_at"
                                            type="date"
                                            value={completedAt}
                                            onChange={(e) => setCompletedAt(e.target.value)}
                                            className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Annuleren</Button>
                        <Button type="submit" disabled={isSubmitting || !message.trim() || !canEdit}>
                            {isSubmitting ? 'Sending...' : feedbackItem ? 'Opslaan' : 'Feedback versturen'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
