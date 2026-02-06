import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
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

    const isAdmin = user?.role === 'admin';

    useEffect(() => {
        if (open) {
            if (feedbackItem) {
                // Editing mode
                setType(feedbackItem.type);
                setMessage(feedbackItem.message);
                setSelectedOperator(feedbackItem.contact_operator || '');
                // Map old status values to new simplified ones
                const statusMap: Record<string, 'pending' | 'planned' | 'in_progress' | 'completed' | 'rejected'> = {
                    'pending': 'pending', 'planned': 'planned', 'in_progress': 'in_progress',
                    'completed': 'completed', 'rejected': 'rejected',
                    'review': 'planned', 'completed_success': 'completed', 'completed_impossible': 'rejected'
                };
                setStatus(statusMap[feedbackItem.status || 'pending'] || 'pending');
                setShowOnRoadmap(feedbackItem.show_on_roadmap || false);
                setRoadmapTitle(feedbackItem.roadmap_title || feedbackItem.message);
            } else {
                // New feedback mode
                setType('bug');
                setMessage('');
                setSelectedOperator('');
                setShowOnRoadmap(false);
                setStatus('pending');
                setRoadmapTitle('');

                fetch('https://api.ipify.org?format=json')
                    .then(res => res.json())
                    .then(data => setIp(data.ip))
                    .catch(err => console.warn('Failed to fetch IP', err));
            }

            // Role-based operator loading
            const loadOperators = async () => {
                try {
                    if (user?.role === 'admin') {
                        // Admin: all operators
                        const records = await pb.collection('operatoren').getFullList({
                            filter: 'intern = true',
                            sort: 'naam'
                        });
                        setOperators(records.map((r: any) => ({ id: r.id, name: r.naam || r.name })));
                    } else if (user?.role === 'press') {
                        // Press: operators from their press, or their linked operator
                        const pressId = user.press;
                        const operatorId = (user as any).operator_id;

                        if (operatorId) {
                            // If user has a linked operator, use that
                            const record = await pb.collection('operatoren').getOne(operatorId);
                            const operatorName = record.naam || record.name;
                            setOperators([{ id: record.id, name: operatorName }]);
                            setSelectedOperator(operatorName);
                        } else if (pressId) {
                            // Otherwise show operators from their press
                            const records = await pb.collection('operatoren').getFullList({
                                filter: `intern = true && pers_ids ~ "${pressId}"`,
                                sort: 'naam'
                            });
                            setOperators(records.map((r: any) => ({ id: r.id, name: r.naam || r.name })));
                        } else {
                            // Link operators to specific press for external users? 
                            // For now, if no pressId, no operators listed
                            setOperators([]);
                        }
                    } else {
                        // Other users: check for linked operator_id first
                        const operatorId = (user as any).operator_id;
                        if (operatorId) {
                            try {
                                const record = await pb.collection('operatoren').getOne(operatorId);
                                const operatorName = record.naam || record.name;
                                setOperators([{ id: record.id, name: operatorName }]);
                                setSelectedOperator(operatorName);
                            } catch {
                                // Fallback to user's display name
                                const userName = user?.name || user?.username || 'Unknown';
                                setOperators([{ id: 'self', name: userName }]);
                                setSelectedOperator(userName);
                            }
                        } else {
                            // Fallback to user's display name
                            const userName = user?.name || user?.username || 'Unknown';
                            setOperators([{ id: 'self', name: userName }]);
                            setSelectedOperator(userName);
                        }
                    }
                } catch (err) {
                    console.error("Failed to fetch operators for feedback", err);
                }
            };
            loadOperators();
        }
    }, [open, feedbackItem, user]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;



        setIsSubmitting(true);
        try {
            if (feedbackItem && isAdmin) {
                // Update existing feedback
                const updates: any = {
                    type,
                    message,
                    contact_operator: selectedOperator,
                    status: status,
                    show_on_roadmap: showOnRoadmap,
                    roadmap_title: roadmapTitle || message
                };

                await pb.collection('feedback').update(feedbackItem.id, updates);
                toast.success('Feedback bijgewerkt!');
            } else {
                // Create new feedback
                const context = {
                    url: window.location.href,
                    userAgent: navigator.userAgent,
                    timestamp: new Date().toISOString(),
                    userRole: user?.role,
                    ip: ip || 'Unknown',
                    operator: selectedOperator
                };

                await sendFeedback(type, message, context);
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
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{feedbackItem ? 'Feedback Bewerken' : 'Feedback Versturen'}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="type">Type</Label>
                        <Select value={type} onValueChange={setType}>
                            <SelectTrigger id="type">
                                <SelectValue placeholder="Select type" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="bug">Bug Report</SelectItem>
                                <SelectItem value="feature">Feature Request</SelectItem>
                                <SelectItem value="general">General Comment</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    {/* Contact Person Selector */}
                    <div className="space-y-2">
                        <Label htmlFor="operator">Contact Operator (Optional)</Label>
                        <Select value={selectedOperator} onValueChange={setSelectedOperator} disabled={user?.role !== 'admin' && user?.role !== 'press'}>
                            <SelectTrigger id="operator">
                                <SelectValue placeholder="Select contact person" />
                            </SelectTrigger>
                            <SelectContent>
                                {(operators || []).filter(op => op.id && op.id.trim() !== '' && op.name && op.name.trim() !== '').map((op) => (
                                    <SelectItem key={op.id} value={op.name}>
                                        {op.name}
                                    </SelectItem>
                                ))}
                                <SelectItem value="other">Other / Not Listed</SelectItem>
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
                        </div>
                    )}
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Sending...' : feedbackItem ? 'Opslaan' : 'Feedback versturen'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
