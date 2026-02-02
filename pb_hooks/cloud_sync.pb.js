
// Integrated Cloud Sync Tool Hooks for PocketBase v0.23.12
// V32 - FRONTEND-ORIGIN AWARE (STABLE)

console.log(">>> [cloud_sync.pb.js] V32 Initialization...");

routerAdd("GET", "/api/cloud-sync/status", (c) => {
    try {
        const resp = c.response;
        const h = (typeof resp.header === 'function' ? resp.header() : resp.header);
        if (h) {
            h.set("Access-Control-Allow-Origin", "*");
            h.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            h.set("Access-Control-Allow-Headers", "*");
        }

        let isS = false;
        let authSource = "None";
        try {
            if (typeof c.hasSuperuserAuth === 'function' && c.hasSuperuserAuth()) {
                isS = true;
                authSource = "Context(hasSuperuserAuth)";
            }
            if (!isS && c.auth) {
                authSource = "Context(Auth:" + c.auth.collection().name + ")";
                if (c.auth.collection().name === "_superusers") isS = true;
            }
            if (!isS) {
                const info = c.requestInfo();
                const token = (info.query && info.query["token"]) ? info.query["token"] : "";
                if (token) {
                    const pb = (typeof $app !== 'undefined' ? $app : app);
                    const rec = pb.findAuthRecordByToken(token, "auth");
                    if (rec) {
                        authSource = "QueryToken(" + rec.collection().name + ")";
                        if (rec.collection().name === "_superusers" || rec.collection().name === "admins") isS = true;
                    }
                }
            }
        } catch (e) { console.log(">>> [ST] Auth check error: " + e); }

        console.log(">>> [ST] Status Check Entry. AuthSource: " + authSource + " IsSuper: " + isS);
        try {
            console.log(">>> [ST] Introspecting $os: " + Object.keys($os).join(", "));
        } catch (e) { }

        if (!isS) {
            console.log(">>> [ST] Status Check: Forbidden (No Superuser)");
            return c.json(403, { message: "Forbidden" });
        }

        let configured = false;
        try {
            // Safer check: try to read the file directly
            const bytes = $os.readFile("/pb/pb_data/rclone/rclone.conf");
            const content = String.fromCharCode.apply(null, bytes);

            if (content.indexOf("[cloud]") !== -1) {
                configured = true;
            } else {
                // The log was here
            }
        } catch (e) {
            // File likely doesn't exist or is not readable
            console.log(">>> [ST] File read failed (likely missing): " + e);
        }

        console.log(">>> [ST] Status Check Result: " + (configured ? "Configured" : "NOT Configured"));
        return c.json(200, { ok: true, configured: configured });
    } catch (e) { return c.json(500, { message: e.toString() }); }
});

routerAdd("GET", "/api/cloud-sync/auth/gdrive", (c) => {
    console.log(">>> [AU] GDrive Triggered (V32)");
    try {
        let isS = false;
        const info = c.requestInfo();
        try {
            if (typeof c.hasSuperuserAuth === 'function' && c.hasSuperuserAuth()) isS = true;
            if (!isS && c.auth && c.auth.collection().name === "_superusers") isS = true;
            if (!isS) {
                const token = info.query["token"];
                if (token) {
                    const pb = (typeof $app !== 'undefined' ? $app : app);
                    const rec = pb.findAuthRecordByToken(token, "auth");
                    if (rec) {
                        const colName = rec.collection().name;
                        if (colName === "_superusers" || colName === "admins") {
                            isS = true;
                        } else if (colName === "users" && rec.get("role") === "admin") {
                            isS = true;
                        }
                    }
                }
            }
        } catch (e) { console.log(">>> [AU] Auth check error: " + e); }

        if (!isS) return c.json(403, { message: "Forbidden" });

        const cid = info.query["client_id"];
        const secret = info.query["client_secret"];
        const app_origin = info.query["app_origin"];

        let host = "localhost:8080";
        let scheme = "http";

        if (app_origin) {
            const parts = app_origin.split("/");
            if (parts.length >= 3) {
                scheme = parts[0].replace(":", "");
                host = parts[2];
            }
        }

        const rUriCommon = (c.request.tls || (info.headers && info.headers["x-forwarded-proto"] === "https") ? "https" : "http") + "://" + (c.request.host || "localhost:8090") + "/api/cloud-sync/callback";

        const state = encodeURIComponent(JSON.stringify({ provider: "gdrive", client_id: cid, client_secret: secret, host: host, scheme: scheme }));
        const url = "https://accounts.google.com/o/oauth2/v2/auth?client_id=" + cid + "&redirect_uri=" + rUriCommon + "&response_type=code&scope=https://www.googleapis.com/auth/drive.file&access_type=offline&prompt=consent&state=" + state;

        console.log(">>> [AU] Redirecting to Google. App Target: " + scheme + "://" + host);
        return c.redirect(302, url);
    } catch (e) { return c.json(500, { message: e.toString() }); }
});

