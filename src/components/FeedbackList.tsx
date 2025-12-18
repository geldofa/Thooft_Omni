import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
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
import { CheckCircle2, Circle, Loader2, MessageSquare } from 'lucide-react';
import { toast } from 'sonner';

interface FeedbackItem {
    id: string;
    type: 'bug' | 'feature' | 'other';
    message: string;
    user_agent?: string;
    url?: string;
    created: string;
    username?: string;
    ip?: string;
    contact_operator?: string;
    status?: string; // Add status
}

export function FeedbackList() {
    const { fetchFeedback, resolveFeedback, user } = useAuth();
    const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
    const [loading, setLoading] = useState(true);

    const handleResolve = async (id: string) => {
        if (!resolveFeedback) return;
        try {
            await resolveFeedback(id);
            toast.success("Feedback gemarkeerd als opgelost");
            loadFeedback(); // Reload list
        } catch (e) {
            toast.error("Failed to update status");
        }
    };

    useEffect(() => {
        loadFeedback();
    }, []);

    const loadFeedback = async () => {
        if (!fetchFeedback) return;
        setLoading(true);
        try {
            const data = await fetchFeedback();
            // DEBUG: Alert to confirm data reception
            if (data.length > 0) {
                // alert(`DEBUG: Received ${data.length} feedback items`);
            } else {
                // alert("DEBUG: Received 0 feedback items");
            }
            setFeedback(data);
        } catch (e) {
            console.error("Failed to load feedback", e);
            toast.error("Failed to load feedback");
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (dateStr: string) => {
        try {
            if (!dateStr) return 'Onbekende datum';
            return format(new Date(dateStr), 'PP p');
        } catch (e) {
            return 'Ongeldige datum';
        }
    };

    if (!user || (user.role !== 'admin' && user.role !== 'meestergast')) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-gray-500">
                <MessageSquare className="w-12 h-12 mb-4 opacity-20" />
                <p>Toegang Beperkt</p>
            </div>
        );
    }

    return (
        <Card className="w-full shadow-sm bg-white">
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                    <MessageSquare className="w-5 h-5 text-gray-500" />
                    Feedback Postvak
                </CardTitle>
            </CardHeader>
            <CardContent>
                {loading ? (
                    <div className="flex justify-center p-8">
                        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
                    </div>
                ) : feedback.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                        Nog geen feedback ontvangen.
                    </div>
                ) : (
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[50px]"></TableHead> {/* Checkbox column */}
                                    <TableHead>Type</TableHead>
                                    <TableHead className="w-[400px]">Bericht</TableHead>
                                    <TableHead>Gebruiker</TableHead>
                                    <TableHead className="text-right">Datum</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {feedback.map((item) => (
                                    <TableRow key={item.id} className={item.status === 'closed' ? 'bg-gray-50 opacity-60' : ''}>
                                        <TableCell>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="p-0 hover:bg-transparent"
                                                onClick={() => handleResolve(item.id)}
                                                disabled={item.status === 'closed'}
                                            >
                                                {item.status === 'closed' ? (
                                                    <CheckCircle2 className="w-5 h-5 text-green-500" />
                                                ) : (
                                                    <Circle className="w-5 h-5 text-gray-300 hover:text-green-500" />
                                                )}
                                            </Button>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={item.type === 'bug' ? 'destructive' : 'secondary'}>
                                                {item.type}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {item.message}
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-500">
                                            <div className="font-medium text-gray-900">{item.username || 'Anoniem'}</div>
                                            {item.contact_operator && (
                                                <div className="text-xs text-blue-600">Contact: {item.contact_operator}</div>
                                            )}
                                            <div className="text-xs opacity-70 truncate max-w-[200px]" title={item.url}>
                                                {item.ip ? `IP: ${item.ip}` : item.url}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right text-sm text-gray-500 whitespace-nowrap">
                                            {formatDate(item.created)}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
