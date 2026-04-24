export interface JdfNameFilter {
    id: string;
    prefix: string;
    separator: string;
    splitOn: 'first' | 'last';
}

export function applyJdfFilter(
    orderNaam: string,
    filters: JdfNameFilter[]
): { orderNaam: string; versie: string | null } {
    const filter = filters.find(f =>
        f.prefix.length > 0 &&
        orderNaam.toLowerCase().startsWith(f.prefix.toLowerCase())
    );
    if (!filter) return { orderNaam, versie: null };

    const sep = filter.separator;
    if (!sep) return { orderNaam, versie: null };

    const idx = filter.splitOn === 'first'
        ? orderNaam.indexOf(sep)
        : orderNaam.lastIndexOf(sep);

    if (idx === -1) return { orderNaam, versie: null };

    const naam = orderNaam.substring(0, idx).trim();
    const versie = orderNaam.substring(idx + sep.length).trim();
    return { orderNaam: naam || orderNaam, versie: versie || null };
}

export interface VersionLabelFilter {
    id: string;
    versionMatch: string;      // case-insensitive match against katern.version
    requireMultiple: boolean;  // only apply when order has >1 katernen
    requireAllMatch: boolean;  // only apply when ALL katernen of the order match
    template: string;          // e.g. 'Katern "{signatureId}" - "{exOmw}" x "{pages}" Blz'
}

export function newVersionLabelFilter(): VersionLabelFilter {
    return {
        id: Date.now().toString(),
        versionMatch: 'common',
        requireMultiple: true,
        requireAllMatch: true,
        template: 'Katern "{signatureId}" - "{exOmw}" x "{pages}" Blz',
    };
}

export function applyVersionLabelFilter(
    katern: { version: string; signatureId?: string | null; exOmw?: string | null; pages?: number | null },
    allKaternen: Array<{ version: string }>,
    filters: VersionLabelFilter[]
): string | null {
    for (const f of filters) {
        if (!f.versionMatch) continue;
        if (f.requireMultiple && allKaternen.length <= 1) continue;
        if (f.requireAllMatch && !allKaternen.every(k => k.version.toLowerCase() === f.versionMatch.toLowerCase())) continue;
        if (katern.version.toLowerCase() !== f.versionMatch.toLowerCase()) continue;

        return f.template
            .replace('{signatureId}', String(katern.signatureId ?? ''))
            .replace('{exOmw}', String(katern.exOmw ?? ''))
            .replace('{pages}', String(katern.pages ?? ''));
    }
    return null;
}