routerAdd("GET", "/api/cloud-sync/auth/onedrive", (c) => {
    console.log(">>> [AU] OneDrive Triggered (V32)");
    try {
        let isS = false;
        const info = c.requestInfo();
        try {
            if (typeof c.hasSuperuserAuth === 'function' && c.hasSuperuserAuth()) isS = true;
            if (!isS && c.auth && c.auth.collection().name === "_superusers") isS = true;
            if (!isS) {
                const token = info.query["token"];
                if (token) {
                    const pb = (typeof $app !== 'undefined' ? $app : app);
                    const rec = pb.findAuthRecordByToken(token, "auth");
                    if (rec) {
                        const colName = rec.collection().name;
                        if (colName === "_superusers" || colName === "admins") {
                            isS = true;
                        } else if (colName === "users" && rec.get("role") === "admin") {
                            isS = true;
                        }
                    }
                }
            }
        } catch (e) { console.log(">>> [AU] OneDrive Auth check error: " + e); }

        if (!isS) return c.json(403, { message: "Forbidden" });

        const cid = info.query["client_id"];
        const secret = info.query["client_secret"];
        const app_origin = info.query["app_origin"];

        let host = "localhost:8080";
        let scheme = "http";

        if (app_origin) {
            const parts = app_origin.split("/");
            if (parts.length >= 3) {
                scheme = parts[0].replace(":", "");
                host = parts[2];
            }
        }

        const rUriCommon = (c.request.tls || (info.headers && info.headers["x-forwarded-proto"] === "https") ? "https" : "http") + "://" + (c.request.host || "localhost:8090") + "/api/cloud-sync/callback";

        const state = encodeURIComponent(JSON.stringify({ provider: "onedrive", client_id: cid, client_secret: secret, host: host, scheme: scheme }));
        const url = "https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=" + cid + "&redirect_uri=" + rUriCommon + "&response_type=code&scope=Files.ReadWrite.All%20offline_access&state=" + state;

        console.log(">>> [AU] Redirecting to OneDrive. App Target: " + scheme + "://" + host);
        return c.redirect(302, url);
    } catch (e) { return c.json(500, { message: e.toString() }); }
});

routerAdd("GET", "/api/cloud-sync/callback", (c) => {
    console.log(">>> [CB] Callback Received (V32)");
    try {
        const info = c.requestInfo();
        const stateData = JSON.parse(decodeURIComponent(info.query["state"]));
        const host = stateData.host;

        console.log(">>> [CB] Exchanging code for " + stateData.provider + " token...");
        const body = "code=" + info.query["code"] + "&client_id=" + stateData.client_id + "&client_secret=" + stateData.client_secret + "&redirect_uri=" + stateData.scheme + "://" + (c.request.host || "localhost:8090") + "/api/cloud-sync/callback&grant_type=authorization_code";

        const response = $http.send({
            url: stateData.provider === "gdrive" ? "https://oauth2.googleapis.com/token" : "https://login.microsoftonline.com/common/oauth2/v2.0/token",
            method: "POST",
            body: body,
            headers: { "Content-Type": "application/x-www-form-urlencoded" }
        });

        if (response.statusCode >= 400) {
            console.log(">>> [CB] Exchange failed: " + response.statusCode + " Body: " + JSON.stringify(response.json));
            throw new Error("Token exchange failed: " + response.statusCode);
        }

        const rTk = JSON.stringify({
            access_token: response.json.access_token,
            token_type: response.json.token_type,
            refresh_token: response.json.refresh_token,
            expiry: new Date(Date.now() + (response.json.expires_in * 1000)).toISOString()
        });

        let conf = "";
        if (stateData.provider === "gdrive") {
            conf = "[cloud]\ntype = drive\nscope = drive.file\nclient_id = " + stateData.client_id + "\nclient_secret = " + stateData.client_secret + "\ntoken = " + rTk + "\n";
        } else {
            conf = "[cloud]\ntype = onedrive\nclient_id = " + stateData.client_id + "\nclient_secret = " + stateData.client_secret + "\ntoken = " + rTk + "\ndrive_type = personal\n";
        }

        $os.writeFile("/pb/pb_data/rclone/rclone.conf", conf);
        console.log(">>> [CB] Config saved. Redirecting to app: " + stateData.scheme + "://" + host);
        return c.redirect(302, stateData.scheme + "://" + host + "/toolbox?tab=backup&sync=success");
    } catch (e) {
        console.log(">>> [CB] Callback error: " + e);
        return c.json(500, { message: e.toString() });
    }
});

