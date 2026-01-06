import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function checkSchema() {
    try {
        await pb.admins.authWithPassword('geldofa@gmail.com', 'cQGNFBWI$zVV%3UV!hBqi*8Le&K3nLS!V!z&#8*zJk9z6wIaoh7OdmebJuhWuq4$');
        const collections = await pb.collections.getFullList();
        const onderhoud = collections.find(c => c.name === 'onderhoud');

        if (!onderhoud) {
            console.log("Collection 'onderhoud' not found!");
            return;
        }

        console.log("Collection 'onderhoud' fields:");
        onderhoud.fields.forEach(f => {
            console.log(`- ${f.name} (${f.type})${f.required ? ' REQUIRED' : ''}`);
        });

        // Try to update a record to see the exact error
        try {
            const migrations = await pb.collection('_migrations').getFullList();
            console.log("\nApplied Migrations:");
            migrations.forEach(m => console.log(`- ${m.file}`));
        } catch (e) {
            console.log("\nCould not fetch migrations (likely not authorized or system collection):", e.message);
        }

        try {
            const records = await pb.collection('onderhoud').getList(1, 1);
            if (records.items.length > 0) {
                const record = records.items[0];
                console.log("\nAttempting full-payload update...");
                console.log("Record ID:", record.id);

                const payload = {
                    task: record.task,
                    task_subtext: record.task_subtext || "",
                    category: record.category || "",
                    pers: record.pers || "",
                    last_date: record.last_date || null,
                    next_date: record.next_date || new Date().toISOString(),
                    interval: record.interval || 0,
                    interval_unit: "Dagen",
                    assigned_operator: "",
                    opmerkingen: "test opmerking",
                    commentDate: new Date().toISOString()
                };

                console.log("Payload:", JSON.stringify(payload, null, 2));
                await pb.collection('onderhoud').update(record.id, payload);
                console.log("Update SUCCESSful!");
            }
        } catch (e) {
            console.log("\nUpdate FAILED with data:");
            console.log("Status:", e.status);
            console.log("Response Data:", JSON.stringify(e.data, null, 2));
        }

    } catch (e) {
        console.error("Error:", e.message);
    }
}

checkSchema();
