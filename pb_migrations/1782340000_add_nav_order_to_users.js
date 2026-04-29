/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    const users = app.findCollectionByNameOrId("users");
    if (!users.fields.getByName("nav_order")) {
        users.fields.add(new TextField({ name: "nav_order" }));
        app.save(users);
        console.log("✓ Added nav_order field to users");
    }
});
