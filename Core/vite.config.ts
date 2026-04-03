
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import fs from 'fs';
import { execSync } from 'child_process';

const CHANGELOG_FALLBACK = path.resolve(__dirname, 'changelog.json');

function parseGitLog(): any[] {
  try {
    const log = execSync('git log -n 50 --pretty=format:"%H%n%cd%n%s%n%b%n===EOC===" --date=short').toString();
    const commits: any[] = [];
    const blocks = log.split('===EOC===').map(s => s.trim()).filter(Boolean);
    
    for (const block of blocks) {
      const lines = block.split('\n');
      if (lines.length >= 3) {
        const hash = lines[0];
        const date = lines[1];
        let subject = lines[2];
        const body = lines.slice(3).join('\n').trim();
        
        let version = null;
        const versionMatch = subject.match(/^(\d+\.\d+\.\d+)\s*[|]?\s*(.*)/);
        if (versionMatch) {
          version = versionMatch[1];
          subject = versionMatch[2].trim();
        }
        
        let type = 'chore';
        const lowerSubject = subject.toLowerCase() + '\n' + body.toLowerCase();
        if (lowerSubject.includes('bug') || lowerSubject.includes('fix')) type = 'bug';
        else if (lowerSubject.includes('nieuw') || lowerSubject.includes('feature') || lowerSubject.includes('add')) type = 'feature';
        
        commits.push({ id: hash, version, date, title: subject, body, type });
      }
    }
    return commits;
  } catch {
    return [];
  }
}

function gitChangelogPlugin() {
  const virtualModuleId = 'virtual:changelog';
  const resolvedVirtualModuleId = '\0' + virtualModuleId;

  return {
    name: 'vite-plugin-git-changelog',
    resolveId(id: string) {
      if (id === virtualModuleId) {
        return resolvedVirtualModuleId;
      }
    },
    load(id: string) {
      if (id === resolvedVirtualModuleId) {
        let commits = parseGitLog();

        // If git returned a good amount of history, persist it as fallback
        if (commits.length > 5) {
          try {
            fs.writeFileSync(CHANGELOG_FALLBACK, JSON.stringify(commits, null, 2));
          } catch { /* ignore write errors */ }
        } else {
          // Shallow clone or no git — try the fallback file
          try {
            if (fs.existsSync(CHANGELOG_FALLBACK)) {
              const fallback = JSON.parse(fs.readFileSync(CHANGELOG_FALLBACK, 'utf-8'));
              if (fallback.length > commits.length) {
                commits = fallback;
              }
            }
          } catch { /* ignore read errors */ }
        }

        return `export default ${JSON.stringify(commits)};`;
      }
    }
  };
}

export default defineConfig({
  plugins: [react(), gitChangelogPlugin()],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      'vaul@1.1.2': 'vaul',
      'sonner@2.0.3': 'sonner',
      'recharts@2.15.2': 'recharts',
      'react-resizable-panels@2.1.7': 'react-resizable-panels',
      'react-hook-form@7.55.0': 'react-hook-form',
      'react-day-picker@8.10.1': 'react-day-picker',
      'next-themes@0.4.6': 'next-themes',
      'lucide-react@0.487.0': 'lucide-react',
      'input-otp@1.4.2': 'input-otp',
      'embla-carousel-react@8.6.0': 'embla-carousel-react',
      'cmdk@1.1.1': 'cmdk',
      'class-variance-authority@0.7.1': 'class-variance-authority',
      '@radix-ui/react-tooltip@1.1.8': '@radix-ui/react-tooltip',
      '@radix-ui/react-toggle@1.1.2': '@radix-ui/react-toggle',
      '@radix-ui/react-toggle-group@1.1.2': '@radix-ui/react-toggle-group',
      '@radix-ui/react-tabs@1.1.3': '@radix-ui/react-tabs',
      '@radix-ui/react-switch@1.1.3': '@radix-ui/react-switch',
      '@radix-ui/react-slot@1.1.2': '@radix-ui/react-slot',
      '@radix-ui/react-slider@1.2.3': '@radix-ui/react-slider',
      '@radix-ui/react-separator@1.1.2': '@radix-ui/react-separator',
      '@radix-ui/react-select@2.1.6': '@radix-ui/react-select',
      '@radix-ui/react-scroll-area@1.2.3': '@radix-ui/react-scroll-area',
      '@radix-ui/react-radio-group@1.2.3': '@radix-ui/react-radio-group',
      '@radix-ui/react-progress@1.1.2': '@radix-ui/react-progress',
      '@radix-ui/react-popover@1.1.6': '@radix-ui/react-popover',
      '@radix-ui/react-navigation-menu@1.2.5': '@radix-ui/react-navigation-menu',
      '@radix-ui/react-menubar@1.1.6': '@radix-ui/react-menubar',
      '@radix-ui/react-label@2.1.2': '@radix-ui/react-label',
      '@radix-ui/react-hover-card@1.1.6': '@radix-ui/react-hover-card',
      '@radix-ui/react-dropdown-menu@2.1.6': '@radix-ui/react-dropdown-menu',
      '@radix-ui/react-dialog@1.1.6': '@radix-ui/react-dialog',
      '@radix-ui/react-context-menu@2.2.6': '@radix-ui/react-context-menu',
      '@radix-ui/react-collapsible@1.1.3': '@radix-ui/react-collapsible',
      '@radix-ui/react-checkbox@1.1.4': '@radix-ui/react-checkbox',
      '@radix-ui/react-avatar@1.1.3': '@radix-ui/react-avatar',
      '@radix-ui/react-aspect-ratio@1.1.2': '@radix-ui/react-aspect-ratio',
      '@radix-ui/react-alert-dialog@1.1.6': '@radix-ui/react-alert-dialog',
      '@radix-ui/react-accordion@1.2.3': '@radix-ui/react-accordion',
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
  },
  server: {
    port: 3000,
    open: true,
  },
});