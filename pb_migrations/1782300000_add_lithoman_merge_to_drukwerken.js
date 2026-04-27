/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    console.log("🚀 Running migration: Add lithoman_merge_info to drukwerken");
    const col = app.findCollectionByNameOrId("drukwerken");

    const existing = new Set();
    for (const f of col.fields) existing.add(f.name);

    if (!existing.has("lithoman_merge_info")) {
        col.fields.add(new JSONField({
            name: "lithoman_merge_info",
            required: false,
        }));
        console.log("   + Added 'lithoman_merge_info'");
    }

    app.save(col);
    console.log("   ✅ Done");

}, (app) => {
    const col = app.findCollectionByNameOrId("drukwerken");
    col.fields.removeByName("lithoman_merge_info");
    app.save(col);
});
