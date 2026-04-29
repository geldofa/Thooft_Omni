import { useEffect, useMemo, useRef, useState } from 'react';
import changelog from 'virtual:changelog';
import { PageHeader } from './layout/PageHeader';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { Download, Copy, Newspaper, X, Plus, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { nl } from 'date-fns/locale';

// ─── Types ────────────────────────────────────────────────────────────────────

type ChangelogEntry = {
  id: string;
  version: string | null;
  date: string;
  title: string;
  body: string;
  type: 'feature' | 'bug' | 'chore';
};

type ImageMap = Record<string, string>;

type SectionContent = { title: string; description: string; bullets: string[] };
type ContentMap = Record<string, SectionContent>;

// ─── Static section definitions ───────────────────────────────────────────────

const entries = changelog as ChangelogEntry[];
const featureEntries = entries.filter(e => e.type === 'feature' && e.version);

interface SectionDef {
  key: string;
  badge: string;
  badgeColor: string;
  badgeBg: string;
  defaultContent: SectionContent;
  placeholderLabel: string;
  dividerAfter?: boolean;
}

const SECTIONS: SectionDef[] = [
  {
    key: 'onderhoudstaken',
    badge: 'Onderhoud', badgeColor: '#1d4ed8', badgeBg: '#eff6ff',
    defaultContent: {
      title: 'Onderhoudstaken',
      description: 'Alle geplande onderhoudswerken per pers op één scherm. Kleurcodering toont meteen wat urgent is: rood is te laat, oranje vervalt deze week, geel deze maand.',
      bullets: ['Taken per pers: Lithoman, C818, C80', 'Status op basis van de volgende onderhoudsdatum', 'Opmerkingen en tags per taak', 'Externe taken apart bijgehouden', 'Subtaken voor complexe onderhoudsmomenten'],
    },
    placeholderLabel: '📸 Screenshot: Onderhoudstaken overzicht met kleurcodering',
    dividerAfter: false,
  },
  {
    key: 'checklists',
    badge: 'Onderhoud', badgeColor: '#1d4ed8', badgeBg: '#eff6ff',
    defaultContent: {
      title: 'Digitale Checklists',
      description: 'Geplande onderhoudsmomenten krijgen voortaan een digitale checklist. Je vinkt taken af in de app, ziet de voortgangsbalk oplopen en kunt de lijst ook afprinten.',
      bullets: ['Checklist per pers met begin- en einddatum', 'Voortgangsbalk per checklist', 'Printvriendelijke weergave', 'Archief van afgelopen checklists'],
    },
    placeholderLabel: '📸 Screenshot: Checklist met voortgangsbalk en afgevinkte taken',
    dividerAfter: true,
  },
  {
    key: 'drukwerken',
    badge: 'Productie', badgeColor: '#15803d', badgeBg: '#f0fdf4',
    defaultContent: {
      title: 'Drukwerken',
      description: 'Het centrale punt voor alle drukorders. Van het aanmaken van een nieuw order tot het raadplegen van wat er de voorbije weken gedrukt werd — alles zit hier.',
      bullets: ['Nieuw order aanmaken en bewerken', 'Overzicht gedrukte orders per week / maand', 'Auto-save en automatische vergrendeling van voltooide versies', 'Opmerkingen per order'],
    },
    placeholderLabel: '📸 Screenshot: Drukwerken — lijst van orders met weekindeling',
  },
  {
    key: 'jdf',
    badge: 'Productie · Nieuw', badgeColor: '#15803d', badgeBg: '#f0fdf4',
    defaultContent: {
      title: 'JDF Koppeling & Werkfiches',
      description: 'OMNI leest automatisch de planningsbestanden (JDF) van de Lithoman. Orders worden slim samengevoegd en werkfiche-gegevens automatisch ingevuld bij nieuwe orders.',
      bullets: ['Importeren per groep of per pers', 'Samenvatting van versies per order', 'Aanpasbaar na import — alles wordt herberekend', 'Werkfiche-gegevens automatisch vooringevuld'],
    },
    placeholderLabel: '🎬 Clip: JDF-import flow — van bestand selecteren tot order opslaan',
    dividerAfter: true,
  },
  {
    key: 'overzicht',
    badge: 'Live', badgeColor: '#854d0e', badgeBg: '#fef9c3',
    defaultContent: {
      title: 'Live Overzicht',
      description: 'Een real-time dashboard dat de actuele toestand van elke pers toont. Output, uitval, delta en stilstandtijd worden live bijgewerkt zonder dat je de pagina hoeft te vernieuwen.',
      bullets: ['Live productiecijfers per pers', 'Output, uitval, delta en stilstand', 'Automatische real-time updates'],
    },
    placeholderLabel: '🎬 Clip: Live Overzicht — cijfers die in real-time bijwerken',
    dividerAfter: true,
  },
  {
    key: 'analyses',
    badge: 'Rapportage', badgeColor: '#7e22ce', badgeBg: '#faf5ff',
    defaultContent: {
      title: 'Analyses & Rapporten',
      description: 'Historische data omgezet in bruikbare inzichten. Rapporten kunnen opgeslagen worden als preset en automatisch verstuurd worden per e-mail.',
      bullets: ['Productie-efficiëntie en uitval trends', 'Onderhoudsnaleving per pers', '6 maanden historiek', 'PDF export en auto e-mail distributie'],
    },
    placeholderLabel: '📸 Screenshot: Statistieken grafiek — productietrend over 6 maanden',
  },
];

// ─── Editable text (click to edit inline) ────────────────────────────────────

function Editable({ value, onChange, style, singleLine = false }: {
  value: string;
  onChange: (v: string) => void;
  style?: React.CSSProperties;
  singleLine?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const editing = useRef(false);

  useEffect(() => {
    if (ref.current && !editing.current) {
      ref.current.innerText = value;
    }
  }, [value]);

  return (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      onFocus={() => { editing.current = true; }}
      onBlur={e => { editing.current = false; onChange(e.currentTarget.innerText.trim()); }}
      onKeyDown={singleLine ? e => { if (e.key === 'Enter') { e.preventDefault(); (e.target as HTMLElement).blur(); } } : undefined}
      title="Klik om te bewerken"
      style={{
        outline: 'none',
        cursor: 'text',
        borderRadius: 3,
        transition: 'box-shadow 0.1s',
        ...style,
      }}
      onMouseEnter={e => { e.currentTarget.style.boxShadow = 'inset 0 0 0 1px rgba(59,130,246,0.5)'; }}
      onMouseLeave={e => { e.currentTarget.style.boxShadow = ''; }}
    />
  );
}

// ─── Drop zone for images ─────────────────────────────────────────────────────

function DropZone({ id, label, image, onDrop, onRemove }: {
  id: string;
  label: string;
  image?: string;
  onDrop: (id: string, dataUrl: string) => void;
  onRemove: (id: string) => void;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const readFile = (file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = e => onDrop(id, e.target!.result as string);
    reader.readAsDataURL(file);
  };

  if (image) {
    return (
      <div className="relative group">
        <img src={image} alt={label} style={{ width: '100%', borderRadius: 8, display: 'block' }} />
        <button
          onClick={() => onRemove(id)}
          className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow"
          title="Verwijder afbeelding"
        >
          <X className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) readFile(f); e.target.value = ''; }} />
      <div
        onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={e => { e.preventDefault(); setIsDragOver(false); }}
        onDrop={e => { e.preventDefault(); setIsDragOver(false); const f = e.dataTransfer.files[0]; if (f) readFile(f); }}
        onClick={() => inputRef.current?.click()}
        style={{
          background: isDragOver ? '#eff6ff' : '#f8fafc',
          border: `2px dashed ${isDragOver ? '#3b82f6' : '#cbd5e1'}`,
          borderRadius: 8, padding: '28px 24px', textAlign: 'center',
          cursor: 'pointer', transition: 'all 0.15s',
        }}
      >
        <div style={{ color: isDragOver ? '#2563eb' : '#94a3b8', fontSize: 13, marginBottom: 6 }}>{label}</div>
        <div style={{ color: '#cbd5e1', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <Upload style={{ width: 12, height: 12 }} /> Sleep hier of klik om te bladeren
        </div>
      </div>
    </>
  );
}

// ─── Newsletter section (editable) ───────────────────────────────────────────

function NewsletterSection({ def, content, images, onFieldChange, onBulletChange, onBulletAdd, onBulletRemove, onDrop, onRemove }: {
  def: SectionDef;
  content: SectionContent;
  images: ImageMap;
  onFieldChange: (field: 'title' | 'description', value: string) => void;
  onBulletChange: (index: number, value: string) => void;
  onBulletAdd: () => void;
  onBulletRemove: (index: number) => void;
  onDrop: (id: string, dataUrl: string) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <>
      <div style={{ marginBottom: 40 }}>
        <div style={{
          display: 'inline-block', background: def.badgeBg, color: def.badgeColor,
          fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase',
          padding: '4px 10px', borderRadius: 20, marginBottom: 12,
        }}>{def.badge}</div>

        <Editable
          value={content.title}
          onChange={v => onFieldChange('title', v)}
          singleLine
          style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700, color: '#0f172a' }}
        />

        <Editable
          value={content.description}
          onChange={v => onFieldChange('description', v)}
          style={{ margin: '0 0 16px', fontSize: 14, lineHeight: 1.8, color: '#374151' }}
        />

        {/* Editable bullets */}
        <div style={{ marginBottom: 16 }}>
          {content.bullets.map((bullet, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 6, marginBottom: 4 }}>
              <span style={{ color: '#374151', fontSize: 14, lineHeight: 2, flexShrink: 0 }}>•</span>
              <Editable
                value={bullet}
                onChange={v => onBulletChange(i, v)}
                singleLine
                style={{ flex: 1, fontSize: 14, lineHeight: 2, color: '#374151' }}
              />
              <button
                onClick={() => onBulletRemove(i)}
                title="Verwijder punt"
                style={{ color: '#cbd5e1', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 2px', lineHeight: 2, flexShrink: 0 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ef4444'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#cbd5e1'; }}
              >
                <X style={{ width: 10, height: 10 }} />
              </button>
            </div>
          ))}
          <button
            onClick={onBulletAdd}
            style={{ fontSize: 11, color: '#93c5fd', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 0', display: 'flex', alignItems: 'center', gap: 4 }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#3b82f6'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = '#93c5fd'; }}
          >
            <Plus style={{ width: 10, height: 10 }} /> punt toevoegen
          </button>
        </div>

        <DropZone id={def.key} label={def.placeholderLabel} image={images[def.key]} onDrop={onDrop} onRemove={onRemove} />
      </div>
      {def.dividerAfter && <hr style={{ border: 'none', borderTop: '1px solid #e2e8f0', margin: '0 0 40px' }} />}
    </>
  );
}

// ─── Full newsletter preview ──────────────────────────────────────────────────

function NewsletterPreview({ introText, onIntroChange, selectedIds, contentMap, images, onFieldChange, onBulletChange, onBulletAdd, onBulletRemove, onDrop, onRemove }: {
  introText: string;
  onIntroChange: (v: string) => void;
  selectedIds: Set<string>;
  contentMap: ContentMap;
  images: ImageMap;
  onFieldChange: (key: string, field: 'title' | 'description', value: string) => void;
  onBulletChange: (key: string, index: number, value: string) => void;
  onBulletAdd: (key: string) => void;
  onBulletRemove: (key: string, index: number) => void;
  onDrop: (id: string, dataUrl: string) => void;
  onRemove: (id: string) => void;
}) {
  const selected = featureEntries.filter(e => selectedIds.has(e.id));
  const latestVersion = selected[0]?.version ?? featureEntries[0]?.version ?? '—';
  const latestDate = selected[0]?.date ? format(new Date(selected[0].date), 'd MMMM yyyy', { locale: nl }) : '';

  return (
    <div style={{ background: '#f4f4f5', padding: '32px 0', minHeight: '100%' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', fontFamily: "'Segoe UI', Arial, sans-serif", color: '#1a1a1a' }}>

        {/* Header */}
        <div style={{ background: '#0f172a', borderRadius: '12px 12px 0 0', padding: '48px 40px 36px', textAlign: 'center' }}>
          <div style={{ fontSize: 36, fontWeight: 800, letterSpacing: 4, color: '#ffffff', marginBottom: 6 }}>OMNI</div>
          <div style={{ fontSize: 13, color: '#94a3b8', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 24 }}>Digitale Werkplek</div>
          <div style={{ background: '#1e293b', borderRadius: 8, padding: '20px 24px' }}>
            <Editable
              value={introText}
              onChange={onIntroChange}
              style={{ margin: 0, fontSize: 16, lineHeight: 1.7, color: '#cbd5e1' }}
            />
          </div>
        </div>

        {/* Body */}
        <div style={{ background: '#ffffff', padding: '0 40px' }}>
          <p style={{ margin: '32px 0 8px', fontSize: 13, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1.5, fontWeight: 600 }}>
            Huidige Versie {latestVersion} · {latestDate} (changelog hieronder)
          </p>
          {SECTIONS.map(def => (
            <NewsletterSection
              key={def.key}
              def={def}
              content={contentMap[def.key]}
              images={images}
              onFieldChange={(field, value) => onFieldChange(def.key, field, value)}
              onBulletChange={(i, v) => onBulletChange(def.key, i, v)}
              onBulletAdd={() => onBulletAdd(def.key)}
              onBulletRemove={i => onBulletRemove(def.key, i)}
              onDrop={onDrop}
              onRemove={onRemove}
            />
          ))}

          {/* Changelog */}
          {selected.length > 0 && (
            <div style={{ background: '#0f172a', borderRadius: 10, padding: '28px 28px 20px', marginBottom: 40 }}>
              <div style={{ fontSize: 13, color: '#94a3b8', letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 600, marginBottom: 12 }}>Recentelijk toegevoegd</div>
              <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: '#ffffff' }}>Wat is er nieuw?</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {selected.map(e => (
                  <div key={e.id} style={{ background: '#1e293b', borderRadius: 8, padding: '14px 16px' }}>
                    <div style={{ fontSize: 12, color: '#38bdf8', fontWeight: 700, marginBottom: 4 }}>
                      v{e.version} · {format(new Date(e.date), 'd MMMM yyyy', { locale: nl })}
                    </div>
                    <div style={{ fontSize: 14, color: '#f1f5f9', fontWeight: 600, marginBottom: e.body ? 6 : 0 }}>{e.title}</div>
                    {e.body && e.body.split('\n').filter(l => l.trim()).map((l, i) => (
                      <div key={i} style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.6 }}>{l}</div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Feedback CTA */}
          <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: 24, marginBottom: 40, textAlign: 'center' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#15803d', marginBottom: 8 }}>Idee of opmerking?</div>
            <p style={{ margin: 0, fontSize: 14, color: '#374151', lineHeight: 1.7 }}>
              Via de <strong>Feedback</strong>-pagina in OMNI kun je functieverzoeken indienen of fouten melden.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div style={{ background: '#0f172a', borderRadius: '0 0 12px 12px', padding: '28px 40px', textAlign: 'center' }}>
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: 3, color: '#ffffff', marginBottom: 4 }}>OMNI</div>
          <div style={{ fontSize: 12, color: '#64748b', marginBottom: 16 }}>Versie {latestVersion} · Thooft intern platform</div>
          <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.8 }}>
            Vragen? Neem contact op met de beheerder.<br />
            <span style={{ color: '#64748b' }}>omni@thooft.be</span>
          </div>
        </div>

      </div>
    </div>
  );
}

// ─── HTML export (with embedded images + final content) ───────────────────────

function generateHTML(introText: string, selectedIds: Set<string>, contentMap: ContentMap, images: ImageMap): string {
  const selected = featureEntries.filter(e => selectedIds.has(e.id));
  const latestVersion = selected[0]?.version ?? featureEntries[0]?.version ?? '—';
  const latestDate = selected[0]?.date ? format(new Date(selected[0].date), 'd MMMM yyyy', { locale: nl }) : '';

  const sectionHTML = (def: SectionDef) => {
    const c = contentMap[def.key];
    const img = images[def.key];
    const visual = img
      ? `<img src="${img}" alt="${def.placeholderLabel}" style="width:100%;border-radius:8px;display:block;" />`
      : `<div style="background:#f8fafc;border:2px dashed #cbd5e1;border-radius:8px;padding:40px 24px;text-align:center;color:#94a3b8;font-size:13px;">${def.placeholderLabel}</div>`;

    return `
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:40px;">
        <tr><td>
          <div style="display:inline-block;background:${def.badgeBg};color:${def.badgeColor};font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;padding:4px 10px;border-radius:20px;margin-bottom:12px;">${def.badge}</div>
          <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#0f172a;">${c.title}</h2>
          <p style="margin:0 0 16px;font-size:14px;line-height:1.8;color:#374151;">${c.description}</p>
          <ul style="margin:0 0 16px;padding-left:20px;font-size:14px;line-height:2;color:#374151;">
            ${c.bullets.map(b => `<li>${b}</li>`).join('')}
          </ul>
          ${visual}
        </td></tr>
      </table>
      ${def.dividerAfter ? '<hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 40px;" />' : ''}`;
  };

  const changelogHTML = selected.length > 0 ? `
    <div style="background:#0f172a;border-radius:10px;padding:28px 28px 20px;margin-bottom:40px;">
      <div style="font-size:13px;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;font-weight:600;margin-bottom:12px;">Recentelijk toegevoegd</div>
      <h2 style="margin:0 0 20px;font-size:18px;font-weight:700;color:#ffffff;">Wat is er nieuw?</h2>
      <table width="100%" cellpadding="0" cellspacing="0">
        ${selected.map(e => {
    const dateStr = format(new Date(e.date), 'd MMMM yyyy', { locale: nl });
    const bodyHTML = e.body ? e.body.split('\n').filter(l => l.trim()).map(l => `<div style="font-size:13px;color:#94a3b8;line-height:1.6;">${l}</div>`).join('') : '';
    return `<tr><td style="padding-bottom:14px;"><div style="background:#1e293b;border-radius:8px;padding:14px 16px;">
              <div style="font-size:12px;color:#38bdf8;font-weight:700;margin-bottom:4px;">v${e.version} · ${dateStr}</div>
              <div style="font-size:14px;color:#f1f5f9;font-weight:600;margin-bottom:${bodyHTML ? '6px' : '0'};">${e.title}</div>
              ${bodyHTML}</div></td></tr>`;
  }).join('')}
      </table>
    </div>` : '';

  return `<!DOCTYPE html>
<html lang="nl"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>OMNI — Jouw digitale werkplek</title></head>
<body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Arial,sans-serif;color:#1a1a1a;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:32px 0;">
<tr><td align="center"><table width="640" cellpadding="0" cellspacing="0" style="max-width:640px;width:100%;">
<tr><td style="background:#0f172a;border-radius:12px 12px 0 0;padding:48px 40px 36px;text-align:center;">
  <div style="font-size:36px;font-weight:800;letter-spacing:4px;color:#fff;margin-bottom:6px;">OMNI</div>
  <div style="font-size:13px;color:#94a3b8;letter-spacing:2px;text-transform:uppercase;margin-bottom:24px;">Thooft — Digitale Werkplek</div>
  <div style="background:#1e293b;border-radius:8px;padding:20px 24px;">
    <p style="margin:0;font-size:16px;line-height:1.7;color:#cbd5e1;">${introText.replace(/\n/g, '<br/>')}</p>
  </div>
</td></tr>
<tr><td style="background:#fff;padding:0 40px;">
  <p style="margin:32px 0 8px;font-size:13px;color:#64748b;text-transform:uppercase;letter-spacing:1.5px;font-weight:600;">Versie ${latestVersion} · ${latestDate}</p>
  <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#0f172a;">Wat kan OMNI voor jou doen?</h1>
  <p style="margin:0 0 32px;font-size:15px;line-height:1.8;color:#374151;">Van een onderhoudstaak die te laat dreigt te lopen tot de live productiecijfers van de Lithoman — alles staat in OMNI.</p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:0 0 40px;"/>
  ${SECTIONS.map(sectionHTML).join('')}
  ${changelogHTML}
  <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:24px;margin-bottom:40px;text-align:center;">
    <div style="font-size:16px;font-weight:700;color:#15803d;margin-bottom:8px;">Idee of opmerking?</div>
    <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">Via de <strong>Feedback</strong>-pagina in OMNI kun je functieverzoeken indienen of fouten melden.</p>
  </div>
</td></tr>
<tr><td style="background:#0f172a;border-radius:0 0 12px 12px;padding:28px 40px;text-align:center;">
  <div style="font-size:18px;font-weight:800;letter-spacing:3px;color:#fff;margin-bottom:4px;">OMNI</div>
  <div style="font-size:12px;color:#64748b;margin-bottom:16px;">Versie ${latestVersion} · Thooft intern platform</div>
  <div style="font-size:12px;color:#475569;line-height:1.8;">Vragen? Neem contact op met de beheerder.<br/><span style="color:#64748b;">omni@thooft.be</span></div>
</td></tr>
</table></td></tr></table>
</body></html>`;
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Nieuwsbrief() {
  const defaultIntro = 'OMNI is het interne platform dat onderhoud, productie en planning samenbrengt op één plek. Deze mail geeft een overzicht van alles wat de app vandaag voor jou doet.';

  const [introText, setIntroText] = useState(defaultIntro);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    new Set(featureEntries.slice(0, 5).map(e => e.id))
  );
  const [images, setImages] = useState<ImageMap>({});
  const [contentMap, setContentMap] = useState<ContentMap>(
    () => Object.fromEntries(SECTIONS.map(s => [s.key, { ...s.defaultContent, bullets: [...s.defaultContent.bullets] }]))
  );

  const toggle = (id: string) => setSelectedIds(prev => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });

  const updateField = (key: string, field: 'title' | 'description', value: string) =>
    setContentMap(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } }));

  const updateBullet = (key: string, index: number, value: string) =>
    setContentMap(prev => {
      const bullets = [...prev[key].bullets];
      bullets[index] = value;
      return { ...prev, [key]: { ...prev[key], bullets } };
    });

  const addBullet = (key: string) =>
    setContentMap(prev => ({ ...prev, [key]: { ...prev[key], bullets: [...prev[key].bullets, 'Nieuw punt'] } }));

  const removeBullet = (key: string, index: number) =>
    setContentMap(prev => ({ ...prev, [key]: { ...prev[key], bullets: prev[key].bullets.filter((_, i) => i !== index) } }));

  const handleDrop = (id: string, dataUrl: string) => setImages(prev => ({ ...prev, [id]: dataUrl }));
  const handleRemove = (id: string) => setImages(prev => { const next = { ...prev }; delete next[id]; return next; });

  const html = useMemo(
    () => generateHTML(introText, selectedIds, contentMap, images),
    [introText, selectedIds, contentMap, images]
  );

  const download = () => {
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'omni-nieuwsbrief.html'; a.click();
    URL.revokeObjectURL(url);
    toast.success('Nieuwsbrief gedownload');
  };

  const copyHTML = () => navigator.clipboard.writeText(html).then(() => toast.success('HTML gekopieerd naar klembord'));

  return (
    <div className="flex flex-col h-[calc(100vh-80px)]">
      <PageHeader title="Nieuwsbrief" description="Bewerk en exporteer de OMNI nieuwsbrief" icon={Newspaper} />

      <div className="flex flex-1 gap-4 overflow-hidden mt-4">

        {/* Left: Controls */}
        <div className="w-64 shrink-0 flex flex-col gap-4 overflow-y-auto pr-1">

          <div className="bg-white rounded-lg border p-4 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Updates tonen</label>
              <span className="text-xs text-slate-400">{selectedIds.size}/{featureEntries.length}</span>
            </div>
            <div className="space-y-2">
              {featureEntries.map(entry => (
                <label key={entry.id} className="flex items-start gap-2.5 cursor-pointer group">
                  <Checkbox checked={selectedIds.has(entry.id)} onCheckedChange={() => toggle(entry.id)} className="mt-0.5 shrink-0" />
                  <div className="min-w-0">
                    <div className="text-xs font-medium text-slate-700 leading-snug group-hover:text-slate-900 truncate">{entry.title}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">v{entry.version}</Badge>
                      <span className="text-[10px] text-slate-400">{format(new Date(entry.date), 'd MMM yyyy', { locale: nl })}</span>
                    </div>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {Object.keys(images).length > 0 && (
            <div className="bg-white rounded-lg border p-4 space-y-2">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Geplaatste afbeeldingen</label>
              {Object.keys(images).map(key => {
                const def = SECTIONS.find(s => s.key === key);
                return (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 truncate">{def?.defaultContent.title ?? key}</span>
                    <button onClick={() => handleRemove(key)} className="text-red-400 hover:text-red-600 ml-2 shrink-0"><X className="w-3 h-3" /></button>
                  </div>
                );
              })}
            </div>
          )}

          <div className="space-y-2">
            <Button className="w-full gap-2" onClick={download}><Download className="w-4 h-4" />Download HTML</Button>
            <Button variant="outline" className="w-full gap-2" onClick={copyHTML}><Copy className="w-4 h-4" />Kopieer HTML</Button>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed px-1">
            Klik op tekst in het voorbeeld om te bewerken. Sleep afbeeldingen op de gestreepte kaders.
          </p>
        </div>

        {/* Right: Interactive preview */}
        <div className="flex-1 rounded-lg border overflow-hidden bg-[#f4f4f5] flex flex-col">
          <div className="flex items-center gap-2 px-4 py-2 border-b bg-slate-50 shrink-0">
            <div className="flex gap-1.5">
              <div className="w-3 h-3 rounded-full bg-red-400" />
              <div className="w-3 h-3 rounded-full bg-yellow-400" />
              <div className="w-3 h-3 rounded-full bg-green-400" />
            </div>
            <span className="text-xs text-slate-400 ml-1">Klik op tekst om te bewerken · Sleep afbeeldingen op de kaders</span>
          </div>
          <div className="flex-1 overflow-y-auto">
            <div style={{ zoom: 1 } as React.CSSProperties}>
              <NewsletterPreview
                introText={introText}
                onIntroChange={setIntroText}
                selectedIds={selectedIds}
                contentMap={contentMap}
                images={images}
                onFieldChange={updateField}
                onBulletChange={updateBullet}
                onBulletAdd={addBullet}
                onBulletRemove={removeBullet}
                onDrop={handleDrop}
                onRemove={handleRemove}
              />
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
