import { useState, useEffect, useRef } from 'react';
import EmailEditor, { EditorRef, EmailEditorProps } from 'react-email-editor';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { pb } from './AuthContext';
import { toast } from 'sonner';
import { Save, Loader2, FileText, RefreshCw, Paintbrush } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface EmailTemplate {
    id: string;
    name: string;
    subject: string;
    design: any;
    html_content: string;
}

interface FormData {
    name: string;
    subject: string;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export function EmailTemplateEditor() {
    const editorRef = useRef<EditorRef>(null);

    const [templates, setTemplates] = useState<EmailTemplate[]>([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
    const [formData, setFormData] = useState<FormData>({ name: '', subject: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [editorReady, setEditorReady] = useState(false);

    // ── Fetch templates ───────────────────────────────────────────────────────
    const fetchTemplates = async () => {
        setIsLoading(true);
        try {
            const records = await pb.collection('email_templates').getFullList<EmailTemplate>({
                sort: 'name',
            });
            setTemplates(records);
            if (records.length > 0 && !selectedTemplateId) {
                setSelectedTemplateId(records[0].id);
                setFormData({ name: records[0].name, subject: records[0].subject });
                // Load design if editor is already ready
                if (editorReady && records[0].design) {
                    editorRef.current?.editor?.loadDesign(records[0].design);
                }
            }
        } catch (err) {
            console.error('[EmailTemplateEditor] Failed to fetch templates', err);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTemplates();
    }, []);

    // ── Editor ready callback ─────────────────────────────────────────────────
    const handleEditorReady: EmailEditorProps['onReady'] = () => {
        setEditorReady(true);
        // If a template is already selected, load its design
        const tpl = templates.find((t) => t.id === selectedTemplateId);
        if (tpl?.design) {
            editorRef.current?.editor?.loadDesign(tpl.design);
        }
    };

    // ── Select template ───────────────────────────────────────────────────────
    const handleSelectTemplate = (id: string) => {
        setSelectedTemplateId(id);
        const tpl = templates.find((t) => t.id === id);
        if (tpl) {
            setFormData({ name: tpl.name, subject: tpl.subject });
            if (editorReady && tpl.design) {
                editorRef.current?.editor?.loadDesign(tpl.design);
            }
        }
    };

    // ── Save template ─────────────────────────────────────────────────────────
    const handleSaveTemplate = () => {
        if (!selectedTemplateId) {
            toast.error('Selecteer eerst een template.');
            return;
        }
        if (!editorRef.current?.editor) {
            toast.error('Editor is nog niet geladen.');
            return;
        }

        setIsSaving(true);

        editorRef.current.editor.exportHtml((data: { design: any; html: string }) => {
            (async () => {
                try {
                    await pb.collection('email_templates').update(selectedTemplateId, {
                        name: formData.name,
                        subject: formData.subject,
                        design: data.design,
                        html_content: data.html,
                    });

                    // Update local list
                    setTemplates((prev) =>
                        prev.map((t) =>
                            t.id === selectedTemplateId
                                ? { ...t, name: formData.name, subject: formData.subject, design: data.design, html_content: data.html }
                                : t,
                        ),
                    );

                    toast.success('Template opgeslagen!');
                } catch (err: any) {
                    const msg = err?.data?.message || err?.message || 'Opslaan mislukt.';
                    toast.error(msg);
                } finally {
                    setIsSaving(false);
                }
            })();
        });
    };

    // ── Render ────────────────────────────────────────────────────────────────
    const selectedTemplate = templates.find((t) => t.id === selectedTemplateId);

    return (
        <div className="space-y-6 w-full">
            {/* ── Top: Settings Card ─────────────────────────────────────── */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <FileText className="w-4 h-4 text-amber-600" />
                        Template Bewerken
                    </CardTitle>
                    <CardDescription className="text-xs">
                        Kies een template, bewerk de inhoud in de drag-and-drop editor en sla op.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                        {/* Template selector */}
                        <div style={{ minWidth: '220px', flex: '0 0 auto' }}>
                            <Label className="text-xs font-medium text-gray-600 mb-1.5 block">Template</Label>
                            <div className="flex items-center gap-2">
                                <Select value={selectedTemplateId} onValueChange={handleSelectTemplate}>
                                    <SelectTrigger className="h-9">
                                        <SelectValue placeholder={isLoading ? 'Laden…' : 'Selecteer template'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {templates.map((tpl) => (
                                            <SelectItem key={tpl.id} value={tpl.id}>
                                                {tpl.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <Button variant="ghost" size="sm" className="h-9 w-9 p-0 flex-shrink-0" onClick={fetchTemplates} title="Vernieuwen">
                                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                                </Button>
                            </div>
                        </div>

                        {/* Name */}
                        <div style={{ flex: 1, minWidth: '180px' }}>
                            <Label htmlFor="tpl-name" className="text-xs font-medium text-gray-600 mb-1.5 block">Naam</Label>
                            <Input
                                id="tpl-name"
                                value={formData.name}
                                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                                placeholder="Template naam"
                                className="h-9"
                            />
                        </div>

                        {/* Subject */}
                        <div style={{ flex: 1, minWidth: '220px' }}>
                            <Label htmlFor="tpl-subject" className="text-xs font-medium text-gray-600 mb-1.5 block">Onderwerp</Label>
                            <Input
                                id="tpl-subject"
                                value={formData.subject}
                                onChange={(e) => setFormData((p) => ({ ...p, subject: e.target.value }))}
                                placeholder="Onderwerp van de e-mail"
                                className="h-9"
                            />
                        </div>

                        {/* Save */}
                        <Button onClick={handleSaveTemplate} disabled={isSaving || !selectedTemplateId} className="gap-2 h-9 flex-shrink-0" size="sm">
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            {isSaving ? 'Opslaan…' : 'Template Opslaan'}
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* ── Bottom: Unlayer Editor ─────────────────────────────────── */}
            <Card className="overflow-hidden">
                <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                        <Paintbrush className="w-4 h-4 text-amber-600" />
                        Drag & Drop Editor
                        {selectedTemplate && (
                            <span className="text-xs font-normal text-gray-400 ml-2">— {selectedTemplate.name}</span>
                        )}
                    </CardTitle>
                    {!editorReady && (
                        <CardDescription className="text-xs flex items-center gap-1.5">
                            <Loader2 className="w-3 h-3 animate-spin" /> Editor laden…
                        </CardDescription>
                    )}
                </CardHeader>
                <CardContent className="p-0">
                    <div style={{ minHeight: '800px', width: '100%' }}>
                        <EmailEditor
                            ref={editorRef}
                            onReady={handleEditorReady}
                            minHeight="800px"
                            options={{
                                locale: 'nl-NL',
                                appearance: {
                                    theme: 'modern_light',
                                },
                                features: {
                                    textEditor: {
                                        spellChecker: true,
                                    },
                                },
                            }}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
