import Dexie, { Table } from 'dexie';
import { FinishedPrintJob } from '../utils/drukwerken-utils';
import { pb } from '../components/AuthContext';
import { format } from 'date-fns';

// Define the database
class DrukwerkenDatabase extends Dexie {
    jobs!: Table<FinishedPrintJob, string>;
    syncState!: Table<{ id: string; lastSync: Date }, string>;

    constructor() {
        super('DrukwerkenDB');
        this.version(1).stores({
            jobs: 'id, orderNr, date, pressName, created, [orderNr+version]', // Indexed fields
            syncState: 'id'
        });
    }
}

export const db = new DrukwerkenDatabase();

export interface CacheStatus {
    loading: boolean;
    statusText: string;
    totalDocs: number;
    cachedDocs: number;
    newUpdates: number;
    lastSync?: Date;
}

type JobsCallback = (jobs: FinishedPrintJob[]) => void;
type StatusCallback = (status: CacheStatus) => void;

class DrukwerkenCacheService {
    private status: CacheStatus = {
        loading: true,
        statusText: 'Initializing...',
        totalDocs: 0,
        cachedDocs: 0,
        newUpdates: 0
    };

    // In-memory mapping to map PB response to FinishedPrintJob
    // Copied logic from Drukwerken.tsx
    private mapJob(r: any, user: any, hasPermission: any): FinishedPrintJob {
        return {
            id: r.id,
            orderNr: r.order_nummer || '',
            orderName: r.klant_order_beschrijving || '',
            date: r.date ? r.date.split(' ')[0] : (r.created ? r.created.split('T')[0] : ''),
            datum: r.date ? r.date.split(' ')[0].split('-').reverse().join('.') : (r.created ? r.created.split('T')[0].split('-').reverse().join('.') : ''),
            version: r.versie || '',
            pages: r.blz,
            exOmw: String(r.ex_omw || ''),
            netRun: r.netto_oplage,
            startup: !!r.opstart,
            c4_4: r.k_4_4,
            c4_0: r.k_4_0,
            c1_0: r.k_1_0,
            c1_1: r.k_1_1,
            c4_1: r.k_4_1,
            maxGross: r.max_bruto || 0,
            green: r.groen,
            red: r.rood,
            delta_number: r.delta || 0,
            delta_percentage: r.delta_percent || 0,
            delta: r.delta || 0,
            performance: '100%',
            pressId: r.pers || '',
            pressName: (!hasPermission('drukwerken_view_all') && user?.pressId === r.pers) ? user?.press : (r.expand?.pers?.naam || ''),
            created: r.created,
            opmerkingen: r.opmerking || '',
        };
    }

    private listeners: { onJobs: JobsCallback; onStatus: StatusCallback }[] = [];

    subscribe(onJobs: JobsCallback, onStatus: StatusCallback) {
        this.listeners.push({ onJobs, onStatus });
        // Immediately send current state
        onStatus(this.status);
        this.getIdsFromCache().then(jobs => onJobs(jobs));

        return () => {
            this.listeners = this.listeners.filter(l => l.onJobs !== onJobs);
        };
    }

    private notifyStatus(update: Partial<CacheStatus>) {
        this.status = { ...this.status, ...update };
        this.listeners.forEach(l => l.onStatus(this.status));
    }

    private async notifyJobs() {
        const jobs = await this.getIdsFromCache();
        this.listeners.forEach(l => l.onJobs(jobs));
    }

    async getIdsFromCache() {
        return await db.jobs.orderBy('date').reverse().toArray();
    }

    private isSyncing = false;

    async sync(user: any, hasPermission: (perm: any) => boolean) {
        if (this.isSyncing) return;
        this.isSyncing = true;

        try {
            const lastSyncRow = await db.syncState.get('global');
            const lastSyncTime = lastSyncRow?.lastSync;
            const localCount = await db.jobs.count();

            // 1. Fetch TOTAL count from server to decide strategy
            let filter = '';
            if (!hasPermission('drukwerken_view_all') && user?.press) {
                if (user.pressId) {
                    filter = `pers = "${user.pressId}"`;
                } else {
                    filter = `pers.naam = "${user.press}"`;
                }
            }

            const countResult = await pb.collection('drukwerken').getList(1, 1, { filter });
            const serverCount = countResult.totalItems;

            this.notifyStatus({ totalDocs: serverCount, cachedDocs: localCount });

            // SMART SYNC DECISION
            // If we have a lastSync time AND local DB is not empty, try a light update check
            if (lastSyncTime && localCount > 0) {
                this.notifyStatus({ loading: true, statusText: 'Checking for updates...' });
                await this.checkForUpdates(user, hasPermission, lastSyncTime, serverCount);
            } else {
                // Otherwise, do a full resync (chunked load)
                await this.fullResync(user, hasPermission, filter, serverCount);
            }

        } catch (error) {
            console.error("Sync error:", error);
            this.notifyStatus({ loading: false, statusText: 'Sync failed' });
        } finally {
            this.isSyncing = false;
        }
    }

