import { useState, useEffect, useCallback } from 'react';
import { pb } from './AuthContext';
import { useTheme } from './ThemeProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { PageHeader } from './PageHeader';
import { toast } from 'sonner';
import { Check, Palette, Save } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AppThemeRecord {
    id: string;
    theme_name: string;
    is_active: boolean;
    primary_color: string;
    background_color: string;
    text_color: string;
    border_radius: string;
}


// ─── Helpers ──────────────────────────────────────────────────────────────────

function ColorSwatch({ color, label }: { color: string; label: string }) {
    return (
        <div className="flex flex-col items-center gap-1">
            <div
                className="w-6 h-6 rounded-md border border-gray-200 shadow-sm"
                style={{ backgroundColor: color }}
                title={`${label}: ${color}`}
            />
            <span className="text-[10px] text-gray-400 font-mono leading-none">{color}</span>
        </div>
    );
}

function ColorInputField({
    id,
    label,
    value,
    onChange,
}: {
    id: string;
    label: string;
    value: string;
    onChange: (v: string) => void;
}) {
    return (
        <div className="grid gap-1.5">
            <Label htmlFor={id} className="text-xs font-medium text-gray-600">{label}</Label>
            <div className="flex items-center gap-2">
                <input
                    id={id}
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-9 h-9 rounded-md cursor-pointer border border-gray-200 p-0.5 flex-shrink-0"
                />
                <Input
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder="#000000"
                    className="font-mono text-sm h-9"
                />
            </div>
        </div>
    );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ThemeManagement() {
    const { refreshTheme } = useTheme();

    const [themes, setThemes] = useState<AppThemeRecord[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isActivating, setIsActivating] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);


    // Form state
    const [formName, setFormName] = useState('');
    const [formPrimary, setFormPrimary] = useState('#2563eb');
    const [formBackground, setFormBackground] = useState('#ffffff');
    const [formText, setFormText] = useState('#0f172a');
    const [formRadius, setFormRadius] = useState('0.5rem');
    const [editingId, setEditingId] = useState<string | null>(null);

    // ── Fetch ──────────────────────────────────────────────────────────────────

    const fetchThemes = useCallback(async () => {
        try {
            setIsLoading(true);
            const records = await pb
                .collection('app_themes')
                .getFullList({ sort: 'theme_name' });
            setThemes(
                records.map((r: any) => ({
                    id: r.id,
                    theme_name: r.theme_name,
                    is_active: r.is_active === true,
                    primary_color: r.primary_color || '#2563eb',
                    background_color: r.background_color || '#ffffff',
                    text_color: r.text_color || '#0f172a',
                    border_radius: r.border_radius || '0.5rem',
                })),
            );
        } catch (e) {
            console.error('[ThemeManagement] fetch failed', e);
            toast.error("Thema's konden niet worden geladen");
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchThemes();
        pb.collection('app_themes').subscribe('*', () => fetchThemes());
        return () => {
            pb.collection('app_themes').unsubscribe('*').catch(() => { });
        };
    }, [fetchThemes]);


    // ── Load saved theme into form ─────────────────────────────────────────────

    const loadThemeIntoForm = (theme: AppThemeRecord) => {
        setFormName(theme.theme_name);
        setFormPrimary(theme.primary_color);
        setFormBackground(theme.background_color);
        setFormText(theme.text_color);
        setFormRadius(theme.border_radius);
        setEditingId(theme.id);
    };

    const resetForm = () => {
        setFormName('');
        setFormPrimary('#2563eb');
        setFormBackground('#ffffff');
        setFormText('#0f172a');
        setFormRadius('0.5rem');
        setEditingId(null);
    };

    // ── Save custom theme ──────────────────────────────────────────────────────

    const handleSave = async () => {
        if (!formName.trim()) {
            toast.error('Geef een naam op voor het thema');
            return;
        }
        try {
            setIsSaving(true);
            const data = {
                theme_name: formName.trim(),
                primary_color: formPrimary,
                background_color: formBackground,
                text_color: formText,
                border_radius: formRadius,
            };
            if (editingId) {
                await pb.collection('app_themes').update(editingId, data);
                toast.success(`Thema "${formName}" bijgewerkt`);
                // If this was active, push new colours live
                const wasActive = themes.find(t => t.id === editingId)?.is_active;
                if (wasActive) refreshTheme();
            } else {
                await pb.collection('app_themes').create({ ...data, is_active: false });
                toast.success(`Thema "${formName}" opgeslagen`);
            }
            resetForm();
            await fetchThemes();
        } catch (e: any) {
            toast.error(`Opslaan mislukt: ${e.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    // ── Activate ───────────────────────────────────────────────────────────────

    const handleActivate = async (target: AppThemeRecord) => {
        if (target.is_active) return;
        try {
            setIsActivating(target.id);
            await Promise.all(
                themes
                    .filter(t => t.is_active)
                    .map(t => pb.collection('app_themes').update(t.id, { is_active: false })),
            );
            await pb.collection('app_themes').update(target.id, { is_active: true });
            await fetchThemes();
            refreshTheme();
            toast.success(`Thema "${target.theme_name}" is nu actief`);
        } catch (e: any) {
            toast.error(`Activeren mislukt: ${e.message}`);
        } finally {
            setIsActivating(null);
        }
    };

    // ── Render ─────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6 w-full">
            <PageHeader
                title="Thema Beheer"
                description="Pas het kleurthema van de applicatie aan"
                icon={Palette}
                className="mb-6"
            />

            <div className="grid grid-cols-2 gap-8 items-start">
                {/* ── 1. Custom / Edit form ─────────────────────────────────────── */}
                <Card>
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle className="text-base">
                                    {editingId ? 'Thema Bewerken' : 'Nieuw Aangepast Thema'}
                                </CardTitle>
                                <CardDescription className="text-xs mt-0.5">
                                    {editingId
                                        ? 'Pas de waarden aan en klik op Opslaan.'
                                        : 'Vul kleuren in en sla op als nieuw thema.'}
                                </CardDescription>
                            </div>
                            {editingId && (
                                <Button variant="ghost" size="sm" onClick={resetForm} className="text-xs text-gray-500">
                                    Nieuw thema
                                </Button>
                            )}
                        </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {/* Name */}
                        <div className="grid gap-1.5">
                            <Label htmlFor="themeName" className="text-xs font-medium text-gray-600">
                                Themanaam *
                            </Label>
                            <Input
                                id="themeName"
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                placeholder="bijv. Donker, Zomer, Bedrijf…"
                                className="h-9"
                            />
                        </div>

                        {/* Color fields */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <ColorInputField
                                id="primaryColor"
                                label="Primaire kleur"
                                value={formPrimary}
                                onChange={setFormPrimary}
                            />
                            <ColorInputField
                                id="backgroundColor"
                                label="Achtergrondkleur"
                                value={formBackground}
                                onChange={setFormBackground}
                            />
                            <ColorInputField
                                id="textColor"
                                label="Tekstkleur"
                                value={formText}
                                onChange={setFormText}
                            />
                            <div className="grid gap-1.5">
                                <Label htmlFor="borderRadius" className="text-xs font-medium text-gray-600">
                                    Afronding (radius)
                                </Label>
                                <Input
                                    id="borderRadius"
                                    value={formRadius}
                                    onChange={(e) => setFormRadius(e.target.value)}
                                    placeholder="bijv. 0.5rem, 8px..."
                                    className="h-9 font-mono text-sm"
                                />
                            </div>
                        </div>

                        {/* Live preview */}
                        <div
                            className="border p-4 flex items-center justify-between transition-all"
                            style={{
                                backgroundColor: formBackground,
                                color: formText,
                                borderColor: formPrimary,
                                borderRadius: formRadius,
                            }}
                        >
                            <div>
                                <p className="text-sm font-bold">T'HOOFT OMNI</p>
                                <p className="text-xs opacity-60 mt-0.5">Live preview</p>
                            </div>
                            <div
                                className="px-4 py-2 text-sm font-medium text-white shadow-sm hover:opacity-90 transition-opacity"
                                style={{
                                    backgroundColor: formPrimary,
                                    borderRadius: formRadius,
                                }}
                            >
                                Voorbeeld Knop
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button onClick={handleSave} disabled={isSaving} className="gap-2">
                                <Save className="w-4 h-4" />
                                {isSaving ? 'Opslaan…' : editingId ? 'Bijwerken' : 'Opslaan als nieuw thema'}
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* ── 2. Saved themes list ──────────────────────────────────────── */}
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-base text-gray-900 flex items-center gap-2">
                            <Palette className="w-4 h-4 text-blue-600" />
                            Opgeslagen Thema's
                        </CardTitle>
                        <CardDescription className="text-xs">
                            Stel een thema in als actief om de kleuren in de app toe te passen.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        {isLoading ? (
                            <div className="py-10 text-center text-sm text-gray-400">Laden…</div>
                        ) : themes.length === 0 ? (
                            <div className="py-10 text-center text-sm text-gray-500">
                                Nog geen thema's opgeslagen.
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-100">
                                {themes.map((theme) => (
                                    <div
                                        key={theme.id}
                                        className={`flex items-center gap-4 px-6 py-3 transition-colors ${theme.is_active ? 'bg-blue-50/50' : 'hover:bg-gray-50/60'
                                            }`}
                                    >
                                        {/* Color squares */}
                                        <div className="flex items-center gap-1.5 flex-shrink-0">
                                            <ColorSwatch color={theme.primary_color} label="Primair" />
                                            <ColorSwatch color={theme.background_color} label="Achtergrond" />
                                            <ColorSwatch color={theme.text_color} label="Tekst" />
                                        </div>

                                        <Separator orientation="vertical" className="h-8" />

                                        {/* Name + badge */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-medium text-gray-900 truncate">
                                                    {theme.theme_name}
                                                </span>
                                                {theme.is_active && (
                                                    <Badge className="bg-green-100 text-green-800 border border-green-200 text-[10px] gap-1 px-1.5 py-0">
                                                        <Check className="w-2.5 h-2.5" />
                                                        Actief
                                                    </Badge>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-gray-400 font-mono mt-0.5 space-x-1.5">
                                                <span>{theme.primary_color}</span>
                                                <span className="text-gray-300">·</span>
                                                <span>{theme.background_color}</span>
                                                <span className="text-gray-300">·</span>
                                                <span>{theme.text_color}</span>
                                                <span className="text-gray-300">·</span>
                                                <span title="Border Radius">{theme.border_radius}</span>
                                            </p>
                                        </div>

                                        {/* Mini preview */}
                                        <div
                                            className="hidden sm:flex items-center justify-center w-20 h-7 border text-[10px] font-semibold flex-shrink-0"
                                            style={{
                                                backgroundColor: theme.background_color,
                                                color: theme.text_color,
                                                borderColor: theme.primary_color,
                                                borderRadius: theme.border_radius,
                                            }}
                                        >
                                            <span style={{ color: theme.primary_color }}>Aa</span>&nbsp;Omni
                                        </div>

                                        {/* Actions */}
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="text-xs text-gray-500 h-7 px-2"
                                                onClick={() => loadThemeIntoForm(theme)}
                                            >
                                                Bewerken
                                            </Button>
                                            {!theme.is_active && (
                                                <Button
                                                    size="sm"
                                                    variant="outline"
                                                    className="text-xs gap-1 h-7"
                                                    disabled={isActivating === theme.id}
                                                    onClick={() => handleActivate(theme)}
                                                >
                                                    <Check className="w-3 h-3" />
                                                    Stel in als actief
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
