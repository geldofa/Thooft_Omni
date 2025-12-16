import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function fixFields() {
    try {
        await pb.admins.authWithPassword('admin@example.com', 'admin123456');
        console.log("Authenticated as Admin.");

        // Define correct fields for v0.23+
        const collectionsToFix = [
            {
                name: "presses",
                fields: [
                    { name: "name", type: "text", required: true, presentable: true, unique: true },
                    { name: "active", type: "bool", required: false },
                ]
            },
            {
                name: "categories",
                fields: [
                    { name: "name", type: "text", required: true, presentable: true, unique: true },
                    { name: "active", type: "bool", required: false },
                ]
            },
            {
                name: "maintenance_tasks",
                fields: [
                    { name: "title", type: "text", required: true, presentable: true },
                    { name: "group_title", type: "text", required: false },
                    { name: "subtext", type: "text", required: false },
                    { name: "category", type: "text", required: true },
                    { name: "press", type: "text", required: true },
                    { name: "last_maintenance", type: "date", required: false },
                    { name: "next_maintenance", type: "date", required: false },
                    { name: "interval", type: "number", required: false },
                    { name: "interval_unit", type: "select", options: { values: ["days", "weeks", "months"] } },
                    { name: "assigned_to", type: "text", required: false }, // Should be relation ideally, using text for now as per schema
                    { name: "notes", type: "text", required: false },
                ]
            },
            {
                name: "feedback",
                fields: [
                    { name: "type", type: "select", required: true, options: { values: ["bug", "feature", "general"] } },
                    { name: "message", type: "text", required: true },
                    { name: "context", type: "json", required: false },
                    { name: "user", type: "text", required: false },
                    { name: "status", type: "select", options: { values: ["new", "in_progress", "closed"] } },
                ]
            }
        ];

        for (const colDef of collectionsToFix) {
            try {
                const collection = await pb.collections.getOne(colDef.name);
                console.log(`Updating fields for '${colDef.name}'...`);

                // Update collection with new fields
                await pb.collections.update(collection.id, {
                    fields: colDef.fields
                });
                console.log(`SUCCESS: Updated fields for '${colDef.name}'`);

            } catch (e) {
                console.error(`Failed to update '${colDef.name}':`, e.message);
                // If it failed because it doesn't exist, try create (with fields)
                if (e.status === 404) {
                    try {
                        console.log(`Collection '${colDef.name}' not found, creating with fields...`);
                        await pb.collections.create({
                            name: colDef.name,
                            type: 'base',
                            fields: colDef.fields
                        });
                        console.log(`SUCCESS: Created '${colDef.name}'`);
                    } catch (createErr) {
                        console.error(`Failed to create '${colDef.name}':`, createErr.message);
                    }
                }
            }
        }

    } catch (e) {
        console.error("Fix fields script failed:", e);
    }
}

fixFields();
