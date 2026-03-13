import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Card } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Separator } from '../ui/separator';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { PageHeader } from '../layout/PageHeader';
import { EmailTemplateEditor } from '../EmailTemplateEditor';
import { pb, useAuth } from '../AuthContext';
import { toast } from 'sonner';
import {
    Bell, Mail, Send, Smartphone, Server, Save, Loader2, AtSign, Lock, User, Globe, Hash, ChevronLeft, Settings
} from 'lucide-react';

interface SmtpConfig {
    senderName: string;
    senderAddress: string;
    host: string;
    port: string;
    username: string;
    password: string;
}

export function NotificationManagement() {
    const { hasPermission } = useAuth();
    // ── Tab State ─────────────────────────────────────────────────────────────

    if (!hasPermission('manage_notifications')) {
        return <div className="p-8 text-center text-gray-500 text-sm italic">Geen toegang tot notificatie beheer.</div>;
    }
    const [activeTab, setActiveTab] = useState('email');

    // ── SMTP Config State ─────────────────────────────────────────────────────
    const [smtpConfig, setSmtpConfig] = useState<SmtpConfig>({
        senderName: 'Thooft Omni',
        senderAddress: '',
        host: '',
        port: '587',
        username: '',
        password: '',
    });
    const [isSavingSmtp, setIsSavingSmtp] = useState(false);
    const [isLoadingConfig, setIsLoadingConfig] = useState(false);

    const fetchConfig = useCallback(async () => {
        setIsLoadingConfig(true);
        try {
            const config = await pb.send('/api/mail/config', { method: 'GET' });
            if (config) {
                setSmtpConfig({
                    senderName: config.senderName || 'Thooft Omni',
                    senderAddress: config.senderAddress || '',
                    host: config.host || '',
                    port: config.port || '587',
                    username: config.username || '',
                    password: config.password || '',
                });
            }
        } catch (err) {
            console.error('Failed to fetch SMTP config:', err);
        } finally {
            setIsLoadingConfig(false);
        }
    }, []);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    // ── Test Email State ──────────────────────────────────────────────────────
    const [testEmail, setTestEmail] = useState('');
    const [isSendingTest, setIsSendingTest] = useState(false);
    const [showAltEmail, setShowAltEmail] = useState(false);

    // ── Validation ────────────────────────────────────────────────────────────
    const isEmailConfigIncomplete = !smtpConfig.host || !smtpConfig.port || !smtpConfig.username || !smtpConfig.password;
    const needsAttention = activeTab === 'email' ? isEmailConfigIncomplete : false;

    // ── SMTP Helpers ──────────────────────────────────────────────────────────
    const updateSmtp = (key: keyof SmtpConfig, value: string) => {
        setSmtpConfig((prev) => ({ ...prev, [key]: value }));
    };

    const handleSaveSmtp = async () => {
        if (!smtpConfig.host || !smtpConfig.port) {
            toast.error('Host en poort zijn verplicht.');
            return;
        }
        setIsSavingSmtp(true);
        try {
            await pb.send('/api/mail/config', {
                method: 'POST',
                body: JSON.stringify(smtpConfig),
                headers: { 'Content-Type': 'application/json' },
            });
            toast.success('SMTP instellingen opgeslagen!');
        } catch (err: any) {
            const msg = err?.data?.message || err?.message || 'Opslaan mislukt.';
            toast.error(msg);
        } finally {
            setIsSavingSmtp(false);
        }
    };

    const handleSendTestEmail = async () => {
        const recipient = showAltEmail && testEmail.trim()
            ? testEmail.trim()
            : smtpConfig.senderAddress || smtpConfig.username;

        if (!recipient) {
            toast.error('Vul eerst een afzenderadres of alternatief e-mailadres in.');
            return;
        }
        setIsSendingTest(true);
        try {
            await pb.send('/api/mail/test', {
                method: 'POST',
                body: JSON.stringify({ to_email: recipient }),
                headers: { 'Content-Type': 'application/json' },
            });
            toast.success('Test e-mail succesvol verstuurd!');
        } catch (err: any) {
            const msg = err?.data?.message || err?.message || 'Verzenden mislukt.';
            toast.error(msg);
        } finally {
            setIsSendingTest(false);
        }
    };

    // ── Config chip label ─────────────────────────────────────────────────────
    const configLabel = activeTab === 'email' ? 'E-mail Config' : 'Push Config';

    return (
        <div className="space-y-6 w-full">
            <PageHeader
                title="Notificatie Beheer"
                description="Beheer e-mail templates, SMTP-instellingen en notificaties"
                icon={Bell}
                iconColor="text-amber-600"
                iconBgColor="bg-amber-100"
                className="mb-6"
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                {/* ── Tab bar + Config chip ─────────────────────────────── */}
                <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                    <TabsList>
                        <TabsTrigger value="email" className="gap-2">
                            <Mail className="w-4 h-4" />
                            E-mail
                        </TabsTrigger>
                        <TabsTrigger value="push" className="gap-2" disabled>
                            <Smartphone className="w-4 h-4" />
                            Push (Binnenkort)
                        </TabsTrigger>
                    </TabsList>

                    <Dialog>
                        <DialogTrigger asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className={`rounded-full px-4 h-9 gap-2 transition-all duration-300 ${needsAttention
                                    ? 'border-amber-400 text-amber-600 animate-pulse'
                                    : ''
                                    }`}
                                style={needsAttention ? { boxShadow: '0 0 12px rgba(251,191,36,0.6)' } : {}}
                            >
                                <Settings className="w-4 h-4" />
                                {configLabel}
                            </Button>
                        </DialogTrigger>

                        <DialogContent className="sm:max-w-[800px] w-[35vw]">
                            {activeTab === 'email' ? (
                                <>
                                    <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2">
                                            <Server className="w-5 h-5 text-amber-600" />
                                            SMTP Configuratie
                                        </DialogTitle>
                                        <DialogDescription>
                                            Configureer de uitgaande mailserver voor notificaties.
                                        </DialogDescription>
                                    </DialogHeader>

                                    <div className="space-y-4 pt-2">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="grid gap-1.5">
                                                <Label htmlFor="smtp-senderName" className="text-xs font-medium text-gray-600 flex items-center gap-1.5">
                                                    <User className="w-3 h-3" /> Afzendernaam
                                                    {isLoadingConfig && <Loader2 className="w-3 h-3 animate-spin ml-2" />}
                                                </Label>
                                                <Input id="smtp-senderName" value={smtpConfig.senderName} onChange={(e) => updateSmtp('senderName', e.target.value)} placeholder="Thooft Omni" className="h-9" disabled={isLoadingConfig} />
                                            </div>
                                            <div className="grid gap-1.5">
                                                <Label htmlFor="smtp-senderAddress" className="text-xs font-medium text-gray-600 flex items-center gap-1.5"><AtSign className="w-3 h-3" /> Afzenderadres</Label>
                                                <Input id="smtp-senderAddress" value={smtpConfig.senderAddress} onChange={(e) => updateSmtp('senderAddress', e.target.value)} placeholder="noreply@thooft.be" className="h-9" />
                                            </div>
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="grid gap-1.5">
                                                <Label htmlFor="smtp-username" className="text-xs font-medium text-gray-600 flex items-center gap-1.5"><User className="w-3 h-3" /> Gebruikersnaam</Label>
                                                <Input id="smtp-username" value={smtpConfig.username} onChange={(e) => updateSmtp('username', e.target.value)} placeholder="user@gmail.com" className="h-9" />
                                            </div>
                                            <div className="grid gap-1.5">
                                                <Label htmlFor="smtp-password" className="text-xs font-medium text-gray-600 flex items-center gap-1.5"><Lock className="w-3 h-3" /> Wachtwoord</Label>
                                                <Input id="smtp-password" type="password" value={smtpConfig.password} onChange={(e) => updateSmtp('password', e.target.value)} placeholder="••••••••" className="h-9" />
                                            </div>
                                        </div>

                                        <Separator />

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                            <div className="grid gap-1.5 sm:col-span-2">
                                                <Label htmlFor="smtp-host" className="text-xs font-medium text-gray-600 flex items-center gap-1.5"><Globe className="w-3 h-3" /> SMTP Host</Label>
                                                <Input id="smtp-host" value={smtpConfig.host} onChange={(e) => updateSmtp('host', e.target.value)} placeholder="smtp.gmail.com" className="h-9 font-mono text-sm" />
                                            </div>
                                            <div className="grid gap-1.5">
                                                <Label htmlFor="smtp-port" className="text-xs font-medium text-gray-600 flex items-center gap-1.5"><Hash className="w-3 h-3" /> Poort</Label>
                                                <Input id="smtp-port" value={smtpConfig.port} onChange={(e) => updateSmtp('port', e.target.value)} placeholder="587" className="h-9 font-mono text-sm" />
                                            </div>
                                        </div>

                                        {/* Actie knoppen */}
                                        <div className="flex flex-wrap items-center justify-end gap-3 pt-2">
                                            <div className="flex items-center gap-2">
                                                <div className={`flex items-center overflow-hidden transition-all duration-300 ease-in-out ${showAltEmail ? 'max-w-[240px] opacity-100' : 'max-w-0 opacity-0'}`}>
                                                    <Input type="email" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} placeholder="alternatief@voorbeeld.be" className="h-9 text-xs w-[220px]" />
                                                </div>
                                                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 flex-shrink-0" onClick={() => setShowAltEmail((v) => !v)} title="Alternatief e-mailadres opgeven">
                                                    <ChevronLeft className={`w-4 h-4 transition-transform duration-300 ${showAltEmail ? 'rotate-180' : ''}`} />
                                                </Button>
                                            </div>

                                            <Button variant="outline" onClick={handleSendTestEmail} disabled={isSendingTest} className="gap-2 h-9" size="sm">
                                                {isSendingTest ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                                                {isSendingTest ? 'Versturen…' : 'Test Mail'}
                                            </Button>

                                            <Button onClick={handleSaveSmtp} disabled={isSavingSmtp} className="gap-2 h-9" size="sm">
                                                {isSavingSmtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                                {isSavingSmtp ? 'Opslaan…' : 'Instellingen Opslaan'}
                                            </Button>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <DialogHeader>
                                        <DialogTitle className="flex items-center gap-2">
                                            <Smartphone className="w-5 h-5 text-amber-600" />
                                            Push Configuratie
                                        </DialogTitle>
                                        <DialogDescription>
                                            Firebase / WebPush configuratie wordt hier later toegevoegd.
                                        </DialogDescription>
                                    </DialogHeader>
                                    <div className="py-8 text-center">
                                        <div className="p-3 rounded-2xl bg-gray-100 inline-block mb-4">
                                            <Smartphone className="w-6 h-6 text-gray-400" />
                                        </div>
                                        <p className="text-sm text-gray-500">Push notificatie-instellingen worden in een toekomstige versie beschikbaar gesteld.</p>
                                        <Badge variant="outline" className="mt-3 text-xs text-gray-500 border-gray-300">Binnenkort beschikbaar</Badge>
                                    </div>
                                </>
                            )}
                        </DialogContent>
                    </Dialog>
                </div>

                {/* ── E-mail Tab ─────────────────────────────────────────── */}
                <TabsContent value="email" className="mt-0">
                    <EmailTemplateEditor />
                </TabsContent>

                {/* ── Push Tab (Placeholder) ─────────────────────────────── */}
                <TabsContent value="push" className="mt-0">
                    <Card className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="p-4 rounded-2xl bg-gray-100 mb-6">
                            <Smartphone className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-700">Push Notificaties</h3>
                        <p className="text-sm text-gray-500 mt-2 max-w-md">Worden in een toekomstige versie beschikbaar gesteld.</p>
                        <Badge variant="outline" className="mt-4 text-xs text-gray-500 border-gray-300">Binnenkort beschikbaar</Badge>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}