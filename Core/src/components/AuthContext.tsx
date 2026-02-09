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
  press: string; // Name for display
  pressId: string; // ID for relations
  subtasks: Subtask[];
  isHighlightGroup?: boolean;
  highlightColor?: string;
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
  isHighlight?: boolean;
  highlightColor?: string;
  highlightTag?: string;
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
  | 'logs_view_all'
  | 'feedback_view'
  | 'feedback_manage';

export interface RolePermissions {
  role: UserRole;
  permissions: Permission[];
}

export interface User {
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
  dienstverband?: 'Intern' | 'Extern';
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

export interface FeedbackItem {
  id: string;
  type: 'bug' | 'feature' | 'other';
  message: string;
  user_agent?: string;
  url?: string;
  created: string;
  username?: string;
  ip?: string;
  contact_operator?: string;
  status?: 'pending' | 'planned' | 'in_progress' | 'completed' | 'rejected';
  admin_comment?: string;
  archived?: boolean;
  show_on_roadmap?: boolean;
  roadmap_status?: 'planned' | 'in_progress' | 'completed';
  roadmap_title?: string;
  completed_version?: string;
  completed_at?: string;
}

export const EXTERNAL_TAG_NAME = 'Extern';

export interface Tag {
  id: string;
  naam: string;
  kleur?: string;
  active: boolean;
  system_managed?: boolean;
  highlights?: {
    enabled: boolean;
    days: number[]; // 0-6 (Sun-Sat)
    allDay: boolean;
    startTime: string; // "HH:mm"
    endTime: string; // "HH:mm"
    method: 'category' | 'dot';
    cutoffDays?: number | null;
  }[];
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
  fetchActivityLogs: () => Promise<void>;
  activityLogs: ActivityLog[];
  addActivityLog: (log: Omit<ActivityLog, 'id' | 'timestamp'>) => Promise<void>;
  userAccounts: UserAccount[];
  presses: Press[];
  fetchUserAccounts: () => Promise<void>;
  sendFeedback: (type: string, message: string, context?: any) => Promise<boolean>;
  fetchFeedback: () => Promise<any[]>;
  resolveFeedback?: (id: string) => Promise<boolean>;
  updateFeedback?: (id: string, data: any) => Promise<boolean>;
  deleteFeedback?: (id: string) => Promise<boolean>;
  archiveFeedback?: (id: string) => Promise<boolean>;
  fetchParameters: () => Promise<Record<string, any>>;
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
  getSystemSetting: (key: string, defaultValue: any) => any;
  updateSystemSetting: (key: string, value: any) => Promise<boolean>;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [userAccounts, setUserAccounts] = useState<UserAccount[]>([]);
  const [rolePermissions, setRolePermissions] = useState<RolePermissions[]>([]);
  const [onboardingDismissedState, setOnboardingDismissedState] = useState<boolean>(() => {
    return localStorage.getItem('onboarding_dismissed') === 'true';
  });
  const [testingMode, setTestingModeState] = useState<boolean>(false);
  const [isFirstRun, setIsFirstRun] = useState<boolean>(false);
  const [isSuperuser, setIsSuperuser] = useState<boolean>(false);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<CloudSyncStatus | null>(null);
  const [systemSettings, setSystemSettings] = useState<Record<string, any>>({});
  const [presses, setPresses] = useState<Press[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);


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

  const hasPermission = useCallback((permission: Permission): boolean => {
    if (!user) return false;
    // Admins have all permissions by default as a safety net
    if (user.role === 'admin') return true;

    const roleData = rolePermissions.find(rp => rp.role === user.role);
    if (!roleData) return false;

    return roleData.permissions.includes(permission);
  }, [user, rolePermissions]);

  // --- Data Fetching ---
  const fetchTestingMode = useCallback(async () => {
    try {
      const record = await pb.collection('app_settings').getFirstListItem('key="testing_mode"');
      setTestingModeState(record.value === true);
    } catch (e) {
      setTestingModeState(false);
    }
  }, []);

  const fetchSystemSettings = useCallback(async () => {
    try {
      const records = await pb.collection('app_settings').getFullList();
      const settings: Record<string, any> = {};
      records.forEach(r => {
        settings[r.key] = r.value;
      });
      setSystemSettings(settings);
    } catch (e) {
      console.warn("Failed to fetch system settings", e);
    }
  }, []);

