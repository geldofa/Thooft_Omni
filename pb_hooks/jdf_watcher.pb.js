/// <reference path="../pb_data/types.d.ts" />

/**
 * JDF Folder Watcher
 * Scans a directory for .jdf files every 5 minutes and on-demand via POST /api/jdf/scan.
 * Actual scan logic lives in jdf_scan_lib.js and is loaded via require() inside each
 * handler callback, because PocketBase hook handlers run in isolated JS VMs.
 */

console.log(">>> [jdf_watcher.pb.js] Initialization...");

cronAdd("jdf_folder_watcher", "*/5 * * * *", function () {
    try {
        const lib = require(`${__hooks}/jdf_scan_lib.js`);
        lib.runJdfScan();
    } catch (e) {
        $app.logger().error("[JDF Watcher] Cron error", e);
    }
});

routerAdd("POST", "/api/jdf/scan", (c) => {
    try {
        if (!c.auth) {
            return c.json(401, { message: "Authenticatie vereist" });
        }
        const lib = require(`${__hooks}/jdf_scan_lib.js`);
        const force = (c.requestInfo().query["force"] || "") === "true";
        const result = lib.runJdfScan({ force });
        return c.json(200, result);
    } catch (e) {
        const msg = (e && e.message) ? e.message : String(e);
        console.log("[JDF Watcher] Manual scan error: " + msg);
        return c.json(500, { message: "Scan mislukt: " + msg });
    }
});
