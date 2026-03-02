/// <reference path="../pb_data/types.d.ts" />

/**
 * [Mail API]
 * Custom API routes for managing SMTP configuration and sending test emails.
 *
 * POST /api/mail/config  — Save SMTP settings to PocketBase core settings.
 * POST /api/mail/test    — Send a test email to verify SMTP config.
 */

console.log(">>> [Mail API] Initialization...");

// ─── Auth Helper ──────────────────────────────────────────────────────────────

function requireAdmin(c) {
    let isAdmin = false;
    try {
        if (typeof c.hasSuperuserAuth === "function" && c.hasSuperuserAuth()) {
            isAdmin = true;
        }
        if (!isAdmin && c.auth) {
            if (c.auth.collection().name === "_superusers") isAdmin = true;
            if (
                c.auth.collection().name === "users" &&
                (c.auth.get("role") === "admin" || c.auth.get("role") === "Admin")
            ) {
                isAdmin = true;
            }
        }
    } catch (_) { }

    if (!isAdmin) {
        throw new Error("Forbidden");
    }
}

// ─── POST /api/mail/config ────────────────────────────────────────────────────

routerAdd("POST", "/api/mail/config", (c) => {
    try {
        // Auth check
        try {
            requireAdmin(c);
        } catch (_) {
            return c.json(403, { message: "Forbidden: alleen beheerders mogen SMTP instellingen wijzigen." });
        }

        // Parse request body
        const data = $apis.requestInfo(c).data;

        if (!data.host || !data.port) {
            return c.json(400, { message: "Host en poort zijn verplicht." });
        }

        // Load current settings
        const settings = $app.settings();

        // Update meta sender info
        settings.meta.senderName = data.senderName || settings.meta.senderName || "Omni Notificaties";
        settings.meta.senderAddress = data.senderAddress || settings.meta.senderAddress || "noreply@example.com";

        // Update SMTP settings
        settings.smtp.enabled = true;
        settings.smtp.host = data.host;
        settings.smtp.port = parseInt(data.port, 10) || 587;
        settings.smtp.username = data.username || "";
        settings.smtp.password = data.password || "";

        // Optional TLS setting
        if (data.tls !== undefined) {
            settings.smtp.tls = !!data.tls;
        }

        // Persist
        $app.save(settings);

        $app.logger().info("[Mail API] SMTP settings updated successfully", "host", data.host, "port", data.port);

        return c.json(200, {
            message: "SMTP instellingen succesvol opgeslagen.",
            smtp: {
                host: settings.smtp.host,
                port: settings.smtp.port,
                enabled: settings.smtp.enabled,
                senderName: settings.meta.senderName,
                senderAddress: settings.meta.senderAddress
            }
        });
    } catch (e) {
        $app.logger().error("[Mail API] Failed to save SMTP config", "error", e.toString());
        return c.json(500, { message: "Opslaan mislukt: " + e.toString() });
    }
});

// ─── POST /api/mail/test ──────────────────────────────────────────────────────

routerAdd("POST", "/api/mail/test", (c) => {
    try {
        // Auth check
        try {
            requireAdmin(c);
        } catch (_) {
            return c.json(403, { message: "Forbidden: alleen beheerders mogen test-mails versturen." });
        }

        // Parse request body
        const data = $apis.requestInfo(c).data;

        const toEmail = data.to_email;
        if (!toEmail) {
            return c.json(400, { message: "Het veld 'to_email' is verplicht." });
        }

        // Get sender from settings
        const settings = $app.settings();
        const senderAddress = settings.meta.senderAddress || "noreply@example.com";
        const senderName = settings.meta.senderName || "Omni Notificaties";

        // Build HTML template (placeholder — will be replaced by compiled React Email later)
        const htmlBody = `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 16px; padding: 40px; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                <div style="border-bottom: 1px solid #f4f4f5; padding-bottom: 24px; margin-bottom: 24px;">
                    <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #18181b;">
                        ✅ SMTP Test Geslaagd
                    </h1>
                </div>
                <p style="margin: 0 0 16px; font-size: 16px; color: #3f3f46; line-height: 1.6;">
                    Dit is een test-e-mail vanuit <strong>T'HOOFT OMNI</strong>.
                    Als je dit bericht ontvangt, werkt de SMTP-configuratie correct.
                </p>
                <p style="margin: 0; font-size: 13px; color: #a1a1aa;">
                    Verzonden op: ${new Date().toLocaleString("nl-NL")}
                </p>
                <div style="border-top: 1px solid #f4f4f5; margin-top: 24px; padding-top: 16px;">
                    <p style="margin: 0; font-size: 12px; color: #a1a1aa; text-align: center;">
                        © ${new Date().getFullYear()} Omni · Thooft. Alle rechten voorbehouden.
                    </p>
                </div>
            </div>
        `;

        // Construct and send the message
        const message = new MailerMessage({
            from: {
                address: senderAddress,
                name: senderName
            },
            to: [{ address: toEmail }],
            subject: "[Omni] SMTP Test — Configuratie Verificatie",
            html: htmlBody
        });

        $app.newMailClient().send(message);

        $app.logger().info("[Mail API] Test email sent successfully", "to", toEmail);

        return c.json(200, {
            message: "Test e-mail succesvol verstuurd naar " + toEmail + ".",
            to: toEmail,
            from: senderAddress
        });
    } catch (e) {
        $app.logger().error("[Mail API] Failed to send test email", "error", e.toString());

        // Provide helpful error message for common SMTP failures
        const errStr = e.toString();
        let userMessage = "Verzenden mislukt: " + errStr;

        if (errStr.includes("connection refused")) {
            userMessage = "SMTP-verbinding geweigerd. Controleer host en poort.";
        } else if (errStr.includes("authentication")) {
            userMessage = "SMTP-authenticatie mislukt. Controleer gebruikersnaam en wachtwoord.";
        } else if (errStr.includes("timeout")) {
            userMessage = "SMTP-verbinding time-out. Controleer of de host bereikbaar is.";
        }

        return c.json(400, { message: userMessage, details: errStr });
    }
});
