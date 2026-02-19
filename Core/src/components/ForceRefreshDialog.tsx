import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { RefreshCw, AlertTriangle, GitCommit, Rocket } from 'lucide-react';
import { useAuth } from './AuthContext';

export function ForceRefreshDialog() {
    const { refreshTriggeredAt, recentCommits, fetchRecentCommits } = useAuth();
    const [open, setOpen] = useState(false);
    const [lastTrigger, setLastTrigger] = useState<string | null>(null);

    useEffect(() => {
        console.log("[ForceRefresh] Checking trigger:", refreshTriggeredAt, "Last:", lastTrigger);
        // Only show if the trigger is NEW since the session started
        // and if it's not the same trigger we already reacted to
        if (refreshTriggeredAt && refreshTriggeredAt !== lastTrigger) {
            const triggerTime = new Date(refreshTriggeredAt).getTime();
            const sessionStartTime = performance.timing.navigationStart;

            console.log("[ForceRefresh] Trigger time:", triggerTime, "Session start:", sessionStartTime, "Diff:", triggerTime - sessionStartTime);

            // Only show if trigger happened AFTER the page was loaded
            // We give it a small buffer of 5 seconds
            if (triggerTime > (sessionStartTime + 5000)) {
                console.log("[ForceRefresh] Trigger accepted - showing dialog");
                setOpen(true);
                setLastTrigger(refreshTriggeredAt);
                // Fetch recent commits when showing the dialog
                fetchRecentCommits();
            } else {
                console.log("[ForceRefresh] Trigger ignored - too old");
            }
        }
    }, [refreshTriggeredAt, lastTrigger, fetchRecentCommits]);

    const handleRefresh = () => {
        window.location.reload();
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="w-[50vw] max-w-[50vw] border-orange-200" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
                <DialogHeader>
                    <div className="mx-auto w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle className="w-6 h-6 text-orange-600" />
                    </div>
                    <DialogTitle className="text-center text-xl text-orange-900">Nieuwe Update Beschikbaar</DialogTitle>
                    <DialogDescription className="text-center pt-2 text-gray-600">
                        Er is een essentiële update of systeemwijziging doorgevoerd. Om door te gaan dient u de pagina te verversen.
                    </DialogDescription>
                </DialogHeader>

                {recentCommits && recentCommits.length > 0 && (
                    <div className="my-2 space-y-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">
                            <Rocket className="w-3 h-3 text-blue-500" />
                            Recente Wijzigingen
                        </div>
                        <div className="bg-slate-50 border border-slate-100 rounded-lg overflow-hidden max-h-[40vh] overflow-y-auto">
                            {recentCommits.map((commit, idx) => {
                                const [title, ...bodyLines] = commit.split('\n');
                                return (
                                    <div
                                        key={idx}
                                        className="px-3 py-2 text-sm text-slate-600 border-b border-slate-100 last:border-0 flex items-start gap-3 hover:bg-white transition-colors"
                                    >
                                        <GitCommit className="w-4 h-4 text-slate-400 mt-1 shrink-0" />
                                        <div className="flex flex-col">
                                            <span className="font-bold text-slate-800">{title}</span>
                                            {bodyLines.length > 0 && (
                                                <span className="text-xs text-slate-500 whitespace-pre-wrap mt-1">
                                                    {bodyLines.join('\n').trim()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="py-4 text-sm text-gray-500 bg-orange-50/50 p-4 rounded-lg border border-orange-100 italic">
                    Niet-opgeslagen wijzigingen kunnen verloren gaan bij het verversen.
                </div>
                <DialogFooter className="sm:justify-center gap-2">
                    <Button
                        onClick={handleRefresh}
                        className="bg-orange-600 hover:bg-orange-700 text-white w-full sm:w-auto px-8"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Refresh Nu
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
