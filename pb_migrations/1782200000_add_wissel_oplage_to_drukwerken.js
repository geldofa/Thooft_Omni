/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    console.log("🚀 Running migration: Add wissel and oplage to drukwerken");
    const col = app.findCollectionByNameOrId("drukwerken");

    const existing = new Set();
    for (const f of col.fields) existing.add(f.name);

    if (!existing.has("wissel")) {
        col.fields.add(new TextField({ name: "wissel" }));
        console.log("   + Added 'wissel'");
    }
    if (!existing.has("oplage")) {
        col.fields.add(new NumberField({ name: "oplage" }));
        console.log("   + Added 'oplage'");
    }

    app.save(col);
    console.log("   ✅ Done");

}, (app) => {
    const col = app.findCollectionByNameOrId("drukwerken");
    col.fields.removeByName("wissel");
    col.fields.removeByName("oplage");
    app.save(col);
});
