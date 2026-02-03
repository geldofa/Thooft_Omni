import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import PocketBase from 'pocketbase';
import { toast } from 'sonner';
import { APP_URL } from '../config';

// Initialize PocketBase Client
const PB_URL = APP_URL || import.meta.env.VITE_PB_URL || `http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:8090`;
export const client = new PocketBase(PB_URL);
export const pb = client;
pb.autoCancellation(false);

export interface GroupedTask {
  id: string;
  taskName: string;
  taskSubtext: string;
  category: string; // Name for display
  categoryId: string; // ID for relations
  press: PressType; // Name for display
  pressId: string; // ID for relations
  subtasks: Subtask[];
}

export interface Subtask {
  id: string;
  subtaskName: string;
  subtext: string;
  lastMaintenance: Date | null;
  nextMaintenance: Date;
  maintenanceInterval: number;
  maintenanceIntervalUnit: 'days' | 'weeks' | 'months' | 'years';
  assignedTo: string;
  assignedToIds?: string[];
  assignedToTypes?: ('ploeg' | 'operator' | 'external')[];
  comment: string;
  commentDate: Date | null;
  sort_order: number;
  opmerkingen?: string;
  isExternal?: boolean;
  tagIds?: string[];
}

export interface MaintenanceTask {
  id: string;
  task: string; // Group Name
  subtaskName?: string; // Specific item name
  taskSubtext: string;
  subtaskSubtext?: string; // Specific item subtext
  category: string; // Name
  categoryId: string; // ID
  press: PressType; // Name
  pressId: string; // ID
  lastMaintenance: Date | null;
  nextMaintenance: Date;
  maintenanceInterval: number;
  maintenanceIntervalUnit: 'days' | 'weeks' | 'months' | 'years';
  assignedTo: string;
  assignedToIds?: string[];
  assignedToTypes?: ('ploeg' | 'operator' | 'external')[];
  opmerkingen: string;
  comment: string;
  commentDate: Date | null;
  sort_order: number;
  subtasks?: { id: string; name: string; subtext: string; opmerkingen?: string; commentDate?: Date | null; sort_order: number; isExternal?: boolean; tagIds?: string[] }[];
  isExternal: boolean;
  tagIds?: string[];
  created: string;
  updated: string;
}

export type UserRole = 'admin' | 'press' | 'meestergast' | null;
export type PressType = string;

export type Permission =
  | 'tasks_view'
  | 'tasks_edit'
  | 'drukwerken_view'
  | 'drukwerken_view_all'
  | 'drukwerken_create'
  | 'reports_view'
  | 'checklist_view'
  | 'extern_view'
  | 'management_access'
  | 'manage_personnel'
  | 'manage_categories'
  | 'manage_tags'
  | 'manage_presses'
  | 'manage_parameters'
  | 'manage_accounts'
  | 'manage_permissions'
  | 'toolbox_access'
  | 'logs_view'
  | 'feedback_view'
  | 'feedback_manage';

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
}

interface User {
  id: string;
  username: string;
  name?: string;
  role: UserRole;
  press?: PressType;
  pressId?: string;
}

export interface Operator {
  id: string;
  employeeId: string;
  name: string;
  presses: PressType[];
  active: boolean;
  canEditTasks: boolean;
  canAccessOperatorManagement: boolean;
}

export interface ExternalEntity {
  id: string;
  name: string;
  presses: PressType[];
  active: boolean;
}

export interface Ploeg {
  id: string;
  name: string;
  operatorIds: string[];
  presses: PressType[];
  active: boolean;
}

export interface Category {
  id: string;
  name: string;
  subtexts?: Record<string, string>; // Maps press ID to subtext
  pressIds: string[];
  active: boolean;
}

export const EXTERNAL_TAG_NAME = 'Extern';

export interface Tag {
  id: string;
  naam: string;
  kleur?: string;
  active: boolean;
  system_managed?: boolean;
}

export interface ActivityLog {
  id: string;
  timestamp: Date;
  user: string;
  action: string;
  entity: string;
  entityId?: string;
  entityName: string;
  details: string;
  oldValue?: string;
  newValue?: string;
  press?: PressType;
}

export interface BackupInfo {
  key: string;
  size: number;
  modified: string;
}

export interface BackupSettings {
  enabled: boolean;
  cron: string;
  cronMaxKeep: number;
  s3: {
    enabled: boolean;
    bucket: string;
    region: string;
    endpoint: string;
    accessKey: string;
    secretKey: string;
    forcePathStyle: boolean;
  };
}

export interface CloudSyncStatus {
  configured: boolean;
  path?: string;
}

export interface Press {
  id: string;
  name: PressType;
  active: boolean;
  archived: boolean;
  category_order?: any;
}

export interface UserAccount {
  id: string;
  username: string;
  name?: string;
  password?: string;
  role: UserRole;
  press?: PressType;
  operatorId?: string;
}

