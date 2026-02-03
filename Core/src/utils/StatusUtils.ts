export interface StatusInfo {
    key: string;
    label: string;
    color: string;
    textColor: string;
    badgeClass: string;
}

export const getStatusInfo = (nextMaintenance: Date | string | null): StatusInfo => {
    if (!nextMaintenance) return { key: 'Gepland', label: '-', color: '', textColor: '', badgeClass: 'bg-gray-100 text-gray-500' };

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalize today
    const next = new Date(nextMaintenance);
    next.setHours(0, 0, 0, 0); // Normalize target

    const diffTime = next.getTime() - today.getTime();
    const daysUntil = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) {
        return { key: 'Te laat', label: '!!!', color: 'bg-red-50', textColor: 'text-red-700', badgeClass: 'bg-red-500 hover:bg-red-600' };
    } else if (daysUntil === 0) {
        return { key: 'Deze Week', label: 'Vandaag!!', color: 'bg-orange-50', textColor: 'text-orange-700', badgeClass: 'bg-orange-500 hover:bg-orange-600' };
    } else if (daysUntil === 1) {
        return { key: 'Deze Week', label: 'Morgen!', color: 'bg-orange-50', textColor: 'text-orange-700', badgeClass: 'bg-orange-500 hover:bg-orange-600' };
    } else if (daysUntil <= 7) {
        return { key: 'Deze Week', label: `${daysUntil} Dagen`, color: 'bg-orange-50', textColor: 'text-orange-700', badgeClass: 'bg-orange-500 hover:bg-orange-600' };
    } else if (daysUntil <= 30) {
        // Note: Only "Te laat" and "Deze Week" are typically used for top-level keys in the filter logic seen in MaintenanceTable
        // but we preserve the full logic here.
        return { key: 'Deze Maand', label: `${daysUntil} Dagen`, color: 'bg-yellow-50', textColor: 'text-yellow-700', badgeClass: 'bg-yellow-500 hover:bg-yellow-600' };
    } else {
        // Weeks calculation
        const weeks = Math.round(daysUntil / 7);
        if (weeks > 7) {
            const months = Math.round(daysUntil / 30.4375); // Average month length
            const label = months <= 1 ? '1 Maand' : `${months} Maanden`;
            return { key: 'Gepland', label: label, color: '', textColor: '', badgeClass: 'bg-gray-200 hover:bg-gray-300 text-gray-700' };
        }
        const label = weeks === 1 ? '1 Week' : `${weeks} Weken`;
        return { key: 'Gepland', label: label, color: '', textColor: '', badgeClass: 'bg-gray-200 hover:bg-gray-300 text-gray-700' };
    }
};