  const getSystemSetting = (key: string, defaultValue: any) => {
    return systemSettings[key] ?? defaultValue;
  };

  const updateSystemSetting = async (key: string, value: any) => {
    try {
      let record;
      try {
        record = await pb.collection('app_settings').getFirstListItem(`key="${key}"`);
      } catch (e) {
        // Not found, create it
      }

      if (record) {
        await pb.collection('app_settings').update(record.id, { value });
      } else {
        await pb.collection('app_settings').create({ key, value });
      }

      setSystemSettings(prev => ({ ...prev, [key]: value }));
      toast.success("Instelling opgeslagen");
      return true;
    } catch (e: any) {
      console.error("Update setting failed:", e);
      toast.error(`Opslaan mislukt: ${e.message}`);
      return false;
    }
  };

  const checkFirstRun = useCallback(async () => {
    try {
      const result = await pb.collection('users').getList(1, 1);
      setIsFirstRun(result.totalItems === 0);
    } catch (e) {
      setIsFirstRun(true);
    }
  }, []);

  const fetchPresses = useCallback(async () => {
    try {
      const records = await pb.collection('persen').getFullList({ sort: 'naam' });
      setPresses(records.map((r: any) => ({
        id: r.id,
        name: r.naam,
        active: r.active !== false,
        archived: r.archived === true
      })));
    } catch (e) {
      console.error("Fetch presses failed", e);
    }
  }, []);

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
        const defaults = [
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
        return;
      }

      setRolePermissions(records.map((r: any) => ({
        role: mapDbRoleToUi(r.role),
        permissions: r.permissions as Permission[]
      })));
    } catch (e) {
      console.error("Fetch permissions failed:", e);
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

  const loadData = useCallback(async () => {
    try {
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

      await Promise.all([
        fetchUserAccounts(),
        fetchPermissions(),
        fetchActivityLogs(),
        fetchPresses()
      ]);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [user, fetchUserAccounts, fetchPermissions, fetchActivityLogs, fetchPresses]);

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
      // Only toast if it's NOT a permission error, to avoid spamming normal users
      if (e.status !== 403) {
        toast.error(`Kon backups niet ophalen: ${e.message}`);
      }
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
      // Only toast if it's NOT a permission error
      if (e.status !== 403) {
        toast.error(`Instellingen ophalen mislukt: ${e.message}`);
      }
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
    fetchSystemSettings();
    if (user && hasPermission('toolbox_access')) {
      getCloudSyncStatus();
    }
  }, [checkFirstRun, fetchTestingMode, fetchSystemSettings, user]);

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
          model.role === "admin";

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
        // Note: We do NOT set isLoading(false) here. 
        // We wait for loadData() to finish (triggered by setUser) to ensure permissions/presses are loaded.
      } else {
        // Valid token but no model? Should not happen usually, but treat as not logged in
        setIsLoading(false);
      }
    } else {
      // No valid token, so we are definitely done loading (and not logged in)
      setIsLoading(false);
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



  const sendFeedback = async (type: string, message: string, context?: any): Promise<boolean> => {
    try {
      await pb.collection('feedback').create({
        type,
        message,
        user: user?.username || 'Anonymous',
        status: 'pending',
        contact_operator: context?.operator || '',
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


  // --- Stubs for other entities ---
  const fetchParameters = useCallback(async () => { return {}; }, []);

  // 4. Initial Data Load
  useEffect(() => {
    if (user) {
      loadData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]); // Only reload if user identity changes


  return (
    <AuthContext.Provider value={{
      user,
      login,
      logout,
      activityLogs,
      addActivityLog,
      fetchActivityLogs,
      userAccounts,
      presses,
      fetchUserAccounts,
      sendFeedback,
      fetchFeedback,
      resolveFeedback,
      updateFeedback,
      deleteFeedback,
      archiveFeedback,
      fetchParameters,
      isFirstRun,
      onboardingDismissed: onboardingDismissedState,
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
      authenticateSuperuser,
      getSystemSetting,
      updateSystemSetting,
      isLoading
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