routerAdd("POST", "/api/cloud-sync/configure", (c) => {
    try {
        let isS = false;
        try {
            if (typeof c.hasSuperuserAuth === 'function' && c.hasSuperuserAuth()) isS = true;
            if (!isS && c.auth && c.auth.collection().name === "_superusers") isS = true;
            if (!isS) {
                const token = c.requestInfo().query["token"];
                if (token && (typeof $app !== 'undefined' ? $app : app).findAuthRecordByToken(token, "auth")) isS = true;
            }
        } catch (e) { }
        if (!isS) return c.json(403, { message: "Forbidden" });

        const data = c.requestInfo().body;
        let content = "";
        if (data.type === 'gdrive') content = "[cloud]\ntype = drive\nscope = drive.file\ntoken = " + JSON.stringify(data.config.token) + "\n";
        else if (data.type === 'onedrive') content = "[cloud]\ntype = onedrive\ntoken = " + JSON.stringify(data.config.token) + "\ndrive_type = personal\n";
        else if (data.type === 'local') content = "[cloud]\ntype = local\n";
        $os.writeFile("/pb/pb_data/rclone/rclone.conf", content);
        return c.json(200, { message: "Saved" });
    } catch (err) { return c.json(500, { message: err.toString() }); }
});

routerAdd("OPTIONS", "/*", (c) => {
    try {
        const resp = c.response;
        const h = (typeof resp.header === 'function' ? resp.header() : resp.header);
        if (h) {
            h.set("Access-Control-Allow-Origin", "*");
            h.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
            h.set("Access-Control-Allow-Headers", "*");
        }
    } catch (e) { }
    return c.noContent(204);
});

routerAdd("POST", "/api/cloud-sync/verify-batch", (c) => {
    try {
        let isS = false;
        try {
            if (typeof c.hasSuperuserAuth === 'function' && c.hasSuperuserAuth()) isS = true;
            if (!isS && c.auth && c.auth.collection().name === "_superusers") isS = true;
            if (!isS) {
                const token = c.requestInfo().query["token"];
                if (token && (typeof $app !== 'undefined' ? $app : app).findAuthRecordByToken(token, "auth")) isS = true;
            }
        } catch (e) { }
        if (!isS) return c.json(403, { message: "Forbidden" });

        const data = c.requestInfo().body;
        const filenames = data.filenames || [];
        const results = {};

        // Use rclone RC API to list files in cloud:backups
        try {
            const res = $http.send({
                url: "http://rclone:5572/operations/list",
                method: "POST",
                body: JSON.stringify({
                    fs: "cloud:backups",
                    remote: ""
                }),
                headers: { "Content-Type": "application/json" },
                timeout: 30
            });

            if (res.statusCode >= 400) {
                console.log(">>> [Verify] Rclone list error: " + res.statusCode + " " + JSON.stringify(res.json));
                // Return all files as not synced if list fails
                for (let i = 0; i < filenames.length; i++) {
                    results[filenames[i]] = false;
                }
                return c.json(200, results);
            }

            // Build a set of cloud filenames for fast lookup
            const cloudFiles = new Set();
            const list = res.json.list || [];
            for (let i = 0; i < list.length; i++) {
                cloudFiles.add(list[i].Name);
            }

            // Check each requested filename
            for (let i = 0; i < filenames.length; i++) {
                results[filenames[i]] = cloudFiles.has(filenames[i]);
            }
        } catch (err) {
            console.log(">>> [Verify] Error listing cloud: " + err);
            for (let i = 0; i < filenames.length; i++) {
                results[filenames[i]] = false;
            }
        }

        return c.json(200, results);
    } catch (err) { return c.json(500, { message: err.toString() }); }
});

