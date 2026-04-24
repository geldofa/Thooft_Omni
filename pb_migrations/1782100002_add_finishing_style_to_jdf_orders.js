/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    console.log("🚀 Running migration: Add finishing_style to jdf_orders");
    const col = app.findCollectionByNameOrId("jdf_orders");

    for (const f of col.fields) {
        if (f.name === "finishing_style") {
            console.log("   - Field 'finishing_style' already exists. Skipping.");
            return;
        }
    }

    col.fields.add(new TextField({ name: "finishing_style" }));
    app.save(col);
    console.log("   ✅ Added 'finishing_style' to jdf_orders.");

}, (app) => {
    const col = app.findCollectionByNameOrId("jdf_orders");
    col.fields.removeByName("finishing_style");
    app.save(col);
});
