import { FinishedPrintJob } from './drukwerken-utils';

export interface JdfParseResult {
    orderNr: string;
    orderName: string;
    pressDeviceId: string; // e.g. "C818" — caller matches to PB press name
    exOmw: string;
    pages: number | null;
    jobs: JdfParsedVersion[];
}

export interface JdfParsedVersion {
    version: string;       // full DescriptiveName, e.g. "NL - Limburg"
    langPrefix: string;    // e.g. "NL", "FR", or "" if no match
    versionLabel: string;  // stripped of prefix, e.g. "Limburg"
}

function getAttr(el: Element, attr: string): string {
    return el.getAttribute(attr) || '';
}

function queryAttr(doc: Document | Element, selector: string, attr: string): string {
    const el = doc.querySelector(selector);
    return el ? getAttr(el, attr) : '';
}

export function parseJdf(xmlString: string): JdfParseResult {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlString, 'application/xml');

    const root = doc.querySelector('JDF');
    if (!root) throw new Error('Geen geldig JDF-bestand.');

    // Order number: strip "DT" prefix
    const rawId = getAttr(root, 'ID');
    const orderNr = rawId.replace(/^DT/i, '');

    // Order name
    const orderName = getAttr(root, 'DescriptiveName').trim();

    // Press: Device with ID starting with PRESS_
    const pressDevice = root.querySelector('Device[ID^="PRESS_"]');
    const pressDeviceId = pressDevice ? getAttr(pressDevice, 'DeviceID') : '';

    // exOmw: extract last digit(s) before trailing optional suffix in FoldCatalog
    // e.g. "W_2p_A3_P_2x" or "W_10p_A2_P_2x_c818" → "2"
    const foldCatalog = queryAttr(root, 'BinderySignature', 'FoldCatalog');
    const exOmwMatch = foldCatalog.match(/(\d+)x(?:_|$)/);
    const exOmw = exOmwMatch ? exOmwMatch[1] : '1';

    // Pages: from LayoutIntent/Pages/@Actual
    const pagesEl = root.querySelector('LayoutIntent Pages');
    const pagesRaw = pagesEl ? getAttr(pagesEl, 'Actual') : '';
    const pages = pagesRaw ? parseInt(pagesRaw, 10) || null : null;

    // Versions: Assembly elements with DescriptiveName and PartVersion
    // Only direct children with DescriptiveName (skip the root Assembly)
    const assemblies = Array.from(root.querySelectorAll('Assembly[DescriptiveName][PartVersion]'));

    const LANG_PREFIXES = ['NL', 'FR', 'DE', 'EN'];
    const prefixRegex = new RegExp(`^(${LANG_PREFIXES.join('|')})\\s*-\\s*`, 'i');

    const jobs: JdfParsedVersion[] = assemblies.map(el => {
        const version = getAttr(el, 'DescriptiveName').trim();
        const match = version.match(prefixRegex);
        const langPrefix = match ? match[1].toUpperCase() : '';
        const versionLabel = match ? version.slice(match[0].length).trim() : version;
        return { version, langPrefix, versionLabel };
    });

    return { orderNr, orderName, pressDeviceId, exOmw, pages, jobs };
}

// Colours for lang prefix chips — must match Tailwind classes used in the app
export const LANG_CHIP_COLORS: Record<string, { bg: string; text: string; border: string }> = {
    NL: { bg: 'bg-blue-50',   text: 'text-blue-700',   border: 'border-blue-200' },
    FR: { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200' },
    DE: { bg: 'bg-green-50',  text: 'text-green-700',  border: 'border-green-200' },
    EN: { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-200' },
};

export function getLangChipColors(prefix: string) {
    return LANG_CHIP_COLORS[prefix] ?? { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' };
}

export function jdfVersionsToJobs(
    parsed: JdfParseResult,
    pressName: string,
    pressId: string
): FinishedPrintJob[] {
    const base: Omit<FinishedPrintJob, 'id' | 'version'> = {
        date: new Date().toISOString().split('T')[0],
        datum: '',
        orderNr: parsed.orderNr,
        orderName: parsed.orderName,
        pages: parsed.pages,
        exOmw: parsed.exOmw,
        netRun: null,
        startup: false,
        c4_4: null,
        c4_0: null,
        c1_0: null,
        c1_1: null,
        c4_1: null,
        maxGross: null,
        green: null,
        red: null,
        delta: null,
        delta_number: null,
        delta_percentage: null,
        performance: '-',
        pressId,
        pressName,
    };

    return parsed.jobs.map((v, i) => ({
        ...base,
        id: `jdf-${Date.now()}-${i}`,
        version: v.version,
    }));
}
