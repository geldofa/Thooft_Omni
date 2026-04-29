/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    const col = app.findCollectionByNameOrId("jdf_orders");
    col.fields.add(new NumberField({ name: "jdf_mod_time" }));
    app.save(col);
}, (app) => {
    const col = app.findCollectionByNameOrId("jdf_orders");
    col.fields.removeByName("jdf_mod_time");
    app.save(col);
});
