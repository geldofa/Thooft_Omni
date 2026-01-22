import React, { useState } from 'react';
import { pb, useAuth } from './AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card } from './ui/card';
import { Rocket, ShieldCheck, Database, CheckCircle2, ArrowRight, UserPlus, FileUp } from 'lucide-react';
import { toast } from 'sonner';
import { ImportTool } from './ImportTool';
import { TooltipProvider } from './ui/tooltip';

interface OnboardingWizardProps {
    onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
    const [step, setStep] = useState<'welcome' | 'admin' | 'data' | 'finish'>('welcome');
    const [adminData, setAdminData] = useState({
        username: '',
        email: '',
        password: '',
        passwordConfirm: '',
        name: ''
    });
    const [isCreatingAdmin, setIsCreatingAdmin] = useState(false);

    // Setup animation state
    const [setupState, setSetupState] = useState<'idle' | 'running' | 'complete'>('idle');
    const [setupMessage, setSetupMessage] = useState('');
    const [setupProgress, setSetupProgress] = useState(0);

    // Run setup animation when entering 'finish' step
    React.useEffect(() => {
        if (step === 'finish' && setupState === 'idle') {
            setSetupState('running');
            const messages = [
                { msg: 'System configuratie starten...', progress: 10, delay: 0 },
                { msg: 'Database structuur initialiseren...', progress: 35, delay: 1000 },
                { msg: 'Beveiligingsinstellingen toepassen...', progress: 60, delay: 2500 },
                { msg: 'Gebruikersomgeving optimaliseren...', progress: 85, delay: 3800 },
                { msg: 'Afronden...', progress: 100, delay: 4800 }
            ];

            let timeoutIds: NodeJS.Timeout[] = [];

            messages.forEach(({ msg, progress, delay }) => {
                const id = setTimeout(() => {
                    setSetupMessage(msg);
                    setSetupProgress(progress);
                }, delay);
                timeoutIds.push(id);
            });

            const completeId = setTimeout(() => {
                setSetupState('complete');
            }, 5500);
            timeoutIds.push(completeId);

            return () => timeoutIds.forEach(clearTimeout);
        }
    }, [step, setupState]);

    const handleCreateAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (adminData.password !== adminData.passwordConfirm) {
            toast.error('Wachtwoorden komen niet overeen');
            return;
        }

        if (adminData.password.length < 8) {
            toast.error('Wachtwoord moet minimaal 8 tekens bevatten');
            return;
        }

