
migrate((app) => {
    try {
        const collections = ["activity_logs", "onderhoud", "users", "persen", "categorieen", "operatoren", "ploegen", "feedback", "drukwerken", "press_parameters"];
        const now = new Date().toISOString().replace('T', ' ').split('.')[0] + 'Z';

        collections.forEach(name => {
            try {
                const col = app.findCollectionByNameOrId(name);
                const records = app.findAllRecords(col);

                records.forEach(record => {
                    let changed = false;
                    if (!record.get("created")) {
                        record.set("created", now);
                        changed = true;
                    }
                    if (!record.get("updated")) {
                        record.set("updated", now);
                        changed = true;
                    }
                    if (changed) {
                        app.save(record);
                    }
                });
                console.log(`Populated missing timestamps for: ${name}`);
            } catch (e) {
                console.log(`Skipping collection ${name}: ${e.message}`);
            }
        });

    } catch (e) {
        console.log("Error in migration 1700000030:", e.message);
    }
}, (app) => { });
