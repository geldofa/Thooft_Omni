migrate((app) => {
    // 1. Maintenance Reports: specific access
    const reports = app.findCollectionByNameOrId("maintenance_reports");

    // Allow authenticated users to list/view/create
    reports.listRule = "@request.auth.id != ''";
    reports.viewRule = "@request.auth.id != ''";
    reports.createRule = "@request.auth.id != ''";
    reports.updateRule = "@request.auth.id != ''"; // Allow update for now (consider restricting later)
    reports.deleteRule = "@request.auth.id != ''"; // Allow delete for now

    app.save(reports);

    // 2. Report Files: access
    const files = app.findCollectionByNameOrId("report_files");

    files.listRule = "@request.auth.id != ''";
    files.viewRule = "@request.auth.id != ''"; // Important for downloading
    files.createRule = "@request.auth.id != ''"; // Needed for uploading generated PDF
    files.updateRule = "@request.auth.id != ''";
    files.deleteRule = "@request.auth.id != ''";

    app.save(files);

}, (app) => {
    // Revert to admin-only (null)
    const reports = app.findCollectionByNameOrId("maintenance_reports");
    reports.listRule = null;
    reports.viewRule = null;
    reports.createRule = null;
    reports.updateRule = null;
    reports.deleteRule = null;
    app.save(reports);

    const files = app.findCollectionByNameOrId("report_files");
    files.listRule = null;
    files.viewRule = null;
    files.createRule = null;
    files.updateRule = null;
    files.deleteRule = null;
    app.save(files);
})
