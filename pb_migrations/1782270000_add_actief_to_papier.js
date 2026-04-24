/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    console.log("🚀 Starting migration: Add 'actief' field to papier collection");

    const papier = app.findCollectionByNameOrId("papier");
    
    if (!papier.fields.getByName("actief")) {
        papier.fields.add(new BoolField({
            name: "actief",
            presentData: true // default to true so existing papers are visible
        }));
        console.log("   + Added 'actief' field to papier");
    }

    app.save(papier);

}, (app) => {
    // Rollback logic
});