        setIsCreatingAdmin(true);
        try {
            await pb.collection('users').create({
                username: adminData.username,
                email: adminData.email,
                password: adminData.password,
                passwordConfirm: adminData.passwordConfirm,
                name: adminData.name,
                role: 'Admin',
                active: true,
                plain_password: adminData.password // Store for Quick Login in testing
            });

            toast.success('Admin account succesvol aangemaakt!');
            setStep('data');
        } catch (err: any) {
            console.error('Admin creation failed:', err);

            const validationErrors = err?.data?.data || err?.data;

            if (validationErrors?.username) {
                toast.error('Deze gebruikersnaam is al in gebruik. Kies een andere naam.');
            } else if (validationErrors?.email) {
                toast.error('Dit e-mailadres is al in gebruik. Gebruik een ander adres.');
            } else if (validationErrors?.password) {
                toast.error(`Wachtwoord fout: ${validationErrors.password.message}`);
            } else {
                toast.error(err.message || 'Kon account niet aanmaken. Probeer het opnieuw.');
            }
        } finally {
            setIsCreatingAdmin(false);
        }
    };

    const { setOnboardingDismissed } = useAuth();
    const handleFinish = () => {
        // Clear any redirects and complete
        localStorage.removeItem('onboarding_redirect');
        setOnboardingDismissed(true);
        onComplete();
    };

    const handleImportComplete = () => {
        setStep('finish');
    };

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 overflow-hidden" style={{ minHeight: '100vh', maxHeight: '100vh' }}>
                {/* Main Outer Container - Max Width 6xl for horizontal feel */}
                <div className="flex flex-row gap-6 w-full items-stretch h-[720px] max-h-[90vh]" style={{ display: 'flex', flexDirection: 'row' }}>

                    {/* 1. BRANDING CARD (LEFT) - 33% Split */}
                    <div className="flex-[0_0_33%] bg-[#2563eb] rounded-[3rem] p-12 text-white flex flex-col justify-between shadow-2xl shadow-blue-200 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full -mr-40 -mt-40 backdrop-blur-3xl" />
                        <div className="absolute bottom-0 left-0 w-64 h-64 bg-white/5 rounded-full -ml-32 -mb-32 backdrop-blur-2xl" />

                        <div
                            className="w-auto aspect-square self-center flex items-center justify-center p-8 bg-white/10 backdrop-blur-md rounded-[2.5rem] mb-10 ring-1 ring-white/20 shadow-2xl relative z-10"
                            style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
                        >
                            <Rocket className="w-16 h-16 text-white" />
                        </div>

                        <div className="text-center relative z-10">
                            <h1
                                className="text-5xl font-black tracking-tighter italic mb-6"
                                style={{ lineHeight: '1.1', textShadow: '0 4px 12px rgba(0,0,0,0.1)', fontWeight: 900 }}
                            >
                                T&apos;HOOFT<br />OMNI
                            </h1>
                            <div className="h-1.5 w-16 bg-white/40 rounded-full mx-auto" />
                            <p className="mt-8 text-blue-100 font-medium text-lg max-w-[220px] mx-auto opacity-80 leading-snug">
                                Next-generation Maintenance OS
                            </p>
                        </div>

                        <div className="mt-auto relative z-10 pt-12">
                            <span className="text-[10px] font-bold text-blue-200/50 tracking-[0.3em] uppercase">Powered by T&apos;Hooft Engineering</span>
                        </div>
                    </div>

                    {/* RIGHT CONTENT CARD - 66% split */}
                    <Card
                        className="w-[67%] rounded-[3rem] shadow-[0_45px_90px_-25px_rgba(0,0,0,0.15)] border-none bg-white flex flex-col relative overflow-hidden"
                        style={{ flex: '1 1 0%', borderRadius: '3rem' }}
                    >
                        {/* PROGRESS INDICATOR - Hide during setup animation */}
                        {!(step === 'finish' && setupState !== 'complete') && (
                            <div className="flex px-16 pt-12 gap-3">
                                <div className={`h-2 flex-1 rounded-full transition-all duration-500`} style={{ backgroundColor: step === 'welcome' ? '#2563eb' : '#f1f5f9' }} />
                                <div className={`h-2 flex-1 rounded-full transition-all duration-500`} style={{ backgroundColor: step === 'admin' ? '#2563eb' : '#f1f5f9' }} />
                                <div className={`h-2 flex-1 rounded-full transition-all duration-500`} style={{ backgroundColor: step === 'data' ? '#2563eb' : '#f1f5f9' }} />
                                <div className={`h-2 flex-1 rounded-full transition-all duration-500`} style={{ backgroundColor: step === 'finish' ? '#16a34a' : '#f1f5f9' }} />
                            </div>
                        )}

                        <div className="flex-1 p-10 flex flex-col justify-center overflow-y-auto custom-scrollbar">
                            {step === 'welcome' && (
                                <div className="animate-in fade-in slide-in-from-right duration-500 w-full max-w-2xl mx-auto">
                                    <h2 className="text-5xl font-black text-slate-900 mb-8 tracking-tight">Klaar voor de start?</h2>
                                    <p className="text-2xl text-slate-500 leading-relaxed mb-12">
                                        Laten we uw nieuwe systeem instellen.
                                    </p>

                                    <div className="grid grid-cols-2 gap-6 mb-16">
                                        <div className="flex flex-col p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:bg-slate-100/50 transition-colors">
                                            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6" style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}>
                                                <ShieldCheck className="w-8 h-8" />
                                            </div>
                                            <div className="font-bold text-slate-900 text-lg mb-2">Admin Account</div>
                                            <div className="text-sm text-slate-500 leading-relaxed">Beveilig uw toegang met uw eerste beheerderprofiel.</div>
                                        </div>
                                        <div className="flex flex-col p-6 bg-slate-50 rounded-[2.5rem] border border-slate-100 hover:bg-slate-100/50 transition-colors">
                                            <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 mb-6" style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}>
                                                <Database className="w-8 h-8" />
                                            </div>
                                            <div className="font-bold text-slate-900 text-lg mb-2">Data Import</div>
                                            <div className="text-sm text-slate-500 leading-relaxed">Zet bestaande data direct over naar het systeem.</div>
                                        </div>
                                    </div>

                                    <Button
                                        onClick={() => setStep('admin')}
                                        className="bg-blue-600 hover:bg-blue-700 text-white w-full h-20 text-2xl font-black rounded-[2rem] gap-4 shadow-2xl shadow-blue-200 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                        style={{ backgroundColor: '#2563eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                    >
                                        Start Configuratie <ArrowRight className="w-8 h-8" />
                                    </Button>
                                </div>
                            )}

                            {step === 'admin' && (
                                <div className="animate-in fade-in slide-in-from-right duration-500 w-full max-w-2xl mx-auto">
                                    <div className="flex items-center gap-6 mb-8">
                                        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600" style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}>
                                            <UserPlus className="w-8 h-8" />
                                        </div>
                                        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Beheerder Account</h2>
                                    </div>
                                    <p className="text-xl text-slate-500 mb-10">Uw eerste account wordt automatisch een administrator.</p>

                                    <form onSubmit={handleCreateAdmin} className="space-y-6">
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="name" className="text-slate-600 ml-2 font-bold">Volledige Naam</Label>
                                                <Input id="name" required value={adminData.name} onChange={e => setAdminData({ ...adminData, name: e.target.value })} placeholder="Bart T'Hooft" className="h-14 rounded-2xl bg-slate-50 border-slate-100 px-6 text-lg" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="username" className="text-slate-600 ml-2 font-bold">Gebruikersnaam</Label>
                                                <Input id="username" required value={adminData.username} onChange={e => setAdminData({ ...adminData, username: e.target.value })} placeholder="admin" className="h-14 rounded-2xl bg-slate-50 border-slate-100 px-6 text-lg" />
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="email" className="text-slate-600 ml-2 font-bold">Email Adres</Label>
                                            <Input id="email" type="email" required value={adminData.email} onChange={e => setAdminData({ ...adminData, email: e.target.value })} placeholder="info@thooft.be" className="h-14 rounded-2xl bg-slate-50 border-slate-100 px-6 text-lg" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-6">
                                            <div className="space-y-2">
                                                <Label htmlFor="password" className="text-slate-600 ml-2 font-bold">Wachtwoord</Label>
                                                <Input id="password" type="password" required value={adminData.password} onChange={e => setAdminData({ ...adminData, password: e.target.value })} className="h-14 rounded-2xl bg-slate-50 border-slate-100 px-6 text-lg" />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="passwordConfirm" className="text-slate-600 ml-2 font-bold">Bevestig Wachtwoord</Label>
                                                <Input id="passwordConfirm" type="password" required value={adminData.passwordConfirm} onChange={e => setAdminData({ ...adminData, passwordConfirm: e.target.value })} className="h-14 rounded-2xl bg-slate-50 border-slate-100 px-6 text-lg" />
                                            </div>
                                        </div>
                                        <div className="pt-8 flex justify-between gap-6">
                                            <Button type="button" variant="ghost" className="rounded-2xl h-14 px-10 text-lg font-bold" onClick={() => setStep('welcome')}>Terug</Button>
                                            <Button type="submit" disabled={isCreatingAdmin} className="bg-blue-600 hover:bg-blue-700 text-white rounded-[1.5rem] h-14 px-12 text-lg font-black shadow-xl shadow-blue-100 grow transition-all active:scale-95" style={{ backgroundColor: '#2563eb', color: 'white' }}>
                                                {isCreatingAdmin ? 'Verwerken...' : 'Account Aanmaken'}
                                            </Button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {step === 'data' && (
                                <div className="animate-in fade-in slide-in-from-right duration-500 w-full h-full flex flex-col">
                                    <div className="flex items-center gap-6 mb-4">
                                        <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shadow-sm" style={{ backgroundColor: '#dbeafe', color: '#2563eb' }}>
                                            <FileUp className="w-8 h-8" />
                                        </div>
                                        <div>
                                            <h2 className="text-4xl font-black text-slate-900 tracking-tight">Data importeren?</h2>
                                            <p className="text-slate-500 text-lg">Sleep uw CSV-bestanden hieronder.</p>
                                        </div>
                                    </div>

                                    {/* Updated Import Tool Container - Direct integration */}
                                    <div className="flex-1 bg-slate-50 rounded-[2rem] border border-slate-100 overflow-hidden relative shadow-inner">
                                        <div className="absolute inset-0 overflow-y-auto p-4 custom-scrollbar">
                                            <ImportTool onComplete={handleImportComplete} minimal={true} />
                                        </div>
                                    </div>

                                    <div className="mt-6 flex justify-between items-center text-sm border-t border-slate-50 pt-6">
                                        <Button variant="ghost" onClick={() => setStep('admin')} className="rounded-2xl h-12 px-8 font-bold text-lg">Terug</Button>
                                        <Button
                                            variant="ghost"
                                            onClick={() => {
                                                setOnboardingDismissed(true);
                                                onComplete();
                                            }}
                                            className="text-slate-400 hover:text-slate-600 font-bold uppercase tracking-widest text-xs flex items-center gap-2 hover:bg-slate-50 px-6 py-4 rounded-xl transition-all"
                                        >
                                            Overslaan <ArrowRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {step === 'finish' && (
                                <div className="w-full h-full flex flex-col justify-center items-center">
                                    {/* LOADING STATE - 5 second animation */}
                                    {setupState !== 'complete' && (
                                        <div className="animate-in fade-in zoom-in duration-500 text-center flex flex-col items-center">
                                            <div className="relative w-24 h-24 mb-10">
                                                {/* Spinner Circle */}
                                                <div className="absolute inset-0 rounded-full border-[6px] border-slate-100"></div>
                                                <div
                                                    className="absolute inset-0 rounded-full border-[6px] border-blue-600 border-t-transparent animate-spin"
                                                    style={{ borderColor: '#2563eb transparent transparent transparent' }}
                                                ></div>
                                                {/* Inner Rocket */}
                                                <div className="absolute inset-0 flex items-center justify-center animate-pulse">
                                                    <Rocket className="w-8 h-8 text-blue-600" />
                                                </div>
                                            </div>

                                            <h2 className="text-3xl font-black text-slate-800 mb-4 tracking-tight animate-pulse">
                                                {setupMessage}
                                            </h2>

                                            {/* Progress Bar */}
                                            <div className="w-64 h-2 bg-slate-100 rounded-full overflow-hidden mt-4">
                                                <div
                                                    className="h-full bg-blue-600 transition-all duration-300 ease-out rounded-full"
                                                    style={{ width: `${setupProgress}%`, backgroundColor: '#2563eb' }}
                                                />
                                            </div>
                                        </div>
                                    )}

                                    {/* SUCCESS STATE - Shown after animation */}
                                    {setupState === 'complete' && (
                                        <div className="text-center animate-in fade-in zoom-in slide-in-from-bottom-10 duration-700 max-w-md mx-auto">
                                            <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto mb-10 shadow-inner ring-[12px] ring-green-50 animate-bounce" style={{ backgroundColor: '#f0fdf4', color: '#16a34a', animationDuration: '2s' }}>
                                                <CheckCircle2 className="w-16 h-16" />
                                            </div>
                                            <h2 className="text-5xl font-black text-slate-900 mb-6 tracking-tight">Klaar!</h2>
                                            <p className="text-2xl text-slate-500 leading-relaxed mb-12">
                                                T&apos;Hooft Omni is volledig geconfigureerd.
                                            </p>

                                            <Button
                                                onClick={handleFinish}
                                                className="bg-green-600 hover:bg-green-700 text-white w-full h-20 text-2xl font-black rounded-[2rem] gap-4 shadow-2xl shadow-green-100 transition-all hover:scale-[1.05] active:scale-[0.95] flex items-center justify-center group"
                                                style={{ backgroundColor: '#16a34a', color: 'white' }}
                                            >
                                                Start T&apos;Hooft Omni
                                                <ArrowRight className="w-7 h-7 group-hover:translate-x-1 transition-transform" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </Card>
                </div>
            </div>
        </TooltipProvider>
    );
}
