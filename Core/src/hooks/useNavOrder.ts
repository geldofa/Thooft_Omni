import { useState, useCallback, useEffect } from 'react';
import { pb } from '../lib/pocketbase';

const KEY = 'nav_order_v1';

export function useNavOrder(): [string[], (ids: string[]) => void] {
    const [order, setOrderState] = useState<string[]>(() => {
        try {
            const raw = localStorage.getItem(KEY);
            if (raw) return JSON.parse(raw);
        } catch {}
        return [];
    });

    useEffect(() => {
        const userId = pb.authStore.model?.id;
        if (!userId) return;
        pb.collection('users').getOne(userId, { fields: 'nav_order' }).then(record => {
            if (record.nav_order) {
                try {
                    const parsed = JSON.parse(record.nav_order);
                    setOrderState(parsed);
                    localStorage.setItem(KEY, record.nav_order);
                } catch {}
            }
        }).catch(() => {});
    }, []);

    const setOrder = useCallback((ids: string[]) => {
        const raw = JSON.stringify(ids);
        setOrderState(ids);
        try { localStorage.setItem(KEY, raw); } catch {}
        const userId = pb.authStore.model?.id;
        if (userId) {
            pb.collection('users').update(userId, { nav_order: raw }).catch(() => {});
        }
    }, []);

    return [order, setOrder];
}

export function applyOrder<T extends { id: string }>(items: T[], order: string[]): T[] {
    if (!order.length) return items;
    const idx = new Map(order.map((id, i) => [id, i]));
    return [...items].sort((a, b) => (idx.get(a.id) ?? Infinity) - (idx.get(b.id) ?? Infinity));
}
