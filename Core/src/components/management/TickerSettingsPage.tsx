import { useState } from 'react';
import {
  loadTickerSettings,
  saveTickerSettings,
  pushActivityEvent,
  type TickerSettings,
} from '../../hooks/useActivityFeed';
import { Slider } from '../ui/slider';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Activity, Send } from 'lucide-react';

export function TickerSettingsPage() {
  const [settings, setSettings] = useState<TickerSettings>(loadTickerSettings);

  const update = (patch: Partial<TickerSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveTickerSettings(next);
  };

  const sendTestEvent = (type: 'task' | 'auto' | 'error') => {
    const messages: Record<string, string> = {
      task: 'Test: Taak bijgewerkt op Lithoman',
      auto: 'Test: Auto-rapport gegenereerd',
      error: 'Test: Fout bij synchronisatie',
    };
    pushActivityEvent({ type, message: messages[type] });
  };

  return (
    <div className="pt-8 space-y-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-blue-50 rounded-lg">
          <Activity className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Activiteit Ticker</h2>
          <p className="text-sm text-slate-500">Configureer de activiteitenbalk in de header</p>
        </div>
      </div>

      {/* Settings grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Font size */}
        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-slate-700">Lettergrootte</Label>
            <span className="text-xs font-mono text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-100">{settings.fontSize}px</span>
          </div>
          <Slider
            min={8} max={14} step={1}
            value={[settings.fontSize]}
            onValueChange={([v]) => update({ fontSize: v })}
          />
          <p className="text-[10px] text-slate-400">Grootte van de tekst in de ticker (8–14px)</p>
        </div>

        {/* Max width */}
        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-slate-700">Max breedte</Label>
            <span className="text-xs font-mono text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-100">{settings.maxWidth}px</span>
          </div>
          <Slider
            min={150} max={500} step={10}
            value={[settings.maxWidth]}
            onValueChange={([v]) => update({ maxWidth: v })}
          />
          <p className="text-[10px] text-slate-400">Maximale breedte van de ticker in pixels</p>
        </div>

        {/* Cycle duration */}
        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-slate-700">Wisseltijd</Label>
            <span className="text-xs font-mono text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-100">{settings.cycleDuration}s</span>
          </div>
          <Slider
            min={2} max={15} step={1}
            value={[settings.cycleDuration]}
            onValueChange={([v]) => update({ cycleDuration: v })}
          />
          <p className="text-[10px] text-slate-400">Seconden tussen het wisselen van events</p>
        </div>

        {/* Max events */}
        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-slate-700">Max events</Label>
            <span className="text-xs font-mono text-slate-400 bg-white px-2 py-0.5 rounded-md border border-slate-100">{settings.maxEvents}</span>
          </div>
          <Slider
            min={3} max={20} step={1}
            value={[settings.maxEvents]}
            onValueChange={([v]) => update({ maxEvents: v })}
          />
          <p className="text-[10px] text-slate-400">Aantal events in het geheugen</p>
        </div>

        {/* Sticky errors */}
        <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between sm:col-span-2">
          <div>
            <Label className="text-sm font-medium text-slate-700">Fouten vastzetten</Label>
            <p className="text-[10px] text-slate-400 mt-0.5">Pauzeer het wisselen als het huidige event een foutmelding is</p>
          </div>
          <Switch
            checked={settings.stickyErrors}
            onCheckedChange={(v) => update({ stickyErrors: v })}
          />
        </div>
      </div>

      {/* Test events */}
      <div className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3">
        <Label className="text-sm font-medium text-slate-700">Test Events</Label>
        <p className="text-[10px] text-slate-400">Stuur een test event naar de ticker om de instellingen te controleren</p>
        <div className="flex gap-2 pt-1">
          <Button size="sm" variant="outline" onClick={() => sendTestEvent('task')} className="gap-1.5 text-xs">
            <Send className="w-3 h-3" /> Taak
          </Button>
          <Button size="sm" variant="outline" onClick={() => sendTestEvent('auto')} className="gap-1.5 text-xs">
            <Send className="w-3 h-3" /> Automatisch
          </Button>
          <Button size="sm" variant="outline" onClick={() => sendTestEvent('error')} className="gap-1.5 text-xs text-red-600 border-red-200 hover:bg-red-50">
            <Send className="w-3 h-3" /> Fout
          </Button>
        </div>
      </div>
    </div>
  );
}
