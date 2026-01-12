import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface FeedbackDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function FeedbackDialog({ open, onOpenChange }: FeedbackDialogProps) {
    const { sendFeedback, user, operators } = useAuth();
    const [type, setType] = useState('bug');
    const [message, setMessage] = useState('');
    const [selectedOperator, setSelectedOperator] = useState('');
    const [ip, setIp] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (open) {
            fetch('https://api.ipify.org?format=json')
                .then(res => res.json())
                .then(data => setIp(data.ip))
                .catch(err => console.warn('Failed to fetch IP', err));
        }
    }, [open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim()) return;

        if (!selectedOperator) {
            toast.error('Please select a contact operator');
            return;
        }

        setIsSubmitting(true);
        try {
            const context = {
                url: window.location.href, // This might be redundant if we have IP, but useful for page context
                userAgent: navigator.userAgent,
                timestamp: new Date().toISOString(),
                userRole: user?.role,
                ip: ip || 'Unknown',
                operator: selectedOperator
            };

            await sendFeedback(type, message, context);
            toast.success('Feedback sent!');
            setMessage('');
            setSelectedOperator('');
            onOpenChange(false);
        } catch (error) {
            toast.error('Failed to send feedback');
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Send Feedback</DialogTitle>
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
                        <Select value={selectedOperator} onValueChange={setSelectedOperator}>
                            <SelectTrigger id="operator">
                                <SelectValue placeholder="Select contact person" />
                            </SelectTrigger>
                            <SelectContent>
                                {operators.map((op) => (
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
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                        <Button type="submit" disabled={isSubmitting}>
                            {isSubmitting ? 'Sending...' : 'Send Feedback'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
