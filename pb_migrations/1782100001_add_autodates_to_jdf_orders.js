/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    console.log("🚀 Running migration: Add created and updated fields to jdf_orders");
    const col = app.findCollectionByNameOrId("jdf_orders");

    let hasCreated = false;
    let hasUpdated = false;

    for (const f of col.fields) {
        if (f.name === "created") hasCreated = true;
        if (f.name === "updated") hasUpdated = true;
    }

    if (!hasCreated) {
        col.fields.add(new AutodateField({
            name: "created",
            onCreate: true,
            onUpdate: false,
        }));
        console.log("   + Added 'created' field.");
    }

    if (!hasUpdated) {
        col.fields.add(new AutodateField({
            name: "updated",
            onCreate: true,
            onUpdate: true,
        }));
        console.log("   + Added 'updated' field.");
    }

    app.save(col);
    console.log("   ✅ Finished adding autodate fields to jdf_orders.");

}, (app) => {
    const col = app.findCollectionByNameOrId("jdf_orders");
    col.fields.removeByName("created");
    col.fields.removeByName("updated");
    app.save(col);
});
