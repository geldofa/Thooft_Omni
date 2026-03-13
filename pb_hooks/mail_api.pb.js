/// <reference path="../pb_data/types.d.ts" />

/**
 * [Mail API]
 * Custom API routes for managing SMTP configuration and sending test emails.
 * PocketBase v0.23+ compatible — auth check inlined per handler (goja scoping).
 */

console.log(">>> [Mail API] Initialize hooks...");

// ─── GET /api/mail/config ─────────────────────────────────────────────────────

routerAdd("GET", "/api/mail/config", (c) => {
    try {
        // ── Auth check (inline) ──
        let isAdmin = false;
        try {
            if (typeof c.hasSuperuserAuth === "function" && c.hasSuperuserAuth()) isAdmin = true;
            if (!isAdmin && c.auth) {
                const colName = c.auth.collection().name;
                if (colName === "_superusers" || colName === "admins") isAdmin = true;
                if (colName === "users" && (c.auth.get("role") === "admin" || c.auth.get("role") === "Admin")) isAdmin = true;
            }
            if (!isAdmin) {
                const info = c.requestInfo();
                const authHeader = info.headers ? (info.headers["authorization"] || info.headers["Authorization"] || "") : "";
                const token = authHeader.replace("Bearer ", "").trim();
                if (token) {
                    try {
                        const rec = $app.findAuthRecordByToken(token, "auth");
                        if (rec) {
                            const cn = rec.collection().name;
                            if (cn === "_superusers" || cn === "admins") isAdmin = true;
                            if (cn === "users" && (rec.get("role") === "admin" || rec.get("role") === "Admin")) isAdmin = true;
                        }
                    } catch (e) { }
                }
            }
        } catch (e) { console.log(">>> [Mail API] GET config auth error: " + e); }

        if (!isAdmin) {
            return c.json(403, { message: "Forbidden" });
        }

        const settings = $app.settings();

        return c.json(200, {
            senderName: settings.meta.senderName,
            senderAddress: settings.meta.senderAddress,
            host: settings.smtp.host,
            port: settings.smtp.port.toString(),
            username: settings.smtp.username,
            password: settings.smtp.password
        });
    } catch (e) {
        return c.json(500, { message: "Error: " + e.toString() });
    }
});

// ─── POST /api/mail/config ────────────────────────────────────────────────────

routerAdd("POST", "/api/mail/config", (c) => {
    try {
        // ── Auth check (inline) ──
        let isAdmin = false;
        try {
            if (typeof c.hasSuperuserAuth === "function" && c.hasSuperuserAuth()) isAdmin = true;
            if (!isAdmin && c.auth) {
                const colName = c.auth.collection().name;
                if (colName === "_superusers" || colName === "admins") isAdmin = true;
                if (colName === "users" && (c.auth.get("role") === "admin" || c.auth.get("role") === "Admin")) isAdmin = true;
            }
            if (!isAdmin) {
                const info = c.requestInfo();
                const authHeader = info.headers ? (info.headers["authorization"] || info.headers["Authorization"] || "") : "";
                const token = authHeader.replace("Bearer ", "").trim();
                if (token) {
                    try {
                        const rec = $app.findAuthRecordByToken(token, "auth");
                        if (rec) {
                            const cn = rec.collection().name;
                            if (cn === "_superusers" || cn === "admins") isAdmin = true;
                            if (cn === "users" && (rec.get("role") === "admin" || rec.get("role") === "Admin")) isAdmin = true;
                        }
                    } catch (e) { }
                }
            }
        } catch (e) { console.log(">>> [Mail API] POST config auth error: " + e); }

        if (!isAdmin) {
            return c.json(403, { message: "Forbidden" });
        }

        const data = c.requestInfo().body;
        if (!data.host || !data.port) {
            return c.json(400, { message: "Host/Port required" });
        }

        const settings = $app.settings();
        settings.meta.senderName = data.senderName || settings.meta.senderName;
        settings.meta.senderAddress = data.senderAddress || settings.meta.senderAddress;
        settings.smtp.enabled = true;
        settings.smtp.host = data.host;
        settings.smtp.port = parseInt(data.port, 10) || 587;
        settings.smtp.username = data.username || "";
        settings.smtp.password = data.password || "";

        // Settings implements Model — use $app.save() then reload
        $app.save(settings);
        $app.reloadSettings();

        return c.json(200, { message: "Success" });
    } catch (e) {
        return c.json(500, { message: "Error: " + e.toString() });
    }
});

// ─── POST /api/mail/test ──────────────────────────────────────────────────────

routerAdd("POST", "/api/mail/test", (c) => {
    try {
        // ── Auth check (inline) ──
        let isAdmin = false;
        try {
            if (typeof c.hasSuperuserAuth === "function" && c.hasSuperuserAuth()) isAdmin = true;
            if (!isAdmin && c.auth) {
                const colName = c.auth.collection().name;
                if (colName === "_superusers" || colName === "admins") isAdmin = true;
                if (colName === "users" && (c.auth.get("role") === "admin" || c.auth.get("role") === "Admin")) isAdmin = true;
            }
            if (!isAdmin) {
                const info = c.requestInfo();
                const authHeader = info.headers ? (info.headers["authorization"] || info.headers["Authorization"] || "") : "";
                const token = authHeader.replace("Bearer ", "").trim();
                if (token) {
                    try {
                        const rec = $app.findAuthRecordByToken(token, "auth");
                        if (rec) {
                            const cn = rec.collection().name;
                            if (cn === "_superusers" || cn === "admins") isAdmin = true;
                            if (cn === "users" && (rec.get("role") === "admin" || rec.get("role") === "Admin")) isAdmin = true;
                        }
                    } catch (e) { }
                }
            }
        } catch (e) { console.log(">>> [Mail API] POST test auth error: " + e); }

        if (!isAdmin) {
            return c.json(403, { message: "Forbidden" });
        }

        const data = c.requestInfo().body;
        if (!data || !data.to_email) {
            return c.json(400, { message: "Missing to_email" });
        }

        const settings = $app.settings();

        if (!settings.smtp.enabled || !settings.smtp.host) {
            return c.json(400, { message: "SMTP is niet geconfigureerd. Sla eerst de SMTP instellingen op." });
        }

        const message = new MailerMessage({
            from: { address: settings.meta.senderAddress, name: settings.meta.senderName },
            to: [{ address: data.to_email }],
            subject: "[Omni] SMTP Test",
            html: "<h2>SMTP Test Success</h2>"
        });

        $app.newMailClient().send(message);
        return c.json(200, { message: "Sent to " + data.to_email });
    } catch (e) {
        return c.json(400, { message: "Failed: " + e.toString() });
    }
});

console.log(">>> [Mail API] Hooks loaded.");
