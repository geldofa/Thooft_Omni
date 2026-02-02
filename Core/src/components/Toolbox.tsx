import { useState, useEffect } from 'react';
import { useAuth, MaintenanceTask, BackupInfo, BackupSettings, pb } from './AuthContext';
import { Button } from './ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Switch } from './ui/switch';
import { ImportTool } from './ImportTool';
import { ImportToolDrukwerken } from './ImportToolDrukwerken';
import { TooltipProvider } from './ui/tooltip';
import { Input } from './ui/input';

export function Toolbox({ onNavigateHome }: { onNavigateHome?: () => void }) {
    return (
        <TooltipProvider>
            <div className="p-6 w-full mx-auto">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-2 bg-blue-600 rounded-xl shadow-lg shadow-blue-200">
                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Admin Toolbox</h1>
                        <p className="text-sm text-gray-500 font-medium">Beheer systeeminstellingen en data-onderhoud</p>
                    </div>
                </div>

                <ToolboxContent onNavigateHome={onNavigateHome} />
            </div>
        </TooltipProvider>
    );
}

function ToolboxContent({ onNavigateHome }: { onNavigateHome?: () => void }) {
    const { tasks, updateTask, fetchTasks, testingMode, setTestingMode, listBackups, createBackup, downloadBackup, deleteBackup, restoreBackup, uploadBackup, getBackupSettings, updateBackupSettings, cloudSyncStatus, refreshCloudSyncStatus, configureCloudSync, verifyCloudBackups, isSuperuser, authenticateSuperuser } = useAuth();
    const [isRecalculating, setIsRecalculating] = useState(false);
    const [backups, setBackups] = useState<BackupInfo[]>([]);
    const [isLoadingBackups, setIsLoadingBackups] = useState(false);
    const [isCreatingBackup, setIsCreatingBackup] = useState(false);
    const [backupName, setBackupName] = useState('');
    const [superuserEmail, setSuperuserEmail] = useState('');
    const [superuserPassword, setSuperuserPassword] = useState('');
    const [isAuthenticating, setIsAuthenticating] = useState(false);
    const [isRestoring, setIsRestoring] = useState(false);
    const [isUploadingBackup, setIsUploadingBackup] = useState(false);
    const [backupSettings, setBackupSettings] = useState<BackupSettings | null>(null);
    const [isLoadingSettings, setIsLoadingSettings] = useState(false);
    const [isSavingSettings, setIsSavingSettings] = useState(false);
    const [isLoadingCloudSync, setIsLoadingCloudSync] = useState(false);
    const [isLinkingCloud, setIsLinkingCloud] = useState(false);
    const [cloudConfigType, setCloudConfigType] = useState<'gdrive' | 'onedrive' | 'local'>('local');

    const [cloudClientId, setCloudClientId] = useState('');
    const [cloudClientSecret, setCloudClientSecret] = useState('');
    const [isConfigExpanded, setIsConfigExpanded] = useState(() => {
        if (typeof sessionStorage !== 'undefined') return sessionStorage.getItem('toolbox_configExpanded') === 'true';
        return false;
    });

    const [tasksStep, setTasksStep] = useState<'upload' | 'analysis' | 'resolve' | 'preview'>('upload');
    const [drukwerkenStep, setDrukwerkenStep] = useState<'upload' | 'analysis' | 'resolve' | 'preview'>('upload');

    // Sub-tab Persistence (URL based)
    const [activeTab, setActiveTabState] = useState(() => {
        if (typeof window !== 'undefined') {
            const params = new URLSearchParams(window.location.search);
            return params.get('tab') || 'settings';
        }
        return 'settings';
    });

    const setActiveTab = (tab: string) => {
        setActiveTabState(tab);
        if (typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            url.searchParams.set('tab', tab);
            window.history.replaceState({}, '', url.toString());
        }
    };

    useEffect(() => {
        if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('toolbox_configExpanded', String(isConfigExpanded));
    }, [isConfigExpanded]);
    const [verificationMap, setVerificationMap] = useState<Record<string, boolean>>({});
    const [isVerifying, setIsVerifying] = useState(false);

    const loadBackups = async () => {
        if (!isSuperuser) return;
        setIsLoadingBackups(true);
        try {
            const list = await listBackups();
            setBackups(list.sort((a, b) => new Date(b.modified).getTime() - new Date(a.modified).getTime()));

            // Trigger verification if cloud sync is configured
            if (cloudSyncStatus?.configured) {
                verifyBackups(list.map(b => b.key));
            }
        } catch (e) {
            console.error('Failed to load backups:', e);
        } finally {
            setIsLoadingBackups(false);
        }
    };

    const verifyBackups = async (keys: string[]) => {
        setIsVerifying(true);
        try {
            const map = await verifyCloudBackups(keys);
            setVerificationMap(map);
        } finally {
            setIsVerifying(false);
        }
    };

    const loadBackupSettings = async () => {
        if (!isSuperuser) return;
        setIsLoadingSettings(true);
        try {
            const settings = await getBackupSettings();
            setBackupSettings(settings);
        } catch (e) {
            console.error('Failed to load backup settings:', e);
        } finally {
            setIsLoadingSettings(false);
        }
    };

    const loadCloudSyncStatus = async () => {
        if (!isSuperuser) return;
        setIsLoadingCloudSync(true);
        try {
            await refreshCloudSyncStatus();
            // Note: cloudSyncStatus is now updated in AuthContext
        } catch (e) {
            console.error('Failed to load cloud sync status:', e);
        } finally {
            setIsLoadingCloudSync(false);
        }
    };

    const handleUpdateBackupSettings = async () => {
        if (!backupSettings) return;
        setIsSavingSettings(true);
        try {
            // If Cloud Sync is configured, we enforce the local bridge settings
            let settingsToSave = { ...backupSettings };
            if (cloudSyncStatus?.configured) {
                // Ensure S3 is enabled
                settingsToSave.s3 = {
                    ...settingsToSave.s3,
                    enabled: true, // Force enable if using cloud sync
                    endpoint: 'http://rclone:8081',
                    bucket: 'backups',
                    region: 'us-east-1', // Dummy
                    accessKey: 'minio',  // Dummy
                    secretKey: 'minio123', // Dummy
                    forcePathStyle: true
                };
            }

            const success = await updateBackupSettings(settingsToSave);
            if (success) {
                await loadBackupSettings();
            }
        } finally {
            setIsSavingSettings(false);
        }
    };



    const handleAuthorizeCloudSync = async () => {
        if (!cloudClientId || !cloudClientSecret) {
            toast.error("Oeps! Client ID en Secret zijn verplicht voor OAuth.");
            return;
        }

        setIsLinkingCloud(true);
        // Construct the URL to our backend auth endpoint
        const baseUrl = window.location.origin.replace('8080', '8090'); // Usually DB is on 8090
        const authUrl = `${baseUrl}/api/cloud-sync/auth/${cloudConfigType}?client_id=${encodeURIComponent(cloudClientId)}&client_secret=${encodeURIComponent(cloudClientSecret)}&token=${encodeURIComponent(pb.authStore.token)}&app_origin=${encodeURIComponent(window.location.origin)}`;

        // Redirect the whole page to the auth flow
        window.location.href = authUrl;
    };

    useEffect(() => {
        if (isSuperuser) {
            loadBackups();
            loadBackupSettings();

            // Check if cloud sync status is already known or needs refresh
            if (!cloudSyncStatus) {
                loadCloudSyncStatus();
            }

            // Check if we just returned from a successful sync
            const params = new URLSearchParams(window.location.search);
            if (params.get('sync') === 'success') {
                toast.success("Opslag succesvol gekoppeld via OAuth!");
                // Refresh status globally
                refreshCloudSyncStatus();
                // Clear the URL param
                window.history.replaceState({}, document.title, window.location.pathname + window.location.hash);
            }
        } else {
            // Auto-login attempt
            const stored = localStorage.getItem('superuser_credentials');
            if (stored) {
                try {
                    const { email, password } = JSON.parse(stored);
                    if (email && password && !isAuthenticating) {
                        setIsAuthenticating(true);
                        authenticateSuperuser(email, password).finally(() => {
                            setIsAuthenticating(false);
                        });
                    }
                } catch (e) {
                    console.error('Failed to parse stored superuser credentials:', e);
                }
            }
        }
    }, [isSuperuser]);

    const handleCreateBackup = async () => {
        setIsCreatingBackup(true);
        try {
            const name = backupName.trim() ? backupName.trim() : undefined;
            const success = await createBackup(name);
            if (success) {
                setBackupName('');
                await loadBackups();
            }
        } finally {
            setIsCreatingBackup(false);
        }
    };

    const handleDownloadBackup = async (key: string) => {
        const url = await downloadBackup(key);
        if (url) {
            window.open(url, '_blank');
        }
    };

    const handleDeleteBackup = async (key: string) => {
        if (!confirm(`Weet u zeker dat u backup "${key}" wilt verwijderen?`)) return;
        const success = await deleteBackup(key);
        if (success) {
            await loadBackups();
        }
    };

    const handleRestoreBackup = async (key: string) => {
        if (!confirm(`WAARSCHUWING: Weet u absoluut zeker dat u de database wilt herstellen van backup "${key}"? \n\nALLE HUIDIGE DATA WORDT OVERSCHREVEN EN DE SERVER START OPNIEUW OP.`)) {
            return;
        }

        if (!confirm(`DIT IS DE LAATSTE WAARSCHUWING: Bevestig herstel naar "${key}".`)) {
            return;
        }

        setIsRestoring(true);
        try {
            await restoreBackup(key);
            // The AuthContext.restoreBackup handles the reload
        } catch (e) {
            console.error('Restore failed:', e);
            setIsRestoring(false);
        }
    };

    const handleUploadBackup = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.zip')) {
            toast.error('Selecteer een geldig .zip bestand');
            return;
        }

        setIsUploadingBackup(true);
        try {
            const success = await uploadBackup(file);
            if (success) {
                await loadBackups();
            }
        } finally {
            setIsUploadingBackup(false);
            // Reset input
            event.target.value = '';
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    const handleSuperuserLogin = async () => {
        if (!superuserEmail || !superuserPassword) {
            toast.error('Vul email en wachtwoord in');
            return;
        }
        setIsAuthenticating(true);
        try {
            const success = await authenticateSuperuser(superuserEmail, superuserPassword);
            if (success) {
                localStorage.setItem('superuser_credentials', JSON.stringify({
                    email: superuserEmail,
                    password: superuserPassword
                }));
                setSuperuserPassword('');
            }
        } finally {
            setIsAuthenticating(false);
        }
    };

    const handleRecalculateDates = async () => {
        if (!confirm('Dit zal alle geplande datums herberekenen op basis van de laatste onderhoudsdatum. Dit corrigeert foutieve "Vandaag" datums door de import. Weet u het zeker?')) return;

        setIsRecalculating(true);
        let count = 0;
        try {
            const updates: Promise<void>[] = [];

            for (const group of tasks) {
                for (const sub of group.subtasks) {
                    if (sub.lastMaintenance && sub.maintenanceInterval) {
                        const last = new Date(sub.lastMaintenance);
                        const unit = (sub.maintenanceIntervalUnit || '').toLowerCase();
                        const interval = sub.maintenanceInterval;

                        const expected = new Date(last);
                        if (unit.includes('maand') || unit.includes('month') || unit === 'months') {
                            expected.setMonth(expected.getMonth() + interval);
                        } else if (unit.includes('jaar') || unit.includes('year') || unit === 'years') {
                            expected.setFullYear(expected.getFullYear() + interval);
                        } else if (unit.includes('week') || unit.includes('weeks')) {
                            expected.setDate(expected.getDate() + (interval * 7));
                        } else {
                            expected.setDate(expected.getDate() + interval);
                        }

                        // Check diff
                        const current = sub.nextMaintenance ? new Date(sub.nextMaintenance) : new Date();
                        const diff = Math.abs(current.getTime() - expected.getTime());

                        if (diff > 86400000) { // > 1 day difference
                            const taskToUpdate: MaintenanceTask = {
                                ...sub,
                                task: group.taskName,
                                taskSubtext: group.taskSubtext,
                                subtaskName: sub.subtaskName,
                                subtaskSubtext: sub.subtext,
                                category: group.category,
                                categoryId: group.categoryId,
                                press: group.press,
                                pressId: group.pressId,
                                nextMaintenance: expected,
                                updated: new Date().toISOString()
                            } as any;

                            updates.push(updateTask(taskToUpdate, false));
                            count++;
                        }
                    }
                }
            }

            if (updates.length > 0) {
                await Promise.all(updates);
                await fetchTasks();
                toast.success(`${count} datums succesvol hersteld.`);
            } else {
                toast.info('Geen datums hoeven te worden aangepast.');
            }

        } catch (e: any) {
            console.error(e);
            toast.error(`Fout bij herstel: ${e.message}`);
        } finally {
            setIsRecalculating(false);
        }
    };

    return (
        <div className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="tab-pill-list mb-6">
                    <TabsTrigger value="settings" className="tab-pill-trigger">Systeem Instellingen</TabsTrigger>
                    <TabsTrigger value="import" className="tab-pill-trigger">Import Wizard</TabsTrigger>
                    <TabsTrigger value="fixes" className="tab-pill-trigger">Database Fixes</TabsTrigger>
                    <TabsTrigger value="backup" className="tab-pill-trigger">Backup & Restore</TabsTrigger>
                </TabsList>

                <TabsContent value="settings" className="space-y-6">
                    <Card className="border-blue-200 bg-blue-50/30">
                        <CardHeader>
                            <CardTitle className="text-blue-800">Test Modus</CardTitle>
                            <CardDescription className="text-blue-700">
                                Beheer globale applicatie instellingen voor ontwikkeling en testen.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-between p-4 bg-white rounded-xl border border-blue-100 shadow-sm">
                                <div className="space-y-1">
                                    <h3 className="font-bold text-gray-900">Snelle Login Knoppen</h3>
                                    <p className="text-sm text-gray-600">
                                        Wanneer ingeschakeld, worden alle geregistreerde accounts als knoppen getoond op de inlogpagina voor snelle toegang.
                                    </p>
                                </div>
                                <Switch
                                    checked={testingMode}
                                    onCheckedChange={setTestingMode}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="import" className="space-y-6">
                    {tasksStep === 'upload' && drukwerkenStep === 'upload' ? (
                        <div className="overflow-x-auto pb-6">
                            <div className="grid grid-cols-2 gap-8 min-w-[1100px]">
                                <Card className="border-blue-100 bg-blue-50/10 shadow-sm hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-4">
                                        <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mb-4 shadow-blue-200 shadow-lg">
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                                            </svg>
                                        </div>
                                        <CardTitle className="text-blue-900 text-2xl font-black uppercase tracking-tight">1. Onderhoudstaken</CardTitle>
                                        <CardDescription className="text-blue-700 font-medium text-base">
                                            Upload hier de lijst met periodieke onderhoudstaken (Excel/CSV).
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ImportTool minimal onComplete={onNavigateHome} onStepChange={setTasksStep} />
                                    </CardContent>
                                </Card>

                                <Card className="border-slate-100 bg-slate-50/10 shadow-sm hover:shadow-md transition-shadow">
                                    <CardHeader className="pb-4">
                                        <div className="w-10 h-10 bg-slate-700 rounded-lg flex items-center justify-center mb-4 shadow-slate-200 shadow-lg">
                                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                                            </svg>
                                        </div>
                                        <CardTitle className="text-slate-900 text-2xl font-black uppercase tracking-tight">2. Drukwerken</CardTitle>
                                        <CardDescription className="text-slate-700 font-medium text-base">
                                            Upload hier de gerealiseerde orders voor rapportage.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ImportToolDrukwerken minimal onComplete={onNavigateHome} onStepChange={setDrukwerkenStep} />
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    ) : tasksStep !== 'upload' ? (
                        <div className="animate-in fade-in duration-500">
                            <ImportTool onComplete={onNavigateHome} onStepChange={setTasksStep} />
                        </div>
                    ) : (
                        <div className="animate-in fade-in duration-500">
                            <ImportToolDrukwerken onComplete={onNavigateHome} onStepChange={setDrukwerkenStep} />
                        </div>
                    )}
                </TabsContent>

                <TabsContent value="fixes" className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Datum Correctie</CardTitle>
                            <CardDescription>
                                Herbereken alle geplande datums op basis van het interval en de laatste onderhoudsdatum.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="p-4 bg-orange-50 border border-orange-100 rounded-lg mb-4">
                                <p className="text-sm text-orange-800 font-medium">
                                    Gebruik dit hulpmiddel als geïmporteerde taken onjuiste "Volgende Datum" waarden hebben gekregen.
                                </p>
                            </div>
                            <Button
                                onClick={handleRecalculateDates}
                                disabled={isRecalculating}
                                variant="outline"
                                className="border-orange-200 text-orange-700 hover:bg-orange-50 hover:text-orange-800"
                            >
                                {isRecalculating ? 'Bezig met herberekenen...' : 'Herbereken Alle Datums'}
                            </Button>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="backup" className="space-y-6">
                    {!isSuperuser ? (
                        <Card className="border-blue-200 bg-blue-50/30">
                            <CardHeader>
                                <CardTitle className="text-blue-800">Superuser Authenticatie</CardTitle>
                                <CardDescription className="text-blue-700">
                                    Backup beheer vereist PocketBase superuser rechten. Log in met het superuser account.
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4 max-w-sm">
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 block mb-1">Email</label>
                                        <Input
                                            type="email"
                                            placeholder="admin@voorbeeld.com"
                                            value={superuserEmail}
                                            onChange={(e) => setSuperuserEmail(e.target.value)}
                                        />
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-gray-700 block mb-1">Wachtwoord</label>
                                        <Input
                                            type="password"
                                            placeholder="••••••••"
                                            value={superuserPassword}
                                            onChange={(e) => setSuperuserPassword(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleSuperuserLogin()}
                                        />
                                    </div>
                                    <Button
                                        onClick={handleSuperuserLogin}
                                        disabled={isAuthenticating}
                                        className="bg-blue-600 hover:bg-blue-700 w-full"
                                    >
                                        {isAuthenticating ? 'Authenticeren...' : 'Inloggen voor Backup Toegang'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ) : (

                        <div className="space-y-6">
                            {/* TOP: CONFIGURATION (Cloud & Auto Backup) */}
                            <Card className="border-blue-100 shadow-sm overflow-hidden">
                                <div
                                    className="p-4 bg-blue-50/50 border-b border-blue-100 flex items-center justify-between cursor-pointer hover:bg-blue-50 transition-colors"
                                    onClick={() => setIsConfigExpanded(!isConfigExpanded)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-900">Cloud & Backup Configuratie</h3>
                                            <p className="text-xs text-gray-500">
                                                {isLoadingCloudSync ? (
                                                    <span className="animate-pulse">Status controleren...</span>
                                                ) : cloudSyncStatus?.configured ? (
                                                    <span className="text-green-600 font-medium flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                                                        Cloud Actief • Auto Backup {backupSettings?.enabled ? 'Aan' : 'Uit'}
                                                    </span>
                                                ) : (
                                                    <span className="text-orange-600">Nog niet geconfigureerd</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`transform transition-transform duration-200 ${isConfigExpanded ? 'rotate-180' : ''}`}>
                                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>

                                {isConfigExpanded && (
                                    <CardContent className="p-0 border-t border-blue-100 overflow-x-auto">
                                        <div className="min-w-[900px] grid grid-cols-3 divide-x divide-gray-100">
                                            <div className="p-6">
                                                <div className="flex items-center justify-between mb-4">
                                                    <h4 className="text-xs font-bold text-gray-900 uppercase">Cloud Verbinding</h4>
                                                    {cloudSyncStatus?.configured && (
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={async () => {
                                                                const toastId = toast.loading("Synchronisatie gestart...");
                                                                try {
                                                                    await fetch(pb.baseUrl + '/api/cloud-sync/sync-now?token=' + encodeURIComponent(pb.authStore.token), { method: 'POST' });
                                                                    toast.dismiss(toastId);
                                                                    toast.success("Synchronisatie voltooid!");
                                                                } catch (e) {
                                                                    toast.dismiss(toastId);
                                                                    toast.error("Synchronisatie mislukt");
                                                                }
                                                            }}
                                                            className="h-6 text-[10px] px-2"
                                                        >
                                                            Synchroniseer Nu
                                                        </Button>
                                                    )}
                                                </div>
                                                {isLoadingCloudSync ? (
                                                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                                                        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mb-2"></div>
                                                        <span className="text-xs">Status controleren...</span>
                                                    </div>
                                                ) : cloudSyncStatus?.configured ? (
                                                    <div className="p-4 bg-green-50 rounded-lg border border-green-100 text-center space-y-3">
                                                        <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                                                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
                                                        </div>
                                                        <div>
                                                            <h5 className="text-sm font-bold text-green-900">Succesvol Gekoppeld</h5>
                                                            <p className="text-xs text-green-700 mt-1">Backups worden automatisch gesynchroniseerd.</p>
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="space-y-4">
                                                        <div className="grid grid-cols-3 gap-2">
                                                            <button onClick={() => setCloudConfigType('gdrive')} className={`flex flex-col items-center p-2 rounded-lg border transition-all ${cloudConfigType === 'gdrive' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 bg-white hover:border-blue-300'}`}>
                                                                <svg className="w-5 h-5 mb-1" viewBox="0 0 24 24" fill="none"><path d="M11.99 2.019L8.71 7.711H15.29L11.99 2.019Z" fill="#0066DA" /><path d="M15.29 7.711L8.71 7.711L5.42 13.411H18.57L15.29 7.711Z" fill="#00AC47" /><path d="M18.57 13.411H5.42L2.14 19.111H15.29L18.57 13.411Z" fill="#FFC107" /><path d="M11.99 2.019L8.71 7.711L11.99 13.411L15.29 7.711L11.99 2.019Z" fill="#0083ED" /></svg>
                                                                <span className="text-[9px] font-bold">Google</span>
                                                            </button>
                                                            <button onClick={() => setCloudConfigType('onedrive')} className={`flex flex-col items-center p-2 rounded-lg border transition-all ${cloudConfigType === 'onedrive' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 bg-white hover:border-blue-300'}`}>
                                                                <svg className="w-5 h-5 mb-1 text-blue-600" fill="currentColor" viewBox="0 0 24 24"><path d="M11.006 18c-3.111 0-5.632-2.522-5.632-5.633 0-2.31 1.436-4.305 3.479-5.158A4.957 4.957 0 0113.824 4c2.585 0 4.717 1.956 4.981 4.479C20.686 8.784 22 10.413 22 12.35 22 14.366 20.366 16 18.35 16h-7.344zm7.344-1.5c1.187 0 2.15-.963 2.15-2.15s-.963-2.15-2.15-2.15c-.246 0-.48.044-.698.125l-.837.31-.19-.873c-.237-1.083-1.196-1.875-2.302-1.875-.246 0-.484.04-.707.114l-.873.287-.318-.865A3.486 3.486 0 0010.155 7.5c-1.579 0-2.81 1.056-3.141 2.5l-.234 1.026-1.012-.275A3.13 3.13 0 005.022 10.5c0 1.73 1.403 3.132 3.132 3.132h10.196v1.368z" /></svg>
                                                                <span className="text-[9px] font-bold">OneDrive</span>
                                                            </button>
                                                            <button onClick={() => setCloudConfigType('local')} className={`flex flex-col items-center p-2 rounded-lg border transition-all ${cloudConfigType === 'local' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 bg-white hover:border-blue-300'}`}>
                                                                <svg className="w-5 h-5 mb-1 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" /></svg>
                                                                <span className="text-[9px] font-bold">Lokaal</span>
                                                            </button>
                                                        </div>

                                                        {cloudConfigType !== 'local' ? (
                                                            <div className="space-y-3 bg-gray-50 p-3 rounded border border-gray-100">
                                                                <div className="flex gap-2">
                                                                    <button onClick={() => window.open(cloudConfigType === 'gdrive' ? 'https://console.cloud.google.com/projectcreate?name=Omni-Backups' : 'https://portal.azure.com/#view/Microsoft_AAD_RegisteredApps/ApplicationsListBlade', '_blank')} className="flex-1 text-left p-2 rounded bg-white border border-gray-200 hover:border-blue-400 text-[10px] font-medium text-gray-600">
                                                                        1. Maak Project
                                                                    </button>
                                                                    {cloudConfigType === 'gdrive' && (
                                                                        <button onClick={() => window.open('https://console.developers.google.com/apis/api/drive.googleapis.com/overview', '_blank')} className="flex-1 text-left p-2 rounded bg-white border border-gray-200 hover:border-blue-400 text-[10px] font-medium text-gray-600">
                                                                            1a. Activeer API
                                                                        </button>
                                                                    )}
                                                                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin.replace('8080', '8090')}/api/cloud-sync/callback`); toast.success("URI Gekopieerd!"); }} className="flex-1 text-left p-2 rounded bg-white border border-gray-200 hover:border-blue-400 text-[10px] font-medium text-gray-600">
                                                                        2. Kopieer URI
                                                                    </button>
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <Input value={cloudClientId} onChange={(e) => setCloudClientId(e.target.value)} placeholder="Client ID" className="h-7 text-[10px] bg-white" />
                                                                    <Input type="password" value={cloudClientSecret} onChange={(e) => setCloudClientSecret(e.target.value)} placeholder="Client Secret" className="h-7 text-[10px] bg-white" />
                                                                    <Button onClick={handleAuthorizeCloudSync} disabled={!cloudClientId || !cloudClientSecret || isLinkingCloud} size="sm" className="w-full h-7 text-[10px] bg-blue-600 hover:bg-blue-700">
                                                                        {isLinkingCloud ? 'Verbinden...' : '3. Verbind Nu'}
                                                                    </Button>
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <div className="p-3 bg-gray-50 rounded border border-gray-100 flex justify-center">
                                                                <Button size="sm" variant="outline" onClick={() => { configureCloudSync('local', {}).then(s => s && toast.success("Lokale opslag OK!")); }} className="h-7 text-[10px] bg-white">
                                                                    Test Lokale Opslag
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="p-6">
                                                <h4 className="text-xs font-bold text-gray-900 uppercase mb-4">Backup Schema</h4>
                                                {isLoadingSettings ? (
                                                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                                                        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mb-2"></div>
                                                        <span className="text-xs">Laden...</span>
                                                    </div>
                                                ) : backupSettings && (
                                                    <div className="space-y-5">
                                                        <div className="space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <div className="space-y-0.5">
                                                                    <span className="text-xs font-bold text-gray-700 uppercase">Auto Backup</span>
                                                                    <p className="text-[10px] text-gray-500">Periodieke snapshots.</p>
                                                                </div>
                                                                <Switch
                                                                    checked={backupSettings.enabled}
                                                                    onCheckedChange={(val) => setBackupSettings({ ...backupSettings, enabled: val })}
                                                                />
                                                            </div>

                                                            {backupSettings.enabled && (
                                                                <div className="p-3 bg-gray-50 rounded-lg space-y-3 animate-in fade-in zoom-in-95 duration-200 border border-gray-100">
                                                                    <div className="space-y-1.5">
                                                                        <label className="text-[9px] font-bold text-gray-500 uppercase">Cron Schema</label>
                                                                        <div className="flex items-center gap-1">
                                                                            <Input
                                                                                value={backupSettings.cron}
                                                                                onChange={(e) => setBackupSettings({ ...backupSettings, cron: e.target.value })}
                                                                                placeholder="0 0 * * *"
                                                                                className="h-7 text-[10px] font-mono bg-white flex-1 min-w-[80px]"
                                                                                title="Min Uur Dag Maand Weekdag"
                                                                            />
                                                                            <div className="flex items-center gap-1 bg-white border border-gray-200 rounded px-1.5 h-7">
                                                                                <span className="text-[9px] font-bold text-gray-500 uppercase">Uur:</span>
                                                                                <input
                                                                                    type="number"
                                                                                    min="0"
                                                                                    max="23"
                                                                                    className="w-8 text-[10px] text-center outline-none p-0 border-none h-full"
                                                                                    value={backupSettings.cron.split(' ')[1] || '0'}
                                                                                    onChange={(e) => {
                                                                                        const parts = backupSettings.cron.split(' ');
                                                                                        if (parts.length >= 5) {
                                                                                            // Validate 0-23
                                                                                            let val = parseInt(e.target.value);
                                                                                            if (isNaN(val)) val = 0;
                                                                                            if (val < 0) val = 0;
                                                                                            if (val > 23) val = 23;
                                                                                            parts[1] = val.toString();
                                                                                            setBackupSettings({ ...backupSettings, cron: parts.join(' ') });
                                                                                        }
                                                                                    }}
                                                                                />
                                                                            </div>
                                                                        </div>
                                                                        <Input
                                                                            type="number"
                                                                            value={backupSettings.cronMaxKeep}
                                                                            onChange={(e) => setBackupSettings({ ...backupSettings, cronMaxKeep: parseInt(e.target.value) || 3 })}
                                                                            className="h-7 w-12 text-[10px] bg-white text-center px-1"
                                                                            title="Aantal bewaren"
                                                                        />
                                                                    </div>
                                                                    <div className="flex gap-1 mt-1">
                                                                        <button onClick={() => setBackupSettings({ ...backupSettings, cron: `0 0 * * *` })} className="text-[9px] bg-white hover:bg-gray-100 px-2 py-0.5 rounded border border-gray-200 text-gray-600">Reset 00:00</button>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="p-6">
                                                <h4 className="text-xs font-bold text-gray-900 uppercase mb-4">Remote Opslag</h4>
                                                {isLoadingSettings ? (
                                                    <div className="flex flex-col items-center justify-center py-8 text-gray-400">
                                                        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full mb-2"></div>
                                                        <span className="text-xs">Laden...</span>
                                                    </div>
                                                ) : backupSettings && (
                                                    <div className="space-y-5">
                                                        <div className="space-y-4">
                                                            <div className="flex items-center justify-between">
                                                                <div className="space-y-0.5">
                                                                    <span className="text-xs font-bold text-gray-700 uppercase">S3 Opslag</span>
                                                                    <p className="text-[10px] text-gray-500">Off-site back-ups.</p>
                                                                </div>
                                                                <Switch
                                                                    checked={backupSettings.s3.enabled}
                                                                    onCheckedChange={(val) => setBackupSettings({
                                                                        ...backupSettings,
                                                                        s3: { ...backupSettings.s3, enabled: val }
                                                                    })}
                                                                />
                                                            </div>

                                                            {cloudSyncStatus?.configured ? (
                                                                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs space-y-2">
                                                                    <div className="flex items-center gap-2 text-blue-700 font-semibold">
                                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                                        Cloud Sync Actief
                                                                    </div>
                                                                    <p className="text-blue-600 leading-relaxed">
                                                                        Backups worden automatisch geupload via de gateway.
                                                                    </p>
                                                                    {!backupSettings.s3.enabled && (
                                                                        <div className="pt-2">
                                                                            <p className="font-bold text-red-600 mb-1">Let op: Auto Upload is uit.</p>
                                                                            <button
                                                                                onClick={() => setBackupSettings({ ...backupSettings, s3: { ...backupSettings.s3, enabled: true } })}
                                                                                className="underline text-blue-700 hover:text-blue-800"
                                                                            >
                                                                                Nu Inschakelen
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ) : (
                                                                backupSettings.s3.enabled && (
                                                                    <div className="space-y-3 pt-1 animate-in fade-in zoom-in-95 duration-200">
                                                                        <div className="space-y-1">
                                                                            <label className="text-[9px] font-bold text-gray-500 uppercase">S3 Endpoint</label>
                                                                            <Input value={backupSettings.s3.endpoint} onChange={(e) => setBackupSettings({ ...backupSettings, s3: { ...backupSettings.s3, endpoint: e.target.value } })} className="h-7 text-[10px] font-mono" />
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <label className="text-[9px] font-bold text-gray-500 uppercase">Bucket</label>
                                                                            <Input value={backupSettings.s3.bucket} onChange={(e) => setBackupSettings({ ...backupSettings, s3: { ...backupSettings.s3, bucket: e.target.value } })} className="h-7 text-[10px]" />
                                                                        </div>
                                                                        <div className="grid grid-cols-2 gap-2">
                                                                            <div className="space-y-1">
                                                                                <label className="text-[9px] font-bold text-gray-500 uppercase">Region</label>
                                                                                <Input value={backupSettings.s3.region} onChange={(e) => setBackupSettings({ ...backupSettings, s3: { ...backupSettings.s3, region: e.target.value } })} className="h-7 text-[10px]" />
                                                                            </div>
                                                                            <div className="space-y-1">
                                                                                <label className="text-[9px] font-bold text-gray-500 uppercase">Access Key</label>
                                                                                <Input value={backupSettings.s3.accessKey} onChange={(e) => setBackupSettings({ ...backupSettings, s3: { ...backupSettings.s3, accessKey: e.target.value } })} className="h-7 text-[10px]" />
                                                                            </div>
                                                                        </div>
                                                                        <div className="space-y-1">
                                                                            <label className="text-[9px] font-bold text-gray-500 uppercase">Secret Key</label>
                                                                            <Input type="password" value={backupSettings.s3.secretKey} onChange={(e) => setBackupSettings({ ...backupSettings, s3: { ...backupSettings.s3, secretKey: e.target.value } })} className="h-7 text-[10px]" />
                                                                        </div>
                                                                    </div>
                                                                )
                                                            )}
                                                        </div>

                                                        <Button
                                                            onClick={handleUpdateBackupSettings}
                                                            disabled={isSavingSettings}
                                                            className="w-full bg-slate-800 hover:bg-slate-900 text-white h-8 text-xs font-bold mt-2"
                                                        >
                                                            {isSavingSettings ? 'Opslaan...' : 'Wijzigingen Opslaan'}
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                    </CardContent>
                                )}
                            </Card>

                            {/* BOTTOM: ACTIONS & HISTORY */}
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
                                <div className="space-y-6">
                                    {/* 2. ACTIONS */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-blue-300 transition-colors group">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-colors">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
                                                </div>
                                            </div>
                                            <h3 className="font-bold text-gray-900 text-sm">Nieuwe Backup</h3>
                                            <p className="text-xs text-gray-500 mb-3">Maak direct een snapshot.</p>
                                            <div className="flex gap-2">
                                                <Input placeholder="Naam (optioneel)" value={backupName} onChange={(e) => setBackupName(e.target.value)} className="h-7 text-xs" />
                                                <Button size="sm" onClick={handleCreateBackup} disabled={isCreatingBackup} className="h-7 text-xs px-3">{isCreatingBackup ? '...' : 'Maak'}</Button>
                                            </div>
                                        </div>

                                        <div className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-orange-300 transition-colors group">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="p-2 bg-orange-50 text-orange-600 rounded-lg group-hover:bg-orange-600 group-hover:text-white transition-colors">
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                                </div>
                                            </div>
                                            <h3 className="font-bold text-gray-900 text-sm">Uploaden</h3>
                                            <p className="text-xs text-gray-500 mb-3">Herstel vanuit .zip bestand.</p>
                                            <div className="relative">
                                                <input type="file" id="backup-upload-grid" className="hidden" accept=".zip" onChange={handleUploadBackup} disabled={isUploadingBackup} />
                                                <Button size="sm" variant="outline" onClick={() => document.getElementById('backup-upload-grid')?.click()} disabled={isUploadingBackup} className="w-full h-7 text-xs">{isUploadingBackup ? 'Bezig...' : 'Selecteer Bestand'}</Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    {/* 3. HISTORY */}
                                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
                                        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                                            <h3 className="font-bold text-gray-900 text-sm">Recente Backups</h3>
                                            <Button variant="ghost" size="sm" onClick={loadBackups} className="h-6 w-6 p-0"><svg className={`w-4 h-4 ${isLoadingBackups ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></Button>
                                        </div>
                                        <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto">
                                            {backups.length === 0 ? (
                                                <div className="p-8 text-center text-gray-400 text-xs">Geen backups gevonden.</div>
                                            ) : (
                                                backups.map((backup) => (
                                                    <div key={backup.key} className="p-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
                                                        <div>
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <p className="font-medium text-gray-900 text-xs">{backup.key}</p>
                                                                <div className="flex gap-1">
                                                                    <span className="px-1 py-0.5 bg-gray-100 text-gray-600 text-[9px] rounded border border-gray-200">Lokaal</span>
                                                                    {cloudSyncStatus?.configured && (
                                                                        <span
                                                                            title={isVerifying ? "Verifiëren..." : (verificationMap[backup.key] ? "Geverifieerd op Cloud" : "Niet gevonden op Cloud")}
                                                                            className={`px-1 py-0.5 text-[9px] rounded border flex items-center gap-0.5 ${isVerifying
                                                                                ? 'bg-gray-100 text-gray-500 border-gray-200'
                                                                                : verificationMap[backup.key]
                                                                                    ? 'bg-green-50 text-green-600 border-green-100'
                                                                                    : 'bg-red-50 text-red-600 border-red-100 font-bold'
                                                                                }`}
                                                                        >
                                                                            {isVerifying ? (
                                                                                <svg className="animate-spin w-2 h-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                                                            ) : verificationMap[backup.key] ? (
                                                                                <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                                                                            ) : (
                                                                                <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
                                                                            )}
                                                                            Cloud
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <p className="text-[10px] text-gray-500 mt-0.5">{formatBytes(backup.size)} • {new Date(backup.modified).toLocaleString('nl-NL')}</p>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <button onClick={() => handleDownloadBackup(backup.key)} className="p-1.5 text-blue-600 hover:bg-blue-100 rounded" title="Download"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg></button>
                                                            <button onClick={() => handleRestoreBackup(backup.key)} disabled={isRestoring} className={`p-1.5 text-orange-600 hover:bg-orange-100 rounded ${isRestoring ? 'opacity-50 cursor-not-allowed' : ''}`} title="Restore"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg></button>
                                                            <button onClick={() => handleDeleteBackup(backup.key)} className="p-1.5 text-red-600 hover:bg-red-100 rounded" title="Verwijder"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                                                        </div>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>


                    )}
                </TabsContent>
            </Tabs>
        </div >
    );
}