interface AuthContextType {
  user: User | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  operators: Operator[];
  addOperator: (operator: Omit<Operator, 'id'>) => Promise<void>;
  updateOperator: (operator: Operator) => Promise<void>;
  deleteOperator: (id: string) => Promise<void>;
  categories: Category[];
  addCategory: (category: Omit<Category, 'id'>) => Promise<boolean>;
  updateCategory: (category: Category) => Promise<boolean>;
  deleteCategory: (id: string) => Promise<void>;
  categoryOrder: string[];
  updateCategoryOrder: (order: string[]) => void;
  updatePressCategoryOrder: (pressId: string, order: string[]) => Promise<boolean>;
  activityLogs: ActivityLog[];
  addActivityLog: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => Promise<void>;
  presses: Press[];
  addPress: (press: Omit<Press, 'id'>) => Promise<void>;
  updatePress: (press: Press) => Promise<void>;
  deletePress: (id: string) => Promise<void>;
  userAccounts: UserAccount[];
  changePassword: (username: string, newPassword: string) => Promise<void>;
  addUserAccount: (account: UserAccount) => Promise<boolean>;
  updateUserAccount: (username: string, updates: Partial<UserAccount>) => Promise<boolean>;
  deleteUserAccount: (username: string) => Promise<void>;
  getElevatedOperators: () => Operator[];
  tasks: GroupedTask[];
  fetchTasks: () => Promise<void>;
  fetchActivityLogs: () => Promise<void>;
  fetchUserAccounts: () => Promise<void>;
  addTask: (task: Omit<MaintenanceTask, 'id' | 'created' | 'updated'>) => Promise<void>;
  updateTask: (task: MaintenanceTask, refresh?: boolean) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  externalEntities: ExternalEntity[];
  addExternalEntity: (entity: Omit<ExternalEntity, 'id'>) => Promise<void>;
  updateExternalEntity: (entity: ExternalEntity) => Promise<void>;
  deleteExternalEntity: (id: string) => Promise<void>;
  ploegen: Ploeg[];
  addPloeg: (ploeg: Omit<Ploeg, 'id'>) => Promise<void>;
  updatePloeg: (ploeg: Ploeg) => Promise<void>;
  deletePloeg: (id: string) => Promise<void>;
  sendFeedback: (type: string, message: string, context?: any) => Promise<boolean>;
  fetchFeedback: () => Promise<any[]>;
  resolveFeedback?: (id: string) => Promise<boolean>;
  updateFeedback?: (id: string, data: any) => Promise<boolean>;
  deleteFeedback?: (id: string) => Promise<boolean>;
  archiveFeedback?: (id: string) => Promise<boolean>;
  fetchParameters: () => Promise<Record<string, any>>;
  tags: Tag[];
  addTag: (tag: Omit<Tag, 'id'>) => Promise<boolean>;
  updateTag: (tag: Tag) => Promise<boolean>;
  deleteTag: (id: string) => Promise<void>;
  isFirstRun: boolean;
  onboardingDismissed: boolean;
  setOnboardingDismissed: (val: boolean) => void;
  testingMode: boolean;
  setTestingMode: (val: boolean) => Promise<void>;
  checkFirstRun: () => Promise<void>;
  hasPermission: (permission: Permission) => boolean;
  rolePermissions: RolePermissions[];
  updateRolePermissions: (role: UserRole, permissions: Permission[]) => Promise<void>;
  // Backup functions
  listBackups: () => Promise<BackupInfo[]>;
  createBackup: (name?: string) => Promise<boolean>;
  downloadBackup: (key: string) => Promise<string>;
  deleteBackup: (key: string) => Promise<boolean>;
  restoreBackup: (key: string) => Promise<boolean>;
  uploadBackup: (file: File) => Promise<boolean>;
  getBackupSettings: () => Promise<BackupSettings | null>;
  updateBackupSettings: (settings: Partial<BackupSettings>) => Promise<boolean>;
  getCloudSyncStatus: () => Promise<CloudSyncStatus | null>;
  cloudSyncStatus: CloudSyncStatus | null;
  refreshCloudSyncStatus: () => Promise<void>;
  configureCloudSync: (type: 'gdrive' | 'onedrive' | 'local', config: any) => Promise<boolean>;
  verifyCloudBackups: (filenames: string[]) => Promise<Record<string, boolean>>;
  isSuperuser: boolean;
  authenticateSuperuser: (email: string, password: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode; tasks: GroupedTask[] }) {
  const [user, setUser] = useState<User | null>(null);
  const [tasksState, setTasksState] = useState<GroupedTask[]>([]);
  const [presses, setPresses] = useState<Press[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]); // Preserved unused var for now

  // Placeholders for things we haven't migrated schemas for yet or are keeping local for now
  const [operators, setOperators] = useState<Operator[]>([]);
  const [externalEntities, setExternalEntities] = useState<ExternalEntity[]>([]);
  const [ploegen, setPloegen] = useState<Ploeg[]>([]);
  const [categoryOrder, setCategoryOrder] = useState<string[]>([]);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);
  const [isFirstRun, setIsFirstRun] = useState<boolean>(false);
  const [onboardingDismissed, setOnboardingDismissedState] = useState<boolean>(() => {
    return localStorage.getItem('onboarding_dismissed') === 'true';
  });
  const [testingMode, setTestingModeState] = useState<boolean>(false);
  const [rolePermissions, setRolePermissions] = useState<RolePermissions[]>([]);
  const [isSuperuser, setIsSuperuser] = useState<boolean>(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus | null>(null);

  const setOnboardingDismissed = (val: boolean) => {
    setOnboardingDismissedState(val);
    localStorage.setItem('onboarding_dismissed', val ? 'true' : 'false');
  };

  const logout = () => {
    // Unsubscribe from all to prevent 403 mismatch errors during token clearing
    try {
      pb.realtime.unsubscribe();
    } catch (e) {
      console.warn("[Auth] Unsubscribe during logout failed:", e);
    }
    pb.authStore.clear();
    setUser(null);
    setIsSuperuser(false);
  };

  const addActivityLog = async (log: Omit<ActivityLog, 'id' | 'timestamp'>) => {
    try {
      const data = {
        user: log.user || 'System',
        action: log.action || '',
        entity: log.entity || '',
        entityId: log.entityId || '',
        entityName: log.entityName || '',
        press: log.press || '',
        details: log.details || `${log.action} ${log.entityName || ''}`,
        oldValue: log.oldValue || '',
        newValue: log.newValue || ''
      };
      await pb.collection('activity_logs').create(data);
    } catch (e: any) {
      console.error('Add log failed:', e.response || e);
    }
  };

  const mapDbRoleToUi = (dbRole: string): UserRole => {
    const roleMap: Record<string, UserRole> = { 'Admin': 'admin', 'Meestergast': 'meestergast', 'Operator': 'press' };
    return roleMap[dbRole] || 'press';
  };

  const mapUiRoleToDb = (uiRole: UserRole): string => {
    const roleMap: Record<string, string> = { 'admin': 'Admin', 'meestergast': 'Meestergast', 'press': 'Operator' };
    return roleMap[uiRole || 'press'] || 'Operator';
  };

  const hasPermission = (permission: Permission): boolean => {
    if (!user) return false;
    // Admins have all permissions by default as a safety net
    if (user.role === 'admin') return true;

    const roleData = rolePermissions.find(rp => rp.role === user.role);
    if (!roleData) return false;

    return roleData.permissions.includes(permission);
  };

  // --- Data Fetching ---
  const fetchTestingMode = useCallback(async () => {
    try {
      const record = await pb.collection('app_settings').getFirstListItem('key="testing_mode"');
      setTestingModeState(record.value === true);
    } catch (e) {
      setTestingModeState(false);
    }
  }, []);

  const checkFirstRun = useCallback(async () => {
    try {
      const result = await pb.collection('users').getList(1, 1);
      setIsFirstRun(result.totalItems === 0);
    } catch (e) {
      setIsFirstRun(true);
    }
  }, []);

  const fetchTasks = useCallback(async () => {
    try {
      let filter = '';
      if (user?.role === 'press' && user.press) {
        // Use correct casing for relation filter if needed, but naam is usually string
        filter = `pers.naam = "${user.press}"`;
      }

      const records = await pb.collection('onderhoud').getFullList({
        expand: 'category,pers,assigned_operator,assigned_team,tags',
        filter: filter
      });

      // Client-side sort
      records.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());

      const groups: Record<string, GroupedTask> = {};

      records.forEach((record: any) => {
        const categoryName = categories.find(c => c.id === record.category)?.name || record.expand?.category?.naam || record.category;
        const pressName = presses.find(p => p.id === record.pers)?.name || record.expand?.pers?.naam || record.pers;
        const groupKey = `${record.category}-${record.pers}-${record.task}`; // Unique group key

        if (!groups[groupKey]) {
          groups[groupKey] = {
            id: record.id + '_group',
            taskName: record.task,
            taskSubtext: record.task_subtext || '',
            category: categoryName,
            categoryId: record.category,
            press: pressName,
            pressId: record.pers,
            subtasks: []
          };
        }

        // Helper to get names from expanded relations
        const getAssignedNames = () => {
          const names: string[] = [];

          // Operators & Externals
          if (record.expand?.assigned_operator) {
            const ops = Array.isArray(record.expand.assigned_operator)
              ? record.expand.assigned_operator
              : [record.expand.assigned_operator];
            names.push(...ops.map((o: any) => o.naam));
          }

          // Teams
          if (record.expand?.assigned_team) {
            const teams = Array.isArray(record.expand.assigned_team)
              ? record.expand.assigned_team
              : [record.expand.assigned_team];
            names.push(...teams.map((t: any) => t.naam));
          }

          return names.filter(Boolean).join(', ');
        };

        const assignedNamesCombined = getAssignedNames();

        groups[groupKey].subtasks.push({
          id: record.id,
          subtaskName: record.subtask || record.task,
          subtext: record.subtask_subtext || record.task_subtext || '',
          lastMaintenance: record.last_date ? new Date(record.last_date) : null,
          nextMaintenance: record.next_date ? new Date(record.next_date) : (() => {
            if (record.last_date && record.interval) {
              const last = new Date(record.last_date);
              const unit = (record.interval_unit || '').toLowerCase();

              if (unit.includes('maand') || unit.includes('month')) {
                last.setMonth(last.getMonth() + record.interval);
              } else if (unit.includes('jaar') || unit.includes('year')) {
                last.setFullYear(last.getFullYear() + record.interval);
              } else if (unit.includes('week')) {
                last.setDate(last.getDate() + (record.interval * 7));
              } else {
                // Days or default
                last.setDate(last.getDate() + record.interval);
              }
              return last;
            }
            return new Date();
          })(),
          maintenanceInterval: record.interval || 0,
          maintenanceIntervalUnit: (() => {
            const u = (record.interval_unit || '').toLowerCase();
            if (u === 'dagen' || u === 'days') return 'days';
            if (u === 'weken' || u === 'weeks') return 'weeks';
            if (u === 'maanden' || u === 'months') return 'months';
            if (u === 'jaren' || u === 'years') return 'years';
            return 'days';
          })(),
          assignedTo: assignedNamesCombined,
          assignedToIds: [
            ...(Array.isArray(record.assigned_operator) ? record.assigned_operator : (record.assigned_operator ? [record.assigned_operator] : [])),
            ...(Array.isArray(record.assigned_team) ? record.assigned_team : (record.assigned_team ? [record.assigned_team] : []))
          ],
          assignedToTypes: [
            ...(Array.isArray(record.assigned_operator) ? record.assigned_operator.map(() => 'operator') : (record.assigned_operator ? ['operator'] : [])),
            ...(Array.isArray(record.assigned_team) ? record.assigned_team.map(() => 'ploeg') : (record.assigned_team ? ['ploeg'] : []))
          ],
          comment: record.opmerkingen || record.comment || record.notes || '',
          commentDate: record.commentDate ? new Date(record.commentDate) : (record.updated ? new Date(record.updated) : null),
          sort_order: record.sort_order || 0,
          isExternal: record.is_external || false,
          tagIds: (record.expand?.tags && Array.isArray(record.expand.tags)) ? record.expand.tags.map((t: any) => t.id) : []
        });
      });

      // After grouping, sort subtasks within each group by sort_order
      Object.values(groups).forEach(group => {
        group.subtasks.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
      });

      setTasksState(Object.values(groups));

    } catch (e) {
      console.error("Fetch tasks failed:", e);
    }
  }, [user, categories, presses]); // Add user and other data it maps

  const fetchUserAccounts = useCallback(async () => {
    try {
      const records = await pb.collection('users').getFullList();
      records.sort((a: any, b: any) => (a.username || '').localeCompare(b.username || ''));
      setUserAccounts(records.map((r: any) => ({
        id: r.id, username: r.username, name: r.name, role: mapDbRoleToUi(r.role), press: r.press, operatorId: r.operatorId, password: r.plain_password
      })));
    } catch (e) {
      console.error("Fetch users failed", e);
    }
  }, []);

  const fetchOperators = useCallback(async () => {
    try {
      const records = await pb.collection('operatoren').getFullList();
      const ops: Operator[] = [];
      const externals: ExternalEntity[] = [];
      records.forEach((r: any) => {
        const pressNames = Array.isArray(r.presses) ? r.presses : [];
        const entity = {
          id: r.id, name: r.naam, employeeId: r.interne_id?.toString() || '', presses: pressNames as string[], active: r.active !== false, canEditTasks: !!r.can_edit_tasks, canAccessOperatorManagement: !!r.can_access_management
        };
        if (r.dienstverband === 'Extern') externals.push(entity as ExternalEntity);
        else ops.push(entity as Operator);
      });
      setOperators(ops);
      setExternalEntities(externals);
    } catch (e) {
      console.error("Fetch operators failed", e);
    }
  }, []);

  const fetchPloegen = useCallback(async () => {
    try {
      const records = await pb.collection('ploegen').getFullList({ expand: 'pers,leden' });
      const teams: Ploeg[] = records.map((r: any) => ({
        id: r.id, name: r.naam, operatorIds: r.leden || [], presses: (r.expand?.pers ? [r.expand.pers.naam] : []), active: r.active !== false
      }));
      setPloegen(teams);
    } catch (e) {
      console.error("Fetch ploegen failed", e);
    }
  }, []);

  const fetchActivityLogs = useCallback(async () => {
    try {
      const records = await pb.collection('activity_logs').getFullList();
      records.sort((a: any, b: any) => new Date(b.created).getTime() - new Date(a.created).getTime());
      setActivityLogs(records.map((r: any) => ({
        id: r.id, timestamp: new Date(r.created), user: r.user, action: r.action, entity: r.entity, entityId: r.entityId, entityName: r.entityName, details: r.details, press: r.press
      })));
    } catch (e) {
      console.error("Fetch logs failed", e);
    }
  }, []);

  const loadData = useCallback(async () => {
    try {
      // 0. If user is press-role but missing press info, try to refresh user record first
      if (user && user.role === 'press' && (!user.press || !user.pressId)) {
        try {
          const freshUser = await pb.collection('users').getOne(user.id);
          if (freshUser.press || freshUser.pers) {
            setUser(prev => prev ? {
              ...prev,
              press: freshUser.press || prev.press,
              pressId: freshUser.pers || prev.pressId
            } : null);
          }
        } catch (e) {
          console.error("Failed to auto-refresh user record:", e);
        }
      }

      const [pressesResult, categoriesResult] = await Promise.all([
        pb.collection('persen').getFullList(),
        pb.collection('categorieen').getFullList()
      ]);

      setPresses(pressesResult.map((p: any) => {
        let catOrder = p.category_order;
        if (typeof catOrder === 'string') {
          try {
            catOrder = JSON.parse(catOrder);
          } catch (e) {
            console.warn('Failed to parse category_order for press', p.naam);
          }
        }
        return {
          id: p.id,
          name: p.naam,
          active: p.status !== 'niet actief',
          archived: p.archived || false,
          category_order: Array.isArray(catOrder) ? catOrder : []
        };
      }));

      setCategories(categoriesResult.map((c: any) => ({
        id: c.id,
        name: c.naam,
        subtexts: c.subtexts || {},
        pressIds: c.presses || [],
        active: c.active !== false
      })));

      try {
        const tagsResult = await pb.collection('tags').getFullList();
        console.log('[Auth] Tags fetched from DB:', tagsResult);
        const mappedTags = tagsResult.map((t: any) => ({
          id: t.id,
          naam: t.naam,
          kleur: t.kleur,
          system_managed: !!t.system_managed,
          active: t.active !== false
        }));
        console.log('[Auth] Mapped tags:', mappedTags);

        setTags(mappedTags);
      } catch (e) {
        console.error('Failed to fetch tags:', e);
      }

      // Set category order from current press if available
      // Set category order from current press if available
      // Set category order logic:
      // 1. If user is Press, use their press's order
      // 2. If user is Admin, use the first active press's order (fallback)
      const targetPressId = user?.pressId || (user?.role === 'admin' && pressesResult.length > 0 ? (pressesResult.find((p: any) => p.status !== 'niet actief')?.id || pressesResult[0].id) : null);

      if (targetPressId) {
        const currentPress = pressesResult.find((p: any) => p.id === targetPressId);
        if (currentPress?.category_order) {
          let order = currentPress.category_order;
          // Handle if stored as stringified JSON
          if (typeof order === 'string') {
            try {
              const parsed = JSON.parse(order);
              if (Array.isArray(parsed)) order = parsed;
            } catch (e) {
              console.error("Failed to parse category order", e);
            }
          }

          if (Array.isArray(order)) {
            setCategoryOrder(order);
          }
        }
      }

      await Promise.all([
        fetchTasks(),
        fetchUserAccounts(),
        fetchOperators(),
        fetchPloegen(),
        fetchPermissions()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    }
  }, [fetchTasks, fetchUserAccounts, fetchOperators, fetchPloegen]);

  const setTestingMode = async (val: boolean) => {
    try {
      let record;
      try {
        record = await pb.collection('app_settings').getFirstListItem('key="testing_mode"');
        await pb.collection('app_settings').update(record.id, { value: val });
      } catch (e) {
        // Create if doesn't exist
        await pb.collection('app_settings').create({ key: 'testing_mode', value: val });
      }
      setTestingModeState(val);
      toast.success(`Test modus ${val ? 'ingeschakeld' : 'uitgeschakeld'}`);
    } catch (e: any) {
      console.error("Failed to set testing mode:", e);
      toast.error(`Kon test modus niet instellen: ${e.message}`);
    }
  };

  const fetchPermissions = useCallback(async () => {
    try {
      const records = await pb.collection('role_permissions').getFullList();
      if (records.length === 0) {
        // Initialize defaults if empty (Fallback)
        const defaults: any[] = [
          {
            role: 'Admin',
            permissions: [
              'tasks_view', 'tasks_edit', 'drukwerken_view', 'drukwerken_view_all', 'drukwerken_create', 'reports_view', 'checklist_view',
              'extern_view', 'management_access', 'manage_personnel', 'manage_categories',
              'manage_tags', 'manage_presses', 'manage_accounts', 'manage_permissions',
              'toolbox_access', 'logs_view', 'feedback_view', 'feedback_manage'
            ]
          },
          {
            role: 'Meestergast',
            permissions: [
              'tasks_view', 'tasks_edit', 'drukwerken_view', 'drukwerken_view_all', 'checklist_view',
              'extern_view', 'logs_view', 'feedback_view'
            ]
          },
          {
            role: 'Operator',
            permissions: ['tasks_view', 'drukwerken_view', 'drukwerken_create', 'feedback_view']
          }
        ];

        // Try to seed initial roles
        for (const def of defaults) {
          try {
            await pb.collection('role_permissions').create(def);
          } catch (e) {
            console.warn(`Failed to seed ${def.role}:`, e);
          }
        }
        const mappedDefaults = defaults.map(d => ({
          role: mapDbRoleToUi(d.role),
          permissions: d.permissions as Permission[]
        }));
        setRolePermissions(mappedDefaults);
      } else {
        setRolePermissions(records.map(r => ({
          role: mapDbRoleToUi(r.role),
          permissions: r.permissions as Permission[]
        })));
      }
    } catch (e) {
      console.error("Fetch permissions failed:", e);
      // Fallback in-memory defaults if collection doesn't exist yet
      setRolePermissions([
        { role: 'admin', permissions: ['tasks_view', 'tasks_edit', 'management_access', 'manage_permissions'] },
        { role: 'meestergast', permissions: ['tasks_view', 'tasks_edit'] },
        { role: 'press', permissions: ['tasks_view', 'drukwerken_create'] }
      ]);
    }
  }, []);

  const updateRolePermissions = async (role: UserRole, permissions: Permission[]) => {
    try {
      const dbRole = mapUiRoleToDb(role);
      const record = await pb.collection('role_permissions').getFirstListItem(`role="${dbRole}"`);
      await pb.collection('role_permissions').update(record.id, { permissions });
      setRolePermissions(prev => prev.map(rp => rp.role === role ? { ...rp, permissions } : rp));
      toast.success(`Rechten bijgewerkt voor ${role}`);
    } catch (e: any) {
      console.error("Update permissions failed:", e);
      // If not found, create
      try {
        const dbRole = mapUiRoleToDb(role);
        await pb.collection('role_permissions').create({ role: dbRole, permissions });
        setRolePermissions(prev => {
          const exists = prev.some(rp => rp.role === role);
          if (exists) return prev.map(rp => rp.role === role ? { ...rp, permissions } : rp);
          return [...prev, { role, permissions }];
        });
        toast.success(`Rechten aangemaakt voor ${role}`);
      } catch (err: any) {
        toast.error(`Kon rechten niet bijwerken: ${err.message}`);
      }
    }
  };

  // --- Backup Functions ---
  const listBackups = async (): Promise<BackupInfo[]> => {
    try {
      const backups = await pb.backups.getFullList();
      return backups.map((b: any) => ({
        key: b.key,
        size: b.size,
        modified: b.modified
      }));
    } catch (e: any) {
      console.error("List backups failed:", e);
      toast.error(`Kon backups niet ophalen: ${e.message}`);
      return [];
    }
  };

  const createBackup = async (name?: string): Promise<boolean> => {
    try {
      // PocketBase requires format: [a-z0-9_-].zip
      // We'll clean the name and ensure it's lowercase
      const timestamp = new Date().toISOString()
        .replace(/[:.]/g, '-')
        .replace('T', '_')
        .replace('Z', '')
        .toLowerCase();

      const cleanName = (name || `backup_${timestamp}`)
        .replace(/[^a-zA-Z0-9_-]/g, '_')
        .toLowerCase();

      const backupName = `${cleanName}.zip`;

      await pb.backups.create(backupName);

      // Also backup rclone config alongside database
      try {
        await fetch(`${pb.baseUrl}/api/config-backup/save`, {
          method: 'POST',
          body: JSON.stringify({ backupName: cleanName }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': pb.authStore.token
          }
        });
      } catch (configErr) {
        console.warn('Config backup failed (non-critical):', configErr);
      }

      // Automatically sync to cloud after backup
      try {
        await fetch(`${pb.baseUrl}/api/cloud-sync/sync-now`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': pb.authStore.token
          }
        });
      } catch (syncErr) {
        console.warn('Auto-sync failed (non-critical):', syncErr);
      }

      toast.success(`Backup "${backupName}" aangemaakt en gesynchroniseerd`);
      return true;
    } catch (e: any) {
      console.error("Create backup failed:", e);
      toast.error(`Backup aanmaken mislukt: ${e.message}`);
      return false;
    }
  };

  const downloadBackup = async (key: string): Promise<string> => {
    try {
      const token = await pb.files.getToken();
      const url = pb.backups.getDownloadUrl(token, key);
      return url;
    } catch (e: any) {
      console.error("Get backup URL failed:", e);
      toast.error(`Backup URL ophalen mislukt: ${e.message}`);
      return '';
    }
  };

  const deleteBackup = async (key: string): Promise<boolean> => {
    try {
      await pb.backups.delete(key);
      toast.success(`Backup "${key}" verwijderd`);
      return true;
    } catch (e: any) {
      console.error("Delete backup failed:", e);
      toast.error(`Backup verwijderen mislukt: ${e.message}`);
      return false;
    }
  };

  const restoreBackup = async (key: string): Promise<boolean> => {
    try {
      // First restore rclone config (before server restart)
      const cleanName = key.replace('.zip', '');
      try {
        await fetch(`${pb.baseUrl}/api/config-backup/restore`, {
          method: 'POST',
          body: JSON.stringify({ backupName: cleanName }),
          headers: {
            'Content-Type': 'application/json',
            'Authorization': pb.authStore.token
          }
        });
      } catch (configErr) {
        console.warn('Config restore failed (non-critical):', configErr);
      }

      await pb.backups.restore(key);
      toast.success(`Systeem wordt hersteld van backup "${key}". De server start nu opnieuw op.`);
      // The server will restart, so connection will be lost.
      // We might want to reload the page or logout after a short delay.
      setTimeout(() => {
        window.location.reload();
      }, 3000);
      return true;
    } catch (e: any) {
      console.error("Restore backup failed:", e);
      toast.error(`Herstel mislukt: ${e.message}`);
      return false;
    }
  };

  const uploadBackup = async (file: File): Promise<boolean> => {
    try {
      await pb.backups.upload({ file: file });
      toast.success(`Backup "${file.name}" succesvol geüpload`);
      return true;
    } catch (e: any) {
      console.error("Upload backup failed:", e);
      toast.error(`Upload mislukt: ${e.message}`);
      return false;
    }
  };

  const getBackupSettings = async (): Promise<BackupSettings | null> => {
    try {
      // 1. Get standard PB system settings for cron
      const settings = await pb.settings.getAll();
      const pbBackups = settings.backups || {};

      // 2. Get custom S3 config from app_settings collection
      let s3Config = {
        enabled: false,
        bucket: '',
        region: '',
        endpoint: '',
        accessKey: '',
        secretKey: '',
        forcePathStyle: false
      };

      try {
        const record = await pb.collection('app_settings').getFirstListItem('key="backup_s3_config"');
        if (record.value) {
          s3Config = { ...s3Config, ...record.value };
        }
      } catch (e) {
        // Not found, use defaults
      }

      return {
        // enabled: pbBackups.cron !== '', // Removed duplicate
        // Actually PB backups are always "enabled" if cron is valid.
        // Let's assume we store the "enabled" state by whether cron is empty or not in standard PB, 
        // OR we just obey the `enabled` boolean from our UI state which might be stored in app_settings too?
        // Let's store a separate `backup_config` in app_settings for enabled state if PB doesn't have it.
        // For now, let's map: 
        enabled: !!pbBackups.cron,
        cron: pbBackups.cron || '',
        cronMaxKeep: pbBackups.cronMaxKeep || 3,
        s3: s3Config
      };
    } catch (e: any) {
      console.error("Get backup settings failed:", e);
      toast.error(`Instellingen ophalen mislukt: ${e.message}`);
      return null;
    }
  };

  const updateBackupSettings = async (settings: Partial<BackupSettings>): Promise<boolean> => {
    try {
      // 1. Update PB System Settings (Cron)
      // Only update if these changed or present
      const cronSettings: any = {};
      if (settings.cron !== undefined) cronSettings.cron = settings.enabled ? settings.cron : '';
      if (settings.cronMaxKeep !== undefined) cronSettings.cronMaxKeep = settings.cronMaxKeep;

      // Update S3 settings inside PB backups config for the internal runner
      if (settings.s3) {
        cronSettings.s3 = {
          enabled: settings.s3.enabled,
          bucket: settings.s3.bucket,
          region: settings.s3.region,
          endpoint: settings.s3.endpoint,
          accessKey: settings.s3.accessKey,
          secretKey: settings.s3.secretKey,
          forcePathStyle: settings.s3.forcePathStyle
        };
      }

      // If "enabled" is false, we might want to clear cron to stop it?
      if (settings.enabled === false) {
        cronSettings.cron = '';
      }

      await pb.settings.update({ backups: cronSettings });

      // 2. Update Custom S3 Config in app_settings
      if (settings.s3) {
        try {
          const record = await pb.collection('app_settings').getFirstListItem('key="backup_s3_config"');
          await pb.collection('app_settings').update(record.id, { value: settings.s3 });
        } catch (e) {
          await pb.collection('app_settings').create({ key: 'backup_s3_config', value: settings.s3 });
        }
      }

      toast.success('Backup instellingen succesvol bijgewerkt');
      return true;
    } catch (e: any) {
      console.error("Update backup settings failed:", e);
      // Detailed error log
      if (e.data) console.error("Validation errors:", e.data);
      toast.error(`Instellingen bijwerken mislukt: ${e.message}`);
      return false;
    }
  };

  const getCloudSyncStatus = async (): Promise<CloudSyncStatus | null> => {
    try {
      const status = await pb.send("/api/cloud-sync/status", { method: "GET" });
      setCloudSyncStatus(status);
      return status;
    } catch (e: any) {
      console.error("Get cloud sync status failed:", e);
      return null;
    }
  };

  const refreshCloudSyncStatus = async () => {
    await getCloudSyncStatus();
  };

  const verifyCloudBackups = async (filenames: string[]): Promise<Record<string, boolean>> => {
    if (!isSuperuser || filenames.length === 0) return {};
    try {
      const response = await fetch(`${window.location.protocol}//${window.location.hostname}:8090/api/cloud-sync/verify-batch?token=${encodeURIComponent(pb.authStore.token)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ filenames })
      });

      if (!response.ok) {
        throw new Error(`Verification failed: ${response.status}`);
      }

      return await response.json();
    } catch (e) {
      console.error('Cloud verification failed:', e);
      return {};
    }
  };

  const configureCloudSync = async (type: 'gdrive' | 'onedrive' | 'local', config: any): Promise<boolean> => {
    try {
      await pb.send("/api/cloud-sync/configure", {
        method: "POST",
        body: { type, config }
      });
      toast.success("Opslag succesvol gekoppeld");
      return true;
    } catch (e: any) {
      console.error("Configure cloud sync failed:", e);
      toast.error(`Koppeling mislukt: ${e.message}`);
      return false;
    }
  };

  const authenticateSuperuser = async (email: string, password: string): Promise<boolean> => {
    try {
      const authData = await pb.collection('_superusers').authWithPassword(email, password);
      if (pb.authStore.isValid && authData.record) {
        setIsSuperuser(true);
        toast.success('Superuser authenticatie succesvol');
        return true;
      }
      return false;
    } catch (e: any) {
      console.error("Superuser auth failed:", e);
      toast.error(`Authenticatie mislukt: ${e.message}`);
      return false;
    }
  };

  useEffect(() => {
    checkFirstRun();
    fetchTestingMode();
    if (user && hasPermission('toolbox_access')) {
      getCloudSyncStatus();
    }
  }, [checkFirstRun, fetchTestingMode, user]);

  // 1. Initialize Auth
  useEffect(() => {
    // Check if valid auth token exists
    if (pb.authStore.isValid) {
      const model = pb.authStore.model;
      if (model) {
        // Detect if we are a superuser (for Backup tab persistence)
        const isSuper = model.collectionName === "_superusers" ||
          model.collectionId === "_superusers" ||
          model.role === "Admin" ||
          model.role === "admin" ||
          (!model.pers && !model.press && model.email);

        if (isSuper) {
          setIsSuperuser(true);
        }

        // Correctly handle press identification
        let pressId = model.pers;
        let pressName = model.press;

        // If pressId is missing but we have a name, we'll try to resolve it in loadData
        // but for now we set what we have.

        setUser({
          id: model.id,
          username: model.username,
          name: model.name,
          role: model.role ? mapDbRoleToUi(model.role) : 'admin',
          press: pressName,
          pressId: pressId
        });
      }
    }
  }, []);




  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      if (!username || !password) return false;

      let identity = username;

      // 1. Try to find the user record first
      try {
        const records = await pb.collection('users').getList(1, 1, {
          filter: `username = "${username}" || email = "${username}"`
        });

        if (records.totalItems > 0) {
          const record = records.items[0];
          // Use the record's email if it's a valid-looking email, otherwise use username
          identity = (record.email && record.email.includes('@') && record.email !== 'undefined')
            ? record.email
            : (record.username || username);
          console.log(`[Auth] Found user record, using identity: ${identity}`);
        }
      } catch (findError) {
        console.warn("[Auth] Pre-auth lookup failed:", findError);
      }

      // 2. Perform the actual authentication
      try {
        const authData = await pb.collection('users').authWithPassword(identity, password);
        if (pb.authStore.isValid && authData.record) {
          setUser({
            id: authData.record.id,
            username: authData.record.username,
            name: authData.record.name,
            role: authData.record.role ? mapDbRoleToUi(authData.record.role) : 'press',
            press: authData.record.press,
            pressId: authData.record.pers
          });
          return true;
        }
      } catch (e) {
        // Fallback for Admin (Superuser) login
        // In PB 0.23, superusers are in the _superusers collection
        if (username.includes('@')) {
          try {
            const authData: any = await pb.collection('_superusers').authWithPassword(username, password);
            if (pb.authStore.isValid && authData.record) {
              setUser({
                id: authData.record.id,
                username: authData.record.email,
                name: 'Admin',
                role: 'admin'
              });
              setIsSuperuser(true);
              return true;
            }
          } catch (adminError) {
            console.error("[Auth] Superuser login failed:", adminError);
          }
        }
        console.error("[Auth] User login failed:", e);
      }

      return false;
    } catch (e) {
      console.error("[Auth] Login process error:", e);
      return false;
    }
  };

  const addTask = async (task: Omit<MaintenanceTask, 'id' | 'created' | 'updated'>) => {
    try {
      console.log('addTask called with:', task);
      console.log('categoryId:', task.categoryId, 'pressId:', task.pressId);

      let finalCategoryId = task.categoryId;
      let finalPressId = task.pressId;

      // Dynamic creation of new categories/presses if they come from the importer
      if (finalPressId?.startsWith('__NEW_PRESS__')) {
        const newName = finalPressId.replace('__NEW_PRESS__', '');
        try {
          const created = await pb.collection('persen').create({
            naam: newName,
            active: true,
            archived: false
          });
          finalPressId = created.id;
          console.log(`[DynamicImport] Created new press: ${newName} (${created.id})`);
        } catch (err) {
          console.error(`Failed to create new press '${newName}':`, err);
        }
      }

      if (finalCategoryId?.startsWith('__NEW_CAT__')) {
        const newName = finalCategoryId.replace('__NEW_CAT__', '');
        try {
          const created = await pb.collection('categorieen').create({
            naam: newName,
            presses: [finalPressId].filter(Boolean),
            active: true
          });
          finalCategoryId = created.id;
          console.log(`[DynamicImport] Created new category: ${newName} (${created.id})`);
        } catch (err) {
          console.error(`Failed to create new category '${newName}':`, err);
        }
      } else if (finalCategoryId && finalPressId) {
        // Fallback: Ensure existing category is linked to the press
        try {
          const catRecord = await pb.collection('categorieen').getOne(finalCategoryId);
          const existingPresses = Array.isArray(catRecord.presses) ? catRecord.presses : [];
          if (!existingPresses.includes(finalPressId)) {
            await pb.collection('categorieen').update(finalCategoryId, {
              presses: [...existingPresses, finalPressId]
            });
            console.log(`[SafetyLink] Linked existing category ${finalCategoryId} to press ${finalPressId}`);
          }
        } catch (err) {
          console.error(`Failed to link existing category ${finalCategoryId} to press ${finalPressId}:`, err);
        }
      }

      const baseData = {
        category: finalCategoryId,
        pers: finalPressId,
        last_date: task.lastMaintenance,
        next_date: task.nextMaintenance,
        interval: task.maintenanceInterval,
        interval_unit: task.maintenanceIntervalUnit === 'days' ? 'Dagen' :
          task.maintenanceIntervalUnit === 'weeks' ? 'Weken' :
            task.maintenanceIntervalUnit === 'months' ? 'Maanden' :
              task.maintenanceIntervalUnit === 'years' ? 'Jaren' : 'Dagen',
        assigned_operator: task.assignedToIds?.filter((_, i) => task.assignedToTypes?.[i] === 'operator' || task.assignedToTypes?.[i] === 'external') || [],
        assigned_team: task.assignedToIds?.filter((_, i) => task.assignedToTypes?.[i] === 'ploeg') || [],
        comment: task.comment || '',
        commentDate: task.commentDate,
        sort_order: task.sort_order || 0,
        is_external: task.isExternal || false,
        tags: Array.isArray(task.tagIds) ? task.tagIds : []
      };

      if (task.subtasks && task.subtasks.length > 0) {
        // Handle Grouped Task: Create a record for each subtask
        const promises = task.subtasks.map(subtask =>
          pb.collection('onderhoud').create({
            ...baseData,
            task: task.task,
            task_subtext: task.taskSubtext,
            subtask: subtask.name,
            subtask_subtext: subtask.subtext,
            opmerkingen: subtask.opmerkingen || task.opmerkingen,
            commentDate: subtask.commentDate || task.commentDate,
            sort_order: subtask.sort_order || 0,
            is_external: subtask.isExternal || task.isExternal || false
          })
        );
        await Promise.all(promises);
        addActivityLog({
          user: user?.username || 'Unknown',
          action: 'Created',
          entity: 'Task',
          entityName: task.task,
          press: task.press || '',
          details: `Created grouped task with ${task.subtasks?.length} subtasks`
        });
      } else {
        // Handle Single Task
        const data = {
          ...baseData,
          task: task.task,
          task_subtext: task.taskSubtext,
          subtask: task.subtaskName || task.task,
          subtask_subtext: task.subtaskSubtext || task.taskSubtext,
          opmerkingen: task.opmerkingen
        };
        console.log('Creating task with data:', data);
        const record = await pb.collection('onderhoud').create(data);
        addActivityLog({
          user: user?.username || 'Unknown',
          action: 'Created',
          entity: 'Task',
          entityId: record.id,
          entityName: task.task !== task.subtaskName ? `${task.task} > ${task.subtaskName}` : task.task,
          press: task.press || '',
          details: `Created task: ${task.subtaskName || task.task}`
        });
      }
      await fetchTasks(); // Refresh list after adding
      if (finalPressId?.startsWith('__NEW_') || finalCategoryId?.startsWith('__NEW_')) {
        await loadData(); // Full reload if base entities were created
      }
    } catch (e) {
      console.error("Add task failed:", e);
      alert("Failed to save to server");
    }
  };

  const updateTask = async (task: MaintenanceTask, refresh: boolean = true) => {
    try {
      // 1. Fetch old record for diffing
      const oldRecord = await pb.collection('onderhoud').getOne(task.id);

      // Split assignments by type for PocketBase relations
      const operatorIds = task.assignedToIds?.filter((_, i) =>
        task.assignedToTypes?.[i] === 'operator' || task.assignedToTypes?.[i] === 'external'
      ) || [];

      const teamIds = task.assignedToIds?.filter((_, i) =>
        task.assignedToTypes?.[i] === 'ploeg'
      ) || [];

      await pb.collection('onderhoud').update(task.id, {
        task: task.task,
        subtask: task.subtaskName || task.task,
        task_subtext: task.taskSubtext,
        subtask_subtext: task.subtaskSubtext || task.taskSubtext,
        category: task.categoryId || null,
        pers: task.pressId || null,
        last_date: task.lastMaintenance,
        next_date: task.nextMaintenance,
        interval: task.maintenanceInterval,
        interval_unit: task.maintenanceIntervalUnit === 'days' ? 'Dagen' :
          task.maintenanceIntervalUnit === 'weeks' ? 'Weken' :
            task.maintenanceIntervalUnit === 'months' ? 'Maanden' :
              task.maintenanceIntervalUnit === 'years' ? 'Jaren' : 'Dagen',
        assigned_operator: operatorIds,
        assigned_team: teamIds,
        opmerkingen: task.opmerkingen,
        comment: task.comment || '',
        commentDate: task.commentDate,
        is_external: task.isExternal || false,
        sort_order: task.sort_order || 0,
        tags: Array.isArray(task.tagIds) ? task.tagIds : []
      });

      // 2. Calculate what changed for the log
      let changedField = '';
      let oldValue = '';
      let newValue = '';

      if (oldRecord.last_date !== (task.lastMaintenance?.toISOString() || null)) {
        changedField = 'Last Date';
        oldValue = oldRecord.last_date ? new Date(oldRecord.last_date).toLocaleDateString() : 'None';
        newValue = task.lastMaintenance ? task.lastMaintenance.toLocaleDateString() : 'None';
      } else if (oldRecord.opmerkingen !== task.opmerkingen) {
        changedField = 'Notes';
        oldValue = oldRecord.opmerkingen || 'None';
        newValue = task.opmerkingen || 'None';
      } else {
        changedField = 'Task Details';
      }

      addActivityLog({
        user: user?.username || 'Unknown',
        action: 'Updated',
        entity: 'Task',
        entityId: task.id,
        entityName: task.task !== task.subtaskName ? `${task.task} > ${task.subtaskName}` : task.task,
        press: task.press || '',
        details: `Updated ${changedField}`,
        oldValue,
        newValue
      });
      if (refresh) {
        await fetchTasks();
      }
    } catch (e) {
      console.error("Update task failed:", e);
    }
  };

  const deleteTask = async (id: string) => {
    try {
      const record = await pb.collection('onderhoud').getOne(id);
      await pb.collection('onderhoud').delete(id);
      addActivityLog({
        user: user?.username || 'Unknown',
        action: 'Deleted',
        entity: 'Task',
        entityId: id,
        entityName: record.task !== record.subtask ? `${record.task} > ${record.subtask}` : record.task,
        press: (record.pers && presses.find(p => p.id === record.pers)?.name) || '',
        details: `Deleted task: ${record.subtask || record.task}`
      });
      await fetchTasks();
    } catch (e) {
      console.error("Delete task failed:", e);
    }
  };

  const sendFeedback = async (type: string, message: string, context?: any): Promise<boolean> => {
    try {
      await pb.collection('feedback').create({
        type,
        message,
        user: user?.username || 'Anonymous',
        status: 'pending',
        context
      });
      return true;
    } catch (e) {
      console.error("Failed to send feedback:", e);
      return false;
    }
  };

  const resolveFeedback = async (id: string) => {
    // Deprecated, use updateFeedback
    return updateFeedback(id, { status: 'completed_success' });
  };

  const fetchFeedback = useCallback(async (): Promise<any[]> => {
    try {
      // Everyone sees all feedback
      const records = await pb.collection('feedback').getFullList({ sort: '-created' });

      return records.map((r: any) => ({
        id: r.id,
        type: r.type,
        message: r.message,
        username: r.user,
        created: r.created,
        status: r.status,
        admin_comment: r.admin_comment,
        archived: r.archived,
        contact_operator: r.context?.operator,
        url: r.context?.url,
        ip: r.context?.ip
      }));
    } catch (e) {
      console.error("Fetch feedback failed", e);
      return [];
    }
  }, [user]);

  const updateFeedback = async (id: string, data: any) => {
    try {
      await pb.collection('feedback').update(id, data);
      return true;
    } catch (e) {
      console.error("Update feedback failed", e);
      return false;
    }
  };

  const deleteFeedback = async (id: string) => {
    try {
      await pb.collection('feedback').delete(id);
      return true;
    } catch (e) {
      console.error("Delete feedback failed", e);
      return false;
    }
  };

  const archiveFeedback = async (id: string) => {
    try {
      await pb.collection('feedback').update(id, { archived: true });
      return true;
    } catch (e) {
      console.error("Archive feedback failed", e);
      return false;
    }
  };

  // --- Stubs for other entities ---
  const addOperator = async (operator: Omit<Operator, 'id'>) => {
    try {
      // Store press names directly as JSON array
      await pb.collection('operatoren').create({
        naam: operator.name,
        interne_id: operator.employeeId,
        dienstverband: 'Intern',
        presses: operator.presses, // Direct names array
        active: operator.active,
        can_edit_tasks: operator.canEditTasks,
        can_access_management: operator.canAccessOperatorManagement
      });
      await fetchOperators();
    } catch (e: any) {
      toast.error(`Failed to add operator: ${e.message}`);
    }
  };

  const updateOperator = async (operator: Operator) => {
    try {
      console.log('Updating operator:', operator.name, 'with presses:', operator.presses);

      // Store press names directly as JSON array
      await pb.collection('operatoren').update(operator.id, {
        naam: operator.name,
        interne_id: operator.employeeId,
        presses: operator.presses, // Direct names array
        active: operator.active,
        can_edit_tasks: operator.canEditTasks,
        can_access_management: operator.canAccessOperatorManagement
      });
      await fetchOperators();
    } catch (e: any) {
      console.error('Failed to update operator:', e);
      toast.error(`Failed to update operator: ${e.message}`);
    }
  };

  const deleteOperator = async (id: string) => {
    try {
      await pb.collection('operatoren').delete(id);
      await fetchOperators();
    } catch (e: any) {
      toast.error(`Failed to delete operator: ${e.message}`);
    }
  };

  const addExternalEntity = async (entity: Omit<ExternalEntity, 'id'>) => {
    try {
      // Store press names directly as JSON array
      await pb.collection('operatoren').create({
        naam: entity.name,
        dienstverband: 'Extern',
        presses: entity.presses, // Direct names array
        active: entity.active
      });
      await fetchOperators();
    } catch (e: any) {
      toast.error(`Failed to add external entity: ${e.message}`);
    }
  };

  const updateExternalEntity = async (entity: ExternalEntity) => {
    try {
      // Store press names directly as JSON array
      await pb.collection('operatoren').update(entity.id, {
        naam: entity.name,
        presses: entity.presses, // Direct names array
        active: entity.active
      });
      await fetchOperators();
    } catch (e: any) {
      toast.error(`Failed to update external entity: ${e.message}`);
    }
  };

  const deleteExternalEntity = async (id: string) => {
    try {
      await pb.collection('operatoren').delete(id);
      await fetchOperators();
    } catch (e: any) {
      toast.error(`Failed to delete external entity: ${e.message}`);
    }
  };

  const addPloeg = async (ploeg: Omit<Ploeg, 'id'>) => {
    try {
      const pressId = presses.find(p => ploeg.presses.includes(p.name))?.id;
      await pb.collection('ploegen').create({
        naam: ploeg.name,
        pers: pressId,
        leden: ploeg.operatorIds,
        active: ploeg.active
      });
      await fetchPloegen();
    } catch (e: any) {
      toast.error(`Failed to add ploeg: ${e.message}`);
    }
  };

  const updatePloeg = async (ploeg: Ploeg) => {
    try {
      const pressId = presses.find(p => ploeg.presses.includes(p.name))?.id;
      await pb.collection('ploegen').update(ploeg.id, {
        naam: ploeg.name,
        pers: pressId,
        leden: ploeg.operatorIds,
        active: ploeg.active
      });
      await fetchPloegen();
    } catch (e: any) {
      toast.error(`Failed to update ploeg: ${e.message}`);
    }
  };

  const deletePloeg = async (id: string) => {
    try {
      await pb.collection('ploegen').delete(id);
      await fetchPloegen();
    } catch (e: any) {
      toast.error(`Failed to delete ploeg: ${e.message}`);
    }
  };

  const getElevatedOperators = () => {
    return operators.filter(op => op.canAccessOperatorManagement || op.canEditTasks);
  };

  const fetchParameters = useCallback(async () => { return {}; }, []);
  // --- Category & Press Management ---

  const addCategory = async (category: Omit<Category, 'id'>) => {
    try {
      await pb.collection('categorieen').create({
        naam: category.name,
        subtexts: category.subtexts || {},
        presses: category.pressIds,
        active: category.active
      });
      await loadData();
      return true;
    } catch (e: any) {
      toast.error(`Failed to add category: ${e.message}`);
      return false;
    }
  };

  const updateCategory = async (category: Category) => {
    try {
      await pb.collection('categorieen').update(category.id, {
        naam: category.name,
        subtexts: category.subtexts || {},
        presses: category.pressIds,
        active: category.active
      });
      await loadData();
      return true;
    } catch (e: any) {
      toast.error(`Failed to update category: ${e.message}`);
      return false;
    }
  };

  const deleteCategory = async (id: string) => {
    try {
      await pb.collection('categorieen').delete(id);
      await loadData();
    } catch (e: any) {
      toast.error(`Failed to delete category: ${e.message}`);
    }
  };

  const addTag = async (tag: Omit<Tag, 'id'>) => {
    try {
      await pb.collection('tags').create({
        naam: tag.naam,
        kleur: tag.kleur,
        active: tag.active
      });
      await loadData();
      return true;
    } catch (e: any) {
      toast.error(`Failed to add tag: ${e.message}`);
      return false;
    }
  };

  const updateTag = async (tag: Tag) => {
    try {
      const existing = tags.find(t => t.id === tag.id);
      if (existing?.system_managed && tag.naam !== existing.naam) {
        toast.error('Systeem tags kunnen niet hernoemd worden');
        return false;
      }

      await pb.collection('tags').update(tag.id, {
        naam: tag.naam,
        kleur: tag.kleur,
        active: tag.active,
        system_managed: tag.system_managed
      });
      await loadData();
      return true;
    } catch (e: any) {
      toast.error(`Failed to update tag: ${e.message}`);
      return false;
    }
  };

  const deleteTag = async (id: string) => {
    try {
      const tag = tags.find(t => t.id === id);
      if (tag?.system_managed) {
        toast.error('Systeem tags kunnen niet verwijderd worden');
        return;
      }

      await pb.collection('tags').delete(id);
      await loadData();
    } catch (e: any) {
      toast.error(`Failed to delete tag: ${e.message}`);
    }
  };

  const updateCategoryOrder = async (order: string[]) => {
    setCategoryOrder(order);
    if (user?.pressId) {
      try {
        await pb.collection('persen').update(user.pressId, {
          category_order: order
        });
      } catch (e: any) {
        console.error("Failed to persist category order:", e);
      }
    }
  };

  const updatePressCategoryOrder = async (pressId: string, order: string[]) => {
    try {
      await pb.collection('persen').update(pressId, {
        category_order: order
      });

      // Update local state if the modified press is currently loaded in presses list
      setPresses(prev => prev.map(p => {
        if (p.id === pressId) {
          return { ...p, category_order: order };
        }
        return p;
      }));

      // If we updated the CURRENT user's press, update the local categoryOrder state too
      // If we updated the CURRENT user's press OR if user is Admin (to see the effect), update local state
      if (user?.pressId === pressId || user?.role === 'admin') {
        setCategoryOrder(order);
      }

      return true;
    } catch (e: any) {
      console.error("Failed to update press category order:", e);
      throw e;
    }
  };

  const addPress = async (press: Omit<Press, 'id'>) => {
    try {
      if (!press.name || !press.name.trim()) {
        toast.error('Voer a.u.b. de naam van de pers in');
        return;
      }

      // Debug: Check auth status
      console.log('Auth valid?', pb.authStore.isValid);
      console.log('Auth token?', pb.authStore.token ? 'Yes' : 'No');

      const data = {
        naam: press.name.trim(),
        status: press.active ? 'actief' : 'niet actief'
      };
      console.log('Creating press with data:', data);
      const createdPress = await pb.collection('persen').create(data);

      // Auto-create user account for this press
      const pressName = press.name.trim();
      const username = pressName.toLowerCase().replace(/\s+/g, '_');
      const password = pressName + '12345';

      try {
        await pb.collection('users').create({
          username: username,
          email: `${username}@press.local`,
          name: pressName,
          password: password,
          passwordConfirm: password,
          role: 'press',
          press: pressName,
          pers: createdPress.id
        });
        console.log(`Auto-created account for press: ${pressName}`);
        toast.success(`Pers "${pressName}" toegevoegd met account (wachtwoord: ${password})`);
      } catch (userError: any) {
        console.warn('Failed to auto-create user account:', userError);
        toast.success('Pers succesvol toegevoegd (account kon niet automatisch aangemaakt worden)');
      }

      await loadData();
      await fetchUserAccounts();
    } catch (e: any) {
      console.error('Failed to add press - Full error:', e);
      console.error('Error data:', JSON.stringify(e.data || e.response?.data));
      toast.error(`Failed to add press: ${e.message}`);
    }
  };

  const updatePress = async (press: Press) => {
    try {
      await pb.collection('persen').update(press.id, {
        naam: press.name,
        status: press.active ? 'actief' : 'niet actief'
        // archived: press.archived // Uncomment after migration 1700000019 is applied
      });
      await loadData();
    } catch (e: any) {
      toast.error(`Failed to update press: ${e.message}`);
    }
  };

  const deletePress = async (id: string) => {
    try {
      await pb.collection('persen').delete(id);
      await loadData();
    } catch (e: any) {
      toast.error(`Failed to delete press: ${e.message}`);
    }
  };

  // --- User Account Management ---

  const addUserAccount = async (account: UserAccount) => {
    try {
      const pressId = presses.find(p => p.name === account.press)?.id;

      await pb.collection('users').create({
        username: account.username,
        email: `${account.username}@example.com`,
        name: account.name,
        password: account.password,
        passwordConfirm: account.password,
        role: mapUiRoleToDb(account.role),
        press: account.press,
        pers: pressId, // Save the relation
        plain_password: account.password // Store for Quick Login in testing
      });

      await fetchUserAccounts();
      toast.success(`User ${account.username} created`);
      return true;
    } catch (e: any) {
      toast.error(`Failed to add user: ${e.message}`);
      return false;
    }
  };

  const updateUserAccount = async (username: string, updates: Partial<UserAccount>) => {
    try {
      const usr = userAccounts.find(u => u.username === username);
      if (!usr) throw new Error("User not found");

      const pressId = presses.find(p => p.name === (updates.press || usr.press))?.id;

      await pb.collection('users').update(usr.id, {
        name: updates.name,
        role: mapUiRoleToDb(updates.role || usr.role),
        press: updates.press,
        pers: pressId // Update the relation
      });
      await fetchUserAccounts();
      toast.success(`User ${username} updated`);
      return true;
    } catch (e: any) {
      toast.error(`Failed to update user: ${e.message}`);
      return false;
    }
  };

  const deleteUserAccount = async (username: string) => {
    try {
      const usr = userAccounts.find(u => u.username === username);
      if (!usr) throw new Error("User not found");
      await pb.collection('users').delete(usr.id);
      await fetchUserAccounts();
      toast.success(`User ${username} deleted`);
    } catch (e: any) {
      toast.error(`Failed to delete user: ${e.message}`);
    }
  };

  const changePassword = async (username: string, newPw: string) => {
    try {
      const usr = userAccounts.find(u => u.username === username);
      if (!usr) throw new Error("User not found");
      await pb.collection('users').update(usr.id, {
        password: newPw,
        passwordConfirm: newPw
      });
      toast.success(`Password updated for ${username}`);
    } catch (e: any) {
      toast.error(`Failed to change password: ${e.message}`);
    }
  };

  // 4. Initial Data Load
  useEffect(() => {
    if (user) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only reload if user identity changes

  // 5. Separate pressId resolution to prevent loops
  useEffect(() => {
    if (user && !user.pressId && user.press && presses.length > 0) {
      const matchingPress = presses.find(p => p.name === user.press);
      if (matchingPress) {
        console.log("Resolving pressId for user:", user.username, "->", matchingPress.id);
        setUser(prev => prev ? { ...prev, pressId: matchingPress.id } : null);
      }
    }
  }, [user?.press, user?.pressId, presses]);

  // 6. Stabilized Realtime Subscriptions
  // NOTE: We intentionally exclude callback functions from dependencies.
  // Subscriptions should only be set up once per user session to prevent
  // infinite loops from callback reference changes.
  useEffect(() => {
    if (!user) return;

    let isSubscribed = true;
    const subscribeAll = async () => {
      try {
        await Promise.all([
          pb.collection('onderhoud').subscribe('*', () => { if (isSubscribed) fetchTasks(); }),
          pb.collection('persen').subscribe('*', () => { if (isSubscribed) loadData(); }),
          pb.collection('categorieen').subscribe('*', () => { if (isSubscribed) loadData(); }),
          pb.collection('tags').subscribe('*', () => { if (isSubscribed) loadData(); }),
          pb.collection('operatoren').subscribe('*', () => { if (isSubscribed) fetchOperators(); }),
          pb.collection('ploegen').subscribe('*', () => { if (isSubscribed) fetchPloegen(); }),
          pb.collection('drukwerken').subscribe('*', () => { if (isSubscribed) window.dispatchEvent(new CustomEvent('pb-drukwerken-changed')); }),
          pb.collection('press_parameters').subscribe('*', () => { if (isSubscribed) window.dispatchEvent(new CustomEvent('pb-parameters-changed')); })
        ]);
        if (isSubscribed) {
          console.log("Realtime subscriptions established");
        }
      } catch (err) {
        if (isSubscribed) {
          console.error("Realtime subscription failed:", err);
        }
      }
    };

    subscribeAll();

    return () => {
      isSubscribed = false;
      // Wrap unsubscribe in try-catch to prevent "Missing or invalid client id" errors
      try { pb.collection('onderhoud').unsubscribe('*'); } catch (e) { /* ignore */ }
      try { pb.collection('persen').unsubscribe('*'); } catch (e) { /* ignore */ }
      try { pb.collection('categorieen').unsubscribe('*'); } catch (e) { /* ignore */ }
      try { pb.collection('operatoren').unsubscribe('*'); } catch (e) { /* ignore */ }
      try { pb.collection('ploegen').unsubscribe('*'); } catch (e) { /* ignore */ }
      try { pb.collection('drukwerken').unsubscribe('*'); } catch (e) { /* ignore */ }
      try { pb.collection('press_parameters').unsubscribe('*'); } catch (e) { /* ignore */ }
      console.log("Realtime subscriptions cleared");
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only re-run when user identity changes

  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      operators,
      addOperator,
      updateOperator,
      deleteOperator,
      activityLogs,
      addActivityLog,
      presses,
      addPress,
      updatePress,
      deletePress,
      userAccounts,
      changePassword,
      addUserAccount,
      updateUserAccount,
      deleteUserAccount,
      getElevatedOperators,
      tasks: tasksState,
      fetchTasks,
      fetchActivityLogs,
      fetchUserAccounts,
      addTask,
      updateTask,
      deleteTask,
      externalEntities,
      addExternalEntity,
      updateExternalEntity,
      deleteExternalEntity,
      ploegen,
      addPloeg,
      updatePloeg,
      deletePloeg,
      categories,
      addCategory,
      updateCategory,
      deleteCategory,
      categoryOrder,
      updateCategoryOrder,
      updatePressCategoryOrder,
      sendFeedback,
      fetchFeedback,
      resolveFeedback,
      updateFeedback,
      deleteFeedback,
      archiveFeedback,
      fetchParameters,
      tags,
      addTag,
      updateTag,
      deleteTag,
      isFirstRun: isFirstRun,
      onboardingDismissed,
      setOnboardingDismissed,
      testingMode,
      setTestingMode,
      checkFirstRun,
      hasPermission,
      rolePermissions,
      updateRolePermissions,
      listBackups,
      createBackup,
      downloadBackup,
      deleteBackup,
      restoreBackup,
      uploadBackup,
      getBackupSettings,
      updateBackupSettings,
      getCloudSyncStatus,
      cloudSyncStatus,
      refreshCloudSyncStatus,
      configureCloudSync,
      verifyCloudBackups,
      isSuperuser,
      authenticateSuperuser
    }}>
      {children}
    </AuthContext.Provider >
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