    private async fullResync(user: any, hasPermission: (perm: any) => boolean, filter: string, totalItems: number) {
        this.notifyStatus({ loading: true, statusText: 'Starting full sync...', newUpdates: 0 });

        // Assume initial cache count
        const currentCacheCount = await db.jobs.count();
        this.notifyStatus({ totalDocs: totalItems, cachedDocs: currentCacheCount });

        // 2. Fetch Current Year (Chunked 20) first
        const currentYear = new Date().getFullYear();
        const currentYearFilter = `(date~ "${currentYear}-" || datum~ ".${currentYear}" || date~ "${currentYear}/")`;
        const primaryFilter = filter ? `(${filter}) && (${currentYearFilter})` : currentYearFilter;

        let page = 1;
        const pageSize = 20;

        if (currentCacheCount > 0) {
            this.notifyStatus({ statusText: 'Looking for updates...' });
        } else {
            this.notifyStatus({ statusText: `Loading ${currentYear} data...` });
        }

        while (true) {
            const result = await pb.collection('drukwerken').getList(page, pageSize, {
                sort: '-date,-created',
                expand: 'pers',
                filter: primaryFilter
            });

            const jobs = result.items.map(i => this.mapJob(i, user, hasPermission));

            if (jobs.length > 0) {
                await db.jobs.bulkPut(jobs);
                const realCount = await db.jobs.count();
                const displayCount = Math.min(realCount, totalItems);
                this.notifyStatus({ cachedDocs: displayCount });
                await this.notifyJobs();
            }

            if (page >= result.totalPages) break;
            page++;
        }

        // 3. Background Load Older Years (Chunked 100)
        const historicalYearFilter = `date!~ "${currentYear}-" && datum!~ ".${currentYear}" && date!~ "${currentYear}/"`;
        const historicalFilter = filter ? `(${filter}) && (${historicalYearFilter})` : historicalYearFilter;

        page = 1;
        const historicalPageSize = 100;

        if (currentCacheCount === 0) {
            this.notifyStatus({ statusText: `Loading historical data...` });
        }

        while (true) {
            const result = await pb.collection('drukwerken').getList(page, historicalPageSize, {
                sort: '-date,-created',
                expand: 'pers',
                filter: historicalFilter
            });

            const jobs = result.items.map(i => this.mapJob(i, user, hasPermission));
            if (jobs.length > 0) {
                await db.jobs.bulkPut(jobs);
                const realCount = await db.jobs.count();
                const displayCount = Math.min(realCount, totalItems);
                this.notifyStatus({ cachedDocs: displayCount });
                await this.notifyJobs();
            }

            if (page >= result.totalPages) break;
            page++;
        }

        await db.syncState.put({ id: 'global', lastSync: new Date() });
        this.notifyStatus({ loading: false, statusText: 'Up to date', lastSync: new Date() } as any);
    }

    // Modified to be part of the sync process or standalone
    async checkForUpdates(user: any, hasPermission: (perm: any) => boolean, explicitLastSync?: Date, totalItemsForStats?: number) {
        if (!user) return;

        let lastSyncTime = explicitLastSync;
        if (!lastSyncTime) {
            const lastSyncRow = await db.syncState.get('global');
            lastSyncTime = lastSyncRow?.lastSync || new Date(0);
        }

        const formattedDate = format(lastSyncTime, 'yyyy-MM-dd HH:mm:ss');

        let filter = `updated > "${formattedDate}"`;
        if (!hasPermission('drukwerken_view_all') && user?.press) {
            const pressFilter = user.pressId ? `pers = "${user.pressId}"` : `pers.naam = "${user.press}"`;
            filter = `(${pressFilter}) && ${filter}`;
        }

        try {
            const updates = await pb.collection('drukwerken').getFullList({
                filter: filter,
                expand: 'pers'
            });

            if (updates.length > 0) {
                this.notifyStatus({ statusText: `Syncing ${updates.length} updates...` });
                const jobs = updates.map(i => this.mapJob(i, user, hasPermission));
                await db.jobs.bulkPut(jobs);

                // Update stats
                const newUpdateCount = this.status.newUpdates + updates.length;

                // Recalculate cached docs if provided, or just increment? 
                // Creating accurate stats is tricky without re-counting, lets assume we just want to update the update counter
                const currentCount = await db.jobs.count();
                const displayTotal = totalItemsForStats ? Math.max(totalItemsForStats, currentCount) : currentCount; // Ensure logic holds

                this.notifyStatus({
                    newUpdates: newUpdateCount,
                    cachedDocs: currentCount,
                    totalDocs: displayTotal, // Update total docs too if we found new things?
                    statusText: `Synced ${updates.length} updates`
                });

                await this.notifyJobs();
            } else {
                this.notifyStatus({ statusText: 'Up to date' });
            }

            // Update last sync time
            await db.syncState.put({ id: 'global', lastSync: new Date() });

            // Should we set loading false here if called standalone?
            // If called from sync(), sync() handles finally block?
            // But sync() uses notifyStatus loading:true.
            // Let's set loading: false here as success indicator
            this.notifyStatus({ loading: false, statusText: 'Up to date', lastSync: new Date() } as any);

        } catch (e) {
            console.error("Update check failed", e);
            // Don't set loading false if failed, let caller handle error or set generic error
            this.notifyStatus({ statusText: 'Update check failed' });
        }
    }
}

export const drukwerkenCache = new DrukwerkenCacheService();
