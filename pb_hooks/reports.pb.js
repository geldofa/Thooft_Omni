/// <reference path="../pb_data/types.d.ts" />

/**
 * [Report Automation]
 * This hook runs every hour at :00 to check which maintenance reports are due.
 * It follows the advanced scheduling logic:
 * - Daily: matches the selected hour
 * - Weekly: matches the hour and one of the selected weekdays (1=Mon, 0=Sun)
 * - Monthly: matches the hour and the month type (first day, first weekday, last day)
 * - Yearly: matches the hour and is Jan 1st
 */

cronAdd("report_automation_check", "0 * * * *", () => {
    try {
        const now = new Date();
        // Server runs in UTC. schedule_hour is stored in local time (CET = UTC+1).
        // Convert UTC hour to local hour before matching.
        const UTC_OFFSET_HOURS = 1; // CET (UTC+1). Change to 2 for CEST if needed.
        const currentHourUTC = now.getHours();
        const currentHour = (currentHourUTC + UTC_OFFSET_HOURS) % 24;
        const currentDate = now.getDate();
        const currentDay = now.getDay(); // JS: 0=Sun, 1=Mon, ..., 6=Sat

        // Find reports that are set to auto_generate and match the current hour
        const reports = $app.findRecordsByFilter(
            "maintenance_reports",
            `auto_generate = true && schedule_hour = ${currentHour}`
        );

        if (!reports || reports.length === 0) return;

        reports.forEach((report) => {
            const period = report.getString("period");
            // Values from a 'select' multiple field return a string array
            const weekdays = report.get("schedule_weekdays") || [];
            const monthType = report.getString("schedule_month_type");
            const lastRunStr = report.getString("last_run");

            let shouldRun = false;

            // 1. Check Period Specific Logic
            if (period === 'day') {
                shouldRun = true;
            } else if (period === 'week') {
                // currentDay is 0 (Sun) to 6 (Sat)
                // In our UI, we map Mon=1, ..., Sat=6, Sun=0 to match JS getDay()
                if (weekdays.indexOf(currentDay.toString()) !== -1) {
                    shouldRun = true;
                }
            } else if (period === 'month') {
                if (monthType === 'first_day') {
                    if (currentDate === 1) shouldRun = true;
                } else if (monthType === 'last_day') {
                    const lastDayOfCurrentMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
                    if (currentDate === lastDayOfCurrentMonth) shouldRun = true;
                } else if (monthType === 'first_weekday') {
                    // Logic for first weekday:
                    // 1st is Mon-Fri -> 1st is first weekday
                    // 1st is Sat (6) -> 3rd is Mon
                    // 1st is Sun (0) -> 2nd is Mon
                    const checkFirstWeekday = (currentDay >= 1 && currentDay <= 5) &&
                        (currentDate === 1 || (currentDay === 1 && (currentDate === 2 || currentDate === 3)));
                    if (checkFirstWeekday) shouldRun = true;
                }
            } else if (period === 'year') {
                // Yearly reports run on January 1st
                if (now.getMonth() === 0 && currentDate === 1) shouldRun = true;
            }

            // 2. Prevent Double Run (Safety guard)
            // Even though cron triggers exactly at :00, we verify last_run isn't in this same hour.
            if (shouldRun && lastRunStr) {
                const lastRun = new Date(lastRunStr);
                const isSameHour = lastRun.getFullYear() === now.getFullYear() &&
                    lastRun.getMonth() === now.getMonth() &&
                    lastRun.getDate() === now.getDate() &&
                    lastRun.getHours() === now.getHours();
                if (isSameHour) {
                    shouldRun = false;
                }
            }

            // 3. Trigger Report
            if (shouldRun) {
                $app.logger().info(`>>> [Report Automation] Triggering automated run for: ${report.getString("name")} (${report.id})`);

                // Update last_run
                report.set("last_run", now.toISOString());
                $app.save(report);

                $app.logger().info(`[Report Automation] Successfully scheduled: ${report.getString("name")}`);
            }
        });
    } catch (e) {
        $app.logger().error("Error in report_automation_check cron", e);
    }
});
