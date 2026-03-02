import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useState,
    ReactNode,
} from 'react';
import { pb } from './AuthContext';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AppTheme {
    id: string;
    theme_name: string;
    is_active: boolean;
    primary_color: string;
    background_color: string;
    text_color: string;
    border_radius: string;
    /** Full URL to the logo file, or null if none uploaded */
    logo_url: string | null;
}

interface ThemeContextType {
    theme: AppTheme | null;
    isLoading: boolean;
    /** Re-fetch the active theme from PocketBase on demand */
    refreshTheme: () => void;
}

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────

const ThemeContext = createContext<ThemeContextType>({
    theme: null,
    isLoading: true,
    refreshTheme: () => { },
});

export function useTheme(): ThemeContextType {
    return useContext(ThemeContext);
}

// ─────────────────────────────────────────────────────────────────────────────
// CSS injection
// Injects hex color values directly — valid CSS colors that work everywhere
// (background-color: var(--background), color: var(--foreground), etc.)
// ─────────────────────────────────────────────────────────────────────────────

function applyTheme(theme: AppTheme | null): void {
    const root = document.documentElement;

    if (!theme) {
        // Remove overrides so globals.css hex fallbacks take over
        root.style.removeProperty('--primary');
        root.style.removeProperty('--background');
        root.style.removeProperty('--foreground');
        root.style.removeProperty('--radius');
        return;
    }

    root.style.setProperty('--primary', theme.primary_color);
    root.style.setProperty('--background', theme.background_color);
    root.style.setProperty('--foreground', theme.text_color);
    root.style.setProperty('--radius', theme.border_radius || '0.5rem');
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [theme, setTheme] = useState<AppTheme | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchTheme = useCallback(async () => {
        try {
            const record = await pb
                .collection('app_themes')
                .getFirstListItem('is_active=true');

            const logoUrl = record.logo
                ? pb.files.getURL(record, record.logo)
                : null;

            const active: AppTheme = {
                id: record.id,
                theme_name: record.theme_name,
                is_active: record.is_active,
                primary_color: record.primary_color || '#2563eb',
                background_color: record.background_color || '#ffffff',
                text_color: record.text_color || '#0f172a',
                border_radius: record.border_radius || '0.5rem',
                logo_url: logoUrl,
            };

            setTheme(active);
            applyTheme(active);
        } catch (e: any) {
            // No active theme found or collection doesn't exist yet – use defaults
            if (e?.status !== 404 && e?.status !== 400) {
                console.warn('[ThemeProvider] Could not fetch active theme:', e);
            }
            setTheme(null);
            applyTheme(null);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Fetch on mount
    useEffect(() => {
        fetchTheme();
    }, [fetchTheme]);

    return (
        <ThemeContext.Provider value={{ theme, isLoading, refreshTheme: fetchTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}
