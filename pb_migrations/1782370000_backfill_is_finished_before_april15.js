/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    var records = app.findRecordsByFilter(
        "drukwerken",
        "created < '2026-04-15 00:00:00.000Z'"
    );
    for (var i = 0; i < records.length; i++) {
        records[i].set("is_finished", true);
        app.save(records[i]);
    }
    console.log("[backfill] Marked " + records.length + " drukwerken as is_finished");
}, (app) => {
    // Not reversible — we don't know which ones were manually set vs backfilled
});
