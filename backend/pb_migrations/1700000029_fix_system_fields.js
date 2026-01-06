
migrate((app) => {
    try {
        const collections = app.findAllCollections();

        collections.forEach(col => {
            // Skip system collections that already have these or shouldn't be touched by us
            if (col.system || col.name.startsWith('_')) {
                return;
            }

            console.log(`Checking system fields for collection: ${col.name}`);

            let changed = false;

            // Check and add 'created' field
            const hasCreated = col.fields.some(f => f.name === 'created');
            if (!hasCreated) {
                console.log(`Adding missing 'created' field to ${col.name}`);
                col.fields.push(new Field({
                    "name": "created",
                    "type": "autodate",
                    "system": true,
                    "onCreate": true,
                    "onUpdate": false
                }));
                changed = true;
            }

            // Check and add 'updated' field
            const hasUpdated = col.fields.some(f => f.name === 'updated');
            if (!hasUpdated) {
                console.log(`Adding missing 'updated' field to ${col.name}`);
                col.fields.push(new Field({
                    "name": "updated",
                    "type": "autodate",
                    "system": true,
                    "onCreate": true,
                    "onUpdate": true
                }));
                changed = true;
            }

            if (changed) {
                try {
                    app.save(col);
                    console.log(`Successfully updated schema for: ${col.name}`);
                } catch (e) {
                    console.error(`Failed to save collection ${col.name}: ${e.message}`);
                }
            }
        });

    } catch (e) {
        console.log("Error in migration 1700000029:", e.message);
    }
}, (app) => { });
