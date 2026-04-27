import type { Katern, LithomanMergeItem, LithomanMergeInfo } from './drukwerken-utils';

const num = (v: number | null | undefined): number => v ?? 0;

const pagKey = (k: Katern): string => {
    const p = k.pagination;
    if (p === null || p === undefined || p === '') return '';
    return String(p);
};

const sumItems = (items: LithomanMergeItem[], key: keyof LithomanMergeItem): number =>
    items.reduce((acc, it) => acc + num(it[key] as number | null), 0);

const sumOrNull = (group: Katern[], key: keyof Katern): number | null => {
    const total = group.reduce((acc, k) => acc + num(k[key] as number | null), 0);
    return total > 0 ? total : null;
};

const toMergeItem = (k: Katern): LithomanMergeItem => ({
    volgorde:    k.volgorde ?? null,
    signatureId: k.signatureId ?? null,
    pagination:  k.pagination ?? null,
    version:     k.version,
    wissel:      k.wissel || (k.startup ? 'Opstart' : ''),
    oplage:      k.oplage ?? null,
    netRun:      k.netRun ?? null,
    startup:     !!k.startup,
    c4_4:        k.c4_4 ?? null,
    c4_0:        k.c4_0 ?? null,
    c1_0:        k.c1_0 ?? null,
    c1_1:        k.c1_1 ?? null,
    c4_1:        k.c4_1 ?? null,
});

// Aantal versies in een merge-item afleiden uit de version-string.
// "12 versies" → 12, "NL - X, FR - Y" → 2, anders 1.
function countVersies(v: string): number {
    if (!v) return 0;
    const m = v.match(/^(\d+)\s+versies$/i);
    if (m) return parseInt(m[1], 10);
    if (v.includes(',')) return v.split(',').filter(s => s.trim()).length;
    return 1;
}

// Contextuele label voor een gemergde rij.
// 1 unieke katern (degenereert): "N versies - Zp"
// 2-3 unieke katernen:           "Katern X & Y - Zp"
// 4+ unieke katernen:            "N katernen - Zp"
function deriveMergedLabel(items: LithomanMergeItem[]): string {
    const uniqueIds = Array.from(new Set(
        items
            .map(it => it.signatureId ?? (it.volgorde != null ? String(it.volgorde) : ''))
            .filter(s => s !== '')
    ));
    const pag = items[0]?.pagination ?? '';
    const pagSuffix = pag !== '' ? ` - ${pag}p` : '';
    const totalVersies = items.reduce((acc, it) => acc + countVersies(it.version), 0);

    if (uniqueIds.length <= 1) {
        const n = totalVersies > 0 ? totalVersies : items.length;
        return `${n} versies${pagSuffix}`;
    }

    if (uniqueIds.length <= 3) {
        const idsStr = uniqueIds.length === 2
            ? uniqueIds.join(' & ')
            : uniqueIds.slice(0, -1).join(', ') + ' & ' + uniqueIds[uniqueIds.length - 1];
        return `Katern ${idsStr}${pagSuffix}`;
    }

    return `${uniqueIds.length} katernen${pagSuffix}`;
}

// Lithoman combineert opeenvolgende katernen met dezelfde paginering tot één
// drukwerk-rij. Eerste katern van de groep behoudt z'n Opstart; elke volgende
// katern z'n startup wordt geconverteerd naar een 4/4-wissel.
export function mergeLithomanKaternen(katernen: Katern[]): Katern[] {
    if (katernen.length <= 1) return katernen;

    const result: Katern[] = [];
    let i = 0;
    while (i < katernen.length) {
        const start = katernen[i];
        const key = pagKey(start);
        const group: Katern[] = [start];

        if (key !== '') {
            let j = i + 1;
            while (j < katernen.length && pagKey(katernen[j]) === key) {
                group.push(katernen[j]);
                j++;
            }
            i = j;
        } else {
            i++;
        }

        if (group.length === 1) {
            result.push(start);
            continue;
        }

        const startupConversions = group.slice(1).filter(k => k.startup).length;
        const c4_4_total = num(sumOrNull(group, 'c4_4')) + startupConversions;

        const info: LithomanMergeInfo = {
            merged_count: group.length,
            items: group.map(toMergeItem),
        };

        const merged: Katern = {
            ...start,
            version: deriveMergedLabel(info.items),
            netRun:  sumOrNull(group, 'netRun'),
            oplage:  sumOrNull(group, 'oplage'),
            c4_4:    c4_4_total > 0 ? c4_4_total : null,
            c4_0:    sumOrNull(group, 'c4_0'),
            c1_0:    sumOrNull(group, 'c1_0'),
            c1_1:    sumOrNull(group, 'c1_1'),
            c4_1:    sumOrNull(group, 'c4_1'),
            startup: true,
            wissel:  'Opstart',
            lithoman_merge_info: info,
        };

        result.push(merged);
    }

    return result;
}

// Wordt aangeroepen wanneer een gebruiker een merge-item verwijdert.
// Herberekent de gemergde rij op basis van de overgebleven items.
// Bij <= 1 overgebleven item: rij wordt gedemoteerd (geen merge meer).
export function recalcMergedKatern(katern: Katern, removeIdx: number): Katern {
    const info = katern.lithoman_merge_info;
    if (!info) return katern;

    const items = info.items.filter((_, i) => i !== removeIdx);

    if (items.length === 0) {
        // Niets meer over — laat de rij intact maar wis merge-info
        return { ...katern, lithoman_merge_info: null };
    }

    if (items.length === 1) {
        // Demote naar gewone rij
        const only = items[0];
        return {
            ...katern,
            version:  only.version,
            netRun:   only.netRun,
            oplage:   only.oplage,
            c4_4:     only.c4_4,
            c4_0:     only.c4_0,
            c1_0:     only.c1_0,
            c1_1:     only.c1_1,
            c4_1:     only.c4_1,
            startup:  only.startup,
            wissel:   only.wissel || (only.startup ? 'Opstart' : ''),
            pagination: only.pagination,
            signatureId: only.signatureId,
            volgorde: only.volgorde,
            lithoman_merge_info: null,
        };
    }

    // Eerste item houdt z'n Opstart, volgende met startup=true converteren naar +1 c4_4
    const startupConversions = items.slice(1).filter(it => it.startup).length;
    const c4_4_total = sumItems(items, 'c4_4') + startupConversions;
    const netRunTotal = sumItems(items, 'netRun');
    const oplageTotal = sumItems(items, 'oplage');
    const c4_0_total = sumItems(items, 'c4_0');
    const c1_0_total = sumItems(items, 'c1_0');
    const c1_1_total = sumItems(items, 'c1_1');
    const c4_1_total = sumItems(items, 'c4_1');

    return {
        ...katern,
        version: deriveMergedLabel(items),
        netRun:  netRunTotal > 0 ? netRunTotal : null,
        oplage:  oplageTotal > 0 ? oplageTotal : null,
        c4_4:    c4_4_total > 0 ? c4_4_total : null,
        c4_0:    c4_0_total > 0 ? c4_0_total : null,
        c1_0:    c1_0_total > 0 ? c1_0_total : null,
        c1_1:    c1_1_total > 0 ? c1_1_total : null,
        c4_1:    c4_1_total > 0 ? c4_1_total : null,
        startup: true,
        wissel:  'Opstart',
        lithoman_merge_info: { merged_count: items.length, items },
    };
}
