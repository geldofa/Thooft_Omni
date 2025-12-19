migrate((app) => {
    const collection = app.findCollectionByNameOrId("operatoren");
    console.log("DIAGNOSTIC - Collection 'operatoren' fields:");
    collection.fields.forEach(f => {
        console.log(`- Field: ${f.name}, Type: ${f.type}, Required: ${f.required}`);
        if (f.type === 'relation') {
            console.log(`  - Relation Collection: ${f.collectionId}, MaxSelect: ${f.maxSelect}`);
        }
    });

    const records = app.findRecordsByFilter("operatoren", "id != ''", "", 1);
    if (records.length > 0) {
        console.log("DIAGNOSTIC - Sample record 'presses' raw value:", records[0].get("presses"));
    } else {
        console.log("DIAGNOSTIC - No records found in 'operatoren'.");
    }
}, (app) => { });
