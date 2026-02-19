import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Download, Rocket, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
import { useAuth } from './AuthContext';
import { APP_VERSION } from '../config';
import { toast } from 'sonner';

export function UpdateDialog() {
    const {
        showUpdateDialog,
        setShowUpdateDialog,
        latestVersion,
        performUpdate,
        isUpdating,
        setIsUpdating
    } = useAuth();
    const [success, setSuccess] = useState(false);

    const handleUpdate = async () => {
        setIsUpdating(true);
        try {
            const result = await performUpdate();
            if (result.success) {
                setSuccess(true);
                toast.success("Systeem succesvol bijgewerkt!");
                setTimeout(() => {
                    window.location.reload();
                }, 3000);
            } else {
                toast.error(`Update mislukt: ${result.message}`);
                setIsUpdating(false);
            }
        } catch (err) {
            toast.error("Er is een onverwachte fout opgetreden tijdens de update.");
            setIsUpdating(false);
        }
    };

    return (
        <Dialog open={showUpdateDialog} onOpenChange={(open) => !isUpdating && setShowUpdateDialog(open)}>
            <DialogContent className="sm:max-w-[450px] overflow-hidden p-0 border-none shadow-2xl" onPointerDownOutside={(e) => isUpdating && e.preventDefault()} onEscapeKeyDown={(e) => isUpdating && e.preventDefault()}>
                {/* Decorative Header Background */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-br from-blue-600 to-indigo-700 -z-10" />

                <div className="px-6 pt-10 pb-6">
                    <DialogHeader className="space-y-4">
                        <div className="mx-auto w-16 h-16 bg-white/20 backdrop-blur-md rounded-2xl flex items-center justify-center shadow-xl border border-white/30 ring-4 ring-white/10 animate-pulse">
                            {success ? (
                                <CheckCircle2 className="w-8 h-8 text-white" />
                            ) : isUpdating ? (
                                <Loader2 className="w-8 h-8 text-white animate-spin" />
                            ) : (
                                <Rocket className="w-8 h-8 text-white" />
                            )}
                        </div>

                        <DialogTitle className="text-center text-2xl font-black text-white tracking-tight">
                            {success ? 'Update Geslaagd!' : isUpdating ? 'Bezig met Updaten...' : 'Nieuwe Ervaring Beschikbaar'}
                        </DialogTitle>

                        <DialogDescription className="text-center text-blue-100 font-medium px-4">
                            {success
                                ? 'Omni is succesvol bijgewerkt. De pagina wordt over enkele seconden herladen.'
                                : isUpdating
                                    ? 'Systeem is bezig met het ophalen van de nieuwste wijzigingen. Even geduld alstublieft...'
                                    : `Er is een nieuwe versie van Omni beschikbaar (${latestVersion}). Wil je deze nu installeren?`}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Version Info Section */}
                    {!isUpdating && !success && (
                        <div className="mt-8 grid grid-cols-2 gap-4">
                            <div className="bg-slate-50 border border-slate-100 p-4 rounded-xl text-center">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Huidig</span>
                                <span className="text-sm font-black text-slate-600 tracking-tighter">{APP_VERSION}</span>
                            </div>
                            <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl text-center relative overflow-hidden group">
                                <Sparkles className="absolute -top-1 -right-1 w-8 h-8 text-blue-200/50 rotate-12 group-hover:scale-125 transition-transform" />
                                <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest block mb-1">Nieuw</span>
                                <span className="text-sm font-black text-blue-600 tracking-tighter">{latestVersion}</span>
                            </div>
                        </div>
                    )}

                    {/* Progress Section */}
                    {(isUpdating || success) && (
                        <div className="mt-8 space-y-4">
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className={`h-full bg-blue-600 transition-all duration-[3000ms] ease-out ${success ? 'w-full' : 'w-2/3 animate-pulse'}`}
                                />
                            </div>
                            <div className="flex items-center justify-center gap-2 text-xs font-bold text-slate-400 animate-pulse">
                                <Loader2 className="w-3 h-3 animate-spin" />
                                SERVER BIJWERKEN...
                            </div>
                        </div>
                    )}
                </div>

                <DialogFooter className="bg-slate-50/80 p-6 flex-col sm:flex-row gap-2 border-t border-slate-100">
                    {!success && !isUpdating ? (
                        <>
                            <Button
                                variant="ghost"
                                onClick={() => setShowUpdateDialog(false)}
                                className="w-full sm:w-auto font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-200"
                            >
                                Misschien later
                            </Button>
                            <Button
                                onClick={handleUpdate}
                                disabled={isUpdating}
                                className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700 text-white font-black shadow-lg shadow-blue-200 py-6 text-base group"
                            >
                                <Download className="w-5 h-5 mr-2 group-hover:translate-y-0.5 transition-transform" />
                                Update Nu Installeren
                            </Button>
                        </>
                    ) : success ? (
                        <div className="w-full py-2 text-center text-xs font-black text-green-600 tracking-widest flex items-center justify-center gap-2">
                            <CheckCircle2 className="w-4 h-4" />
                            HERSTARTEN IN 3... 2... 1...
                        </div>
                    ) : null}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
