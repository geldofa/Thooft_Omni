
migrate((app) => {
    // 1. Delete the broken collection to start fresh
    try {
        const existing = app.findCollectionByNameOrId("calculated_fields");
        app.delete(existing);
    } catch (e) {
        // Doesn't exist, ignore
    }

    // 2. Import collection with the exact format required by PB 0.23
    const collections = [
        {
            "id": "pbc_calculated_fields",
            "name": "calculated_fields",
            "type": "base",
            "system": false,
            "fields": [
                {
                    "id": "text3208210256",
                    "name": "id",
                    "type": "text",
                    "system": true,
                    "required": true,
                    "primaryKey": true,
                    "autogeneratePattern": "[a-z0-9]{15}"
                },
                {
                    "id": "text_name_cf",
                    "name": "name",
                    "type": "text",
                    "system": false,
                    "required": true,
                    "presentable": true
                },
                {
                    "id": "text_formula_cf",
                    "name": "formula",
                    "type": "text",
                    "system": false,
                    "required": true
                },
                {
                    "id": "text_target_cf",
                    "name": "targetColumn",
                    "type": "text",
                    "system": false,
                    "required": false
                },
                {
                    "id": "autodate2990389176",
                    "name": "created",
                    "type": "autodate",
                    "system": true,
                    "onCreate": true,
                    "onUpdate": false
                },
                {
                    "id": "autodate3332085495",
                    "name": "updated",
                    "type": "autodate",
                    "system": true,
                    "onCreate": true,
                    "onUpdate": true
                }
            ],
            "listRule": "",
            "viewRule": "",
            "createRule": "",
            "updateRule": "",
            "deleteRule": ""
        }
    ];

    app.importCollections(collections, false);

    // 3. Re-fetch collection reference after import
    const collection = app.findCollectionByNameOrId("calculated_fields");

    // 4. Seed default formulas
    const defaults = [
        {
            "name": "Max Bruto",
            "formula": "IF(startup, Opstart * exOmw, 0) + netRun + (netRun * Marge) + (c4_4 * exOmw * param_4_4) + (c4_0 * exOmw * param_4_0) + (c1_0 * exOmw * param_1_0) + (c1_1 * exOmw * param_1_1) + (c4_1 * exOmw * param_4_1)",
            "targetColumn": "maxGross"
        },
        {
            "name": "Delta Number",
            "formula": "green + red - maxGross",
            "targetColumn": "delta_number"
        },
        {
            "name": "Delta Percentage",
            "formula": "(green + red) / maxGross",
            "targetColumn": "delta_percentage"
        }
    ];

    for (const item of defaults) {
        const record = new Record(collection);
        record.set("name", item.name);
        record.set("formula", item.formula);
        record.set("targetColumn", item.targetColumn);
        app.save(record);
    }
}, (app) => {
    try {
        const collection = app.findCollectionByNameOrId("calculated_fields");
        app.delete(collection);
    } catch (e) { }
});
