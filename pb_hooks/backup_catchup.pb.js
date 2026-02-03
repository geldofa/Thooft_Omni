console.log(">>> [backup_catchup.pb.js] Initializing...");

cronAdd("backupCatchup", "0 * * * *", () => {
    try {
        const now = new Date();
        const hour = now.getHours(); // This is Typically UTC in Docker
        const dateStr = now.toISOString().split('T')[0].replace(/-/g, ''); // yyyymmdd

        // Only run catch-up if it's after 5 AM UTC (approx 6 AM local)
        // to give the nightly 0 AM UTC backup a chance to happen.
        if (hour < 5) {
            return;
        }

        console.log(">>> [BackupCatchup] Checking for missed nightly backup (" + dateStr + ")...");

        // Check if settings allow automatic backups
        const settings = $app.settings();
        if (!settings || !settings.backups || !settings.backups.cron) {
            console.log(">>> [BackupCatchup] Auto backups are disabled in settings. Skipping.");
            return;
        }

        // List existing backups
        const backupsPath = "/pb/pb_data/backups";
        let foundToday = false;

        try {
            const files = $os.readDir(backupsPath);
            const prefix = "@auto_pb_backup_";

            for (let i = 0; i < files.length; i++) {
                const f = files[i];
                const name = f.name();
                if (name.startsWith(prefix) && name.includes(dateStr)) {
                    foundToday = true;
                    break;
                }
            }
        } catch (e) {
            console.log(">>> [BackupCatchup] Error reading backups dir: " + e);
        }

        if (!foundToday) {
            console.log(">>> [BackupCatchup] MISSING nightly backup detected! Triggering catch-up backup via API...");

            try {
                // 1. Authenticate as superuser to get token
                const adminEmail = $os.getenv("POCKETBASE_ADMIN_EMAIL");
                const adminPassword = $os.getenv("POCKETBASE_ADMIN_PASSWORD");

                const authRes = $http.send({
                    url: "http://127.0.0.1:8090/api/collections/_superusers/auth-with-password",
                    method: "POST",
                    body: JSON.stringify({
                        identity: adminEmail,
                        password: adminPassword
                    }),
                    headers: { "Content-Type": "application/json" }
                });

                if (authRes.statusCode !== 200) {
                    console.log(">>> [BackupCatchup] Superuser auth failed: " + authRes.statusCode);
                    return;
                }

                const token = authRes.json.token;
                const timestamp = now.toISOString()
                    .replace(/[:.]/g, '-')
                    .replace('T', '_')
                    .replace('Z', '')
                    .toLowerCase();

                const backupName = "catchup_" + timestamp + ".zip";

                // 2. Create backup via API
                const createRes = $http.send({
                    url: "http://127.0.0.1:8090/api/backups",
                    method: "POST",
                    body: JSON.stringify({ name: backupName }),
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": token
                    }
                });

                if (createRes.statusCode === 204 || createRes.statusCode === 200) {
                    console.log(">>> [BackupCatchup] Catch-up backup initiated: " + backupName);

                    // 3. Trigger cloud sync
                    try {
                        $http.send({
                            url: "http://rclone:5572/sync/copy",
                            method: "POST",
                            body: JSON.stringify({
                                srcFs: "/backups",
                                dstFs: "cloud:backups",
                                _async: true
                            }),
                            headers: { "Content-Type": "application/json" }
                        });
                        console.log(">>> [BackupCatchup] Cloud sync triggered for catch-up.");
                    } catch (e) {
                        console.log(">>> [BackupCatchup] Cloud sync trigger failed: " + e);
                    }
                } else {
                    console.log(">>> [BackupCatchup] FAILED to trigger backup via API: " + createRes.statusCode);
                }

            } catch (err) {
                console.log(">>> [BackupCatchup] FAILED during catch-up process: " + err);
            }
        } else {
            console.log(">>> [BackupCatchup] Nightly backup found. No action needed.");
        }

    } catch (e) {
        console.log(">>> [BackupCatchup] Global error during check: " + e);
    }
});
