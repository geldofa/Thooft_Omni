/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    console.log("🚀 Starting migration: Update papier collection and create papier_klasse_instellingen");

    const papier = app.findCollectionByNameOrId("papier");
    
    const fieldsToAdd = [
        { name: "fabrikant", type: "text" },
        { name: "opmerking", type: "text" },
        { name: "start_front_k", type: "number" },
        { name: "start_front_c", type: "number" },
        { name: "start_front_m", type: "number" },
        { name: "start_front_y", type: "number" },
        { name: "start_back_k", type: "number" },
        { name: "start_back_c", type: "number" },
        { name: "start_back_m", type: "number" },
        { name: "start_back_y", type: "number" }
    ];

    fieldsToAdd.forEach(f => {
        if (!papier.fields.getByName(f.name)) {
            if (f.type === "text") {
                papier.fields.add(new TextField({ name: f.name }));
            } else if (f.type === "number") {
                papier.fields.add(new NumberField({ name: f.name }));
            }
            console.log(`   + Added '${f.name}' field to papier`);
        }
    });

    app.save(papier);

    // Create papier_klasse_instellingen collection
    let instellingen;
    try {
        instellingen = app.findCollectionByNameOrId("papier_klasse_instellingen");
    } catch (_) {
        instellingen = new Collection({
            id: "pbc_papier_inst",
            name: "papier_klasse_instellingen",
            type: "base",
        });
        
        instellingen.fields.add(new TextField({ name: "klasse", required: true }));
        instellingen.fields.add(new NumberField({ name: "front_k" }));
        instellingen.fields.add(new NumberField({ name: "front_c" }));
        instellingen.fields.add(new NumberField({ name: "front_m" }));
        instellingen.fields.add(new NumberField({ name: "front_y" }));
        instellingen.fields.add(new NumberField({ name: "back_k" }));
        instellingen.fields.add(new NumberField({ name: "back_c" }));
        instellingen.fields.add(new NumberField({ name: "back_m" }));
        instellingen.fields.add(new NumberField({ name: "back_y" }));

        instellingen.listRule   = "@request.auth.id != ''";
        instellingen.viewRule   = "@request.auth.id != ''";
        instellingen.createRule = "@request.auth.role = 'Admin' || @request.auth.role = 'Meestergast'";
        instellingen.updateRule = "@request.auth.role = 'Admin' || @request.auth.role = 'Meestergast'";
        instellingen.deleteRule = "@request.auth.role = 'Admin' || @request.auth.role = 'Meestergast'";

        app.save(instellingen);
        console.log("   ✅ papier_klasse_instellingen collection created");
    }

}, (app) => {
    // Rollback logic (optional, usually not needed for small additions)
});