routerAdd("POST", "/api/cloud-sync/sync-now", (c) => {

    try {
        const resp = c.response;
        const h = (typeof resp.header === 'function' ? resp.header() : resp.header);
        if (h) {
            h.set("Access-Control-Allow-Origin", "*");
            h.set("Access-Control-Allow-Methods", "POST, OPTIONS");
            h.set("Access-Control-Allow-Headers", "*");
        }

        let isS = false;
        try {
            if (typeof c.hasSuperuserAuth === 'function' && c.hasSuperuserAuth()) isS = true;
            if (!isS && c.auth && c.auth.collection().name === "_superusers") isS = true;
            if (!isS) {
                const token = c.requestInfo().query["token"];
                if (token && (typeof $app !== 'undefined' ? $app : app).findAuthRecordByToken(token, "auth")) isS = true;
            }
        } catch (e) { }
        if (!isS) return c.json(403, { message: "Forbidden" });

        // Trigger rclone copy
        // We use the same command as the cron script: rclone copy /pb/pb_data/backups cloud:backups
        // Trigger rclone sync via RC API (http://rclone:5572)
        // Service 'rclone' has volume /backups mapped to pb_data/backups
        try {
            const res = $http.send({
                url: "http://rclone:5572/sync/copy",
                method: "POST",
                body: JSON.stringify({
                    srcFs: "/backups",
                    dstFs: "cloud:backups",
                    _async: true // Run in background
                }),
                headers: { "Content-Type": "application/json" }
            });

            if (res.statusCode >= 400) {
                return c.json(res.statusCode, { message: "Rclone RC error", details: res.json });
            }

            return c.json(200, { message: "Sync started via RC", details: res.json });
        } catch (e) {
            return c.json(500, { message: "Sync failed: " + e.toString() });
        }
    } catch (err) { return c.json(500, { message: err.toString() }); }
});

// Config Backup Endpoints - Save and Restore rclone.conf alongside database backups

routerAdd("POST", "/api/config-backup/save", (c) => {
    console.log(">>> [ConfigBackup] Save triggered");
    try {
        let isS = false;
        try {
            if (typeof c.hasSuperuserAuth === 'function' && c.hasSuperuserAuth()) isS = true;
            if (!isS && c.auth && c.auth.collection().name === "_superusers") isS = true;
            if (!isS) {
                const token = c.requestInfo().query["token"];
                if (token) {
                    const pb = (typeof $app !== 'undefined' ? $app : app);
                    const rec = pb.findAuthRecordByToken(token, "auth");
                    if (rec) {
                        const colName = rec.collection().name;
                        if (colName === "_superusers" || colName === "admins" ||
                            (colName === "users" && rec.get("role") === "admin")) {
                            isS = true;
                        }
                    }
                }
            }
        } catch (e) { console.log(">>> [ConfigBackup] Auth error: " + e); }
        if (!isS) return c.json(403, { message: "Forbidden" });

        const data = c.requestInfo().body;
        const backupName = data.backupName || "";

        if (!backupName) {
            return c.json(400, { message: "backupName required" });
        }

        const configPath = "/pb/pb_data/rclone/rclone.conf";
        const destPath = "/pb/pb_data/backups/" + backupName + ".rclone.conf";

        try {
            const content = $os.readFile(configPath);
            $os.writeFile(destPath, String.fromCharCode.apply(null, content));
            console.log(">>> [ConfigBackup] Saved config to: " + destPath);
            return c.json(200, { message: "Config saved", path: destPath });
        } catch (e) {
            console.log(">>> [ConfigBackup] Save failed: " + e);
            // If no config exists, that's OK - just skip
            return c.json(200, { message: "No config to save (not configured yet)", skipped: true });
        }
    } catch (err) { return c.json(500, { message: err.toString() }); }
});

routerAdd("POST", "/api/config-backup/restore", (c) => {
    console.log(">>> [ConfigBackup] Restore triggered");
    try {
        let isS = false;
        try {
            if (typeof c.hasSuperuserAuth === 'function' && c.hasSuperuserAuth()) isS = true;
            if (!isS && c.auth && c.auth.collection().name === "_superusers") isS = true;
            if (!isS) {
                const token = c.requestInfo().query["token"];
                if (token) {
                    const pb = (typeof $app !== 'undefined' ? $app : app);
                    const rec = pb.findAuthRecordByToken(token, "auth");
                    if (rec) {
                        const colName = rec.collection().name;
                        if (colName === "_superusers" || colName === "admins" ||
                            (colName === "users" && rec.get("role") === "admin")) {
                            isS = true;
                        }
                    }
                }
            }
        } catch (e) { console.log(">>> [ConfigBackup] Auth error: " + e); }
        if (!isS) return c.json(403, { message: "Forbidden" });

        const data = c.requestInfo().body;
        const backupName = data.backupName || "";

        if (!backupName) {
            return c.json(400, { message: "backupName required" });
        }

        const sourcePath = "/pb/pb_data/backups/" + backupName + ".rclone.conf";
        const destPath = "/pb/pb_data/rclone/rclone.conf";

        try {
            const content = $os.readFile(sourcePath);
            $os.writeFile(destPath, String.fromCharCode.apply(null, content));
            console.log(">>> [ConfigBackup] Restored config from: " + sourcePath);
            return c.json(200, { message: "Config restored", path: destPath });
        } catch (e) {
            console.log(">>> [ConfigBackup] Restore failed: " + e);
            return c.json(200, { message: "No config backup found", skipped: true });
        }
    } catch (err) { return c.json(500, { message: err.toString() }); }
});
