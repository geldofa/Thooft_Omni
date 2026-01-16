import React, { useState } from 'react';
import { pb } from './AuthContext';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
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

    const handleCreateAdmin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (adminData.password !== adminData.passwordConfirm) {
            toast.error('Wachtwoorden komen niet overeen');
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
                role: 'admin',
                active: true
            });

            toast.success('Admin account succesvol aangemaakt!');
            setStep('data');
        } catch (error: any) {
            console.error('Admin creation failed:', error);
            toast.error(`Kon admin niet aanmaken: ${error.message}`);
        } finally {
            setIsCreatingAdmin(false);
        }
    };

    const handleFinish = () => {
        onComplete();
    };

    const handleImportComplete = () => {
        setStep('finish');
    };

    return (
        <TooltipProvider>
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="w-full max-w-2xl">
                    <div className="flex justify-center mb-8">
                        <div className="flex items-center gap-3">
                            <div className="p-3 bg-blue-600 rounded-2xl shadow-xl shadow-blue-200">
                                <Rocket className="w-8 h-8 text-white" />
                            </div>
                            <h1 className="text-3xl font-black text-gray-900 tracking-tight">Thooft Omni</h1>
                        </div>
                    </div>

                    {step === 'welcome' && (
                        <Card className="border-none shadow-2xl shadow-slate-200 overflow-hidden bg-white">
                            <div className="h-2 bg-blue-600" />
                            <CardHeader className="pt-10 text-center">
                                <CardTitle className="text-3xl font-bold text-gray-900">Welkom!</CardTitle>
                                <CardDescription className="text-lg">
                                    Bedankt voor het kiezen van Thooft Omni. Laten we uw nieuwe systeem instellen in een paar eenvoudige stappen.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="py-10">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="flex flex-col items-center text-center space-y-3">
                                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                            <ShieldCheck className="w-6 h-6" />
                                        </div>
                                        <div className="font-bold">Admin Account</div>
                                        <div className="text-xs text-slate-500">Beveilig uw toegang met uw eerste beheerderprofiel.</div>
                                    </div>
                                    <div className="flex flex-col items-center text-center space-y-3">
                                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                            <Database className="w-6 h-6" />
                                        </div>
                                        <div className="font-bold">Data Import</div>
                                        <div className="text-xs text-slate-500">Zet bestaande Excel- of CSV-data direct over naar Thooft Omni.</div>
                                    </div>
                                    <div className="flex flex-col items-center text-center space-y-3">
                                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                            <CheckCircle2 className="w-6 h-6" />
                                        </div>
                                        <div className="font-bold">Klaar voor Gebruik</div>
                                        <div className="text-xs text-slate-500">Binnen enkele minuten operationeel en klaar voor onderhoud.</div>
                                    </div>
                                </div>
                            </CardContent>
                            <CardFooter className="pb-10 flex justify-center">
                                <Button onClick={() => setStep('admin')} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-6 text-lg font-bold rounded-xl gap-3 shadow-lg shadow-blue-200 transition-all hover:scale-105 active:scale-95">
                                    Start Configuratie <ArrowRight className="w-5 h-5" />
                                </Button>
                            </CardFooter>
                        </Card>
                    )}

                    {step === 'admin' && (
                        <Card className="border-none shadow-2xl shadow-slate-200 bg-white">
                            <div className="h-2 bg-blue-600" />
                            <CardHeader>
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-4">
                                    <UserPlus className="w-6 h-6" />
                                </div>
                                <CardTitle className="text-2xl font-bold">Maak Beheerder Account</CardTitle>
                                <CardDescription>Uw eerste account wordt automatisch een administrator.</CardDescription>
                            </CardHeader>
                            <form onSubmit={handleCreateAdmin}>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="name">Volledige Naam</Label>
                                            <Input
                                                id="name"
                                                required
                                                value={adminData.name}
                                                onChange={e => setAdminData({ ...adminData, name: e.target.value })}
                                                placeholder="Antony Thooft"
                                                className="h-11"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="username">Gebruikersnaam</Label>
                                            <Input
                                                id="username"
                                                required
                                                value={adminData.username}
                                                onChange={e => setAdminData({ ...adminData, username: e.target.value })}
                                                placeholder="admin"
                                                className="h-11"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="email">Email Adres</Label>
                                        <Input
                                            id="email"
                                            type="email"
                                            required
                                            value={adminData.email}
                                            onChange={e => setAdminData({ ...adminData, email: e.target.value })}
                                            placeholder="info@thooft.be"
                                            className="h-11"
                                        />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="password">Wachtwoord</Label>
                                            <Input
                                                id="password"
                                                type="password"
                                                required
                                                value={adminData.password}
                                                onChange={e => setAdminData({ ...adminData, password: e.target.value })}
                                                className="h-11"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label htmlFor="passwordConfirm">Bevestig Wachtwoord</Label>
                                            <Input
                                                id="passwordConfirm"
                                                type="password"
                                                required
                                                value={adminData.passwordConfirm}
                                                onChange={e => setAdminData({ ...adminData, passwordConfirm: e.target.value })}
                                                className="h-11"
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                                <CardFooter className="flex justify-between border-t mt-6 pt-6">
                                    <Button type="button" variant="ghost" onClick={() => setStep('welcome')}>Terug</Button>
                                    <Button type="submit" disabled={isCreatingAdmin} className="bg-blue-600 hover:bg-blue-700 text-white px-8 h-11 font-bold">
                                        {isCreatingAdmin ? 'Verwerken...' : 'Account Aanmaken'}
                                    </Button>
                                </CardFooter>
                            </form>
                        </Card>
                    )}

                    {step === 'data' && (
                        <Card className="border-none shadow-2xl shadow-slate-200 bg-white">
                            <div className="h-2 bg-blue-600" />
                            <CardHeader>
                                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center text-blue-600 mb-4">
                                    <Database className="w-6 h-6" />
                                </div>
                                <CardTitle className="text-2xl font-bold">Onderhoudsgegevens Instellen</CardTitle>
                                <CardDescription>Kies hoe u wilt beginnen met de database.</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <button
                                        onClick={() => {
                                            localStorage.setItem('onboarding_redirect', 'import');
                                            handleFinish();
                                        }}
                                        className="p-6 border-2 border-slate-100 rounded-2xl text-left hover:border-blue-200 hover:bg-blue-50 transition-all group"
                                    >
                                        <div className="w-10 h-10 bg-slate-100 group-hover:bg-blue-100 rounded-lg flex items-center justify-center text-slate-600 group-hover:text-blue-600 mb-4 transition-colors">
                                            <CheckCircle2 className="w-5 h-5" />
                                        </div>
                                        <h3 className="font-bold text-gray-900 mb-1">Begin Blanco</h3>
                                        <p className="text-sm text-slate-500">Start met een lege database en voer later handmatig machines en taken in.</p>
                                    </button>

                                    <button
                                        className="p-6 border-2 border-blue-600 bg-blue-50 rounded-2xl text-left shadow-lg shadow-blue-100 transition-all scale-105"
                                    >
                                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center text-white mb-4">
                                            <FileUp className="w-5 h-5" />
                                        </div>
                                        <h3 className="font-bold text-gray-900 mb-1">Data Importeren</h3>
                                        <p className="text-sm text-slate-500">Gebruik de Import Wizard om direct uw Excel-bestanden in te laden.</p>
                                    </button>
                                </div>

                                <div className="pt-4 border-t border-slate-100">
                                    <ImportTool onComplete={handleImportComplete} />
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between pt-0">
                                <Button variant="ghost" onClick={() => setStep('admin')}>Terug</Button>
                                <Button variant="ghost" onClick={() => setStep('finish')} className="text-slate-400">Deze stap overslaan</Button>
                            </CardFooter>
                        </Card>
                    )}

                    {step === 'finish' && (
                        <Card className="border-none shadow-2xl shadow-slate-200 overflow-hidden bg-white">
                            <div className="h-2 bg-green-500" />
                            <CardHeader className="pt-10 text-center">
                                <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center text-green-600 mx-auto mb-6">
                                    <CheckCircle2 className="w-10 h-10" />
                                </div>
                                <CardTitle className="text-3xl font-bold text-gray-900">Configuratie Voltooid!</CardTitle>
                                <CardDescription className="text-lg">
                                    Thooft Omni is nu klaar voor gebruik. U kunt inloggen met uw zojuist gemaakte admin account.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="py-10 text-center text-slate-600">
                                <p>Geniet van een gestroomlijnd onderhoudsbeheer.</p>
                                <div className="mt-8 p-4 bg-blue-50 border border-blue-100 rounded-xl text-blue-900 text-sm">
                                    <strong>Tip:</strong> U kunt later altijd nieuwe machines of medewerkers toevoegen via de respectievelijke pagina's of de Toolbox gebruiken voor bulk import.
                                </div>
                            </CardContent>
                            <CardFooter className="pb-10 flex justify-center">
                                <Button onClick={handleFinish} className="bg-green-600 hover:bg-green-700 text-white px-10 py-6 text-lg font-bold rounded-xl gap-3 shadow-lg shadow-green-200 transition-all hover:scale-105 active:scale-95">
                                    Afronden & Inloggen <Rocket className="w-5 h-5" />
                                </Button>
                            </CardFooter>
                        </Card>
                    )}
                </div>
            </div>
        </TooltipProvider>
    );
}
