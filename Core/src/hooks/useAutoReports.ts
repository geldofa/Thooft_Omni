import { useEffect, useRef } from 'react';
import { pb } from '../lib/pocketbase';
import { generatePresetReport, type ReportPreset } from '../utils/generateReport';

const CHECK_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const GRACE_PERIOD_MS = 5 * 60 * 1000; // 5 min gap between last_run and latest file

/**
 * App-level hook that automatically detects and processes pending report runs.
 * Runs on mount and every 5 minutes. Only processes one report per cycle to avoid overload.
 */
export function useAutoReports(enabled: boolean) {
  const isProcessing = useRef(false);
  const processedIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!enabled) return;

    const checkAndProcess = async () => {
      if (isProcessing.current) return;
      isProcessing.current = true;

      try {
        // 1. Fetch all auto-generate presets
        const presets = await pb.collection('maintenance_reports').getFullList<ReportPreset>({
          filter: 'auto_generate = true',
          sort: 'name'
        });

        if (presets.length === 0) {
          isProcessing.current = false;
          return;
        }

        // 2. Fetch latest archive files
        const archiveFiles = await pb.collection('report_files').getFullList({
          sort: '-generated_at',
          expand: 'maintenance_report'
        });

        // 3. Check each preset for missed runs
        for (const preset of presets) {
          if (!preset.last_run) continue;
          // Don't re-process in this session
          if (processedIds.current.has(preset.id)) continue;

          const lastRunDate = new Date(preset.last_run);
          const filesForPreset = archiveFiles.filter(
            (f: any) => f.maintenance_report === preset.id
          );

          let needsGeneration = false;

          if (filesForPreset.length === 0) {
            // No files at all — needs generation
            needsGeneration = true;
          } else {
            const latestFileDate = new Date((filesForPreset[0] as any).generated_at);
            // last_run is significantly newer than latest file
            if (lastRunDate.getTime() > latestFileDate.getTime() + GRACE_PERIOD_MS) {
              needsGeneration = true;
            }
          }

          if (needsGeneration) {
            console.log(`[AutoReports] Catch-up triggered for: ${preset.name}`);
            processedIds.current.add(preset.id);

            try {
              await generatePresetReport(preset, 'auto', 'Systeem');
              console.log(`[AutoReports] Successfully generated: ${preset.name}`);
            } catch (err) {
              console.error(`[AutoReports] Failed to generate: ${preset.name}`, err);
            }

            // Only process one per cycle to avoid blocking
            break;
          }
        }
      } catch (err) {
        console.error('[AutoReports] Check failed:', err);
      } finally {
        isProcessing.current = false;
      }
    };

    // Run on mount
    const initialTimeout = setTimeout(checkAndProcess, 3000); // Small delay to let app settle

    // Then every 5 minutes
    const interval = setInterval(checkAndProcess, CHECK_INTERVAL_MS);

    return () => {
      clearTimeout(initialTimeout);
      clearInterval(interval);
    };
  }, [enabled]);
}
