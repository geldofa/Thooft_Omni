import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function fix() {
    try {
        await pb.admins.authWithPassword('admin@example.com', 'admin123456');
        console.log("Authenticated as Admin.");

        const collectionsToEnsure = [
            {
                name: "presses",
                type: "base",
                schema: [
                    { name: "name", type: "text", required: true, unique: true },
                    { name: "active", type: "bool", required: false },
                ],
                listRule: "",
                viewRule: "",
                createRule: "@request.auth.role = 'admin'",
                updateRule: "@request.auth.role = 'admin'",
                deleteRule: "@request.auth.role = 'admin'",
            },
            {
                name: "categories",
                type: "base",
                schema: [
                    { name: "name", type: "text", required: true, unique: true },
                    { name: "active", type: "bool", required: false },
                ],
                listRule: "",
                viewRule: "",
                createRule: "@request.auth.role = 'admin'",
                updateRule: "@request.auth.role = 'admin'",
                deleteRule: "@request.auth.role = 'admin'",
            },
            {
                name: "maintenance_tasks",
                type: "base",
                schema: [
                    { name: "title", type: "text", required: true },
                    { name: "group_title", type: "text", required: false },
                    { name: "subtext", type: "text", required: false },
                    { name: "category", type: "text", required: true },
                    { name: "press", type: "text", required: true },
                    { name: "last_maintenance", type: "date", required: false },
                    { name: "next_maintenance", type: "date", required: false },
                    { name: "interval", type: "number", required: false },
                    { name: "interval_unit", type: "select", options: { values: ["days", "weeks", "months"] } },
                    { name: "assigned_to", type: "text", required: false },
                    { name: "notes", type: "text", required: false },
                ],
                listRule: "",
                viewRule: "",
                createRule: "",
                updateRule: "",
                deleteRule: "",
            },
            {
                name: "feedback",
                type: "base",
                schema: [
                    { name: "type", type: "select", required: true, options: { values: ["bug", "feature", "general"] } },
                    { name: "message", type: "text", required: true },
                    { name: "context", type: "json", required: false },
                    { name: "user", type: "text", required: false },
                    { name: "status", type: "select", options: { values: ["new", "in_progress", "closed"] } },
                ],
                listRule: "",
                viewRule: "",
                createRule: "",
                updateRule: "@request.auth.id != ''",
                deleteRule: "@request.auth.role = 'admin'",
            }
        ];

        for (const colDef of collectionsToEnsure) {
            try {
                await pb.collections.getOne(colDef.name);
                console.log(`Collection '${colDef.name}' already exists.`);
            } catch (e) {
                console.log(`Collection '${colDef.name}' missing. Creating...`);
                try {
                    await pb.collections.create(colDef);
                    console.log(`SUCCESS: Created '${colDef.name}'`);
                } catch (createError) {
                    console.error(`FAILED to create '${colDef.name}':`, createError.message);
                }
            }
        }

    } catch (e) {
        console.error("Fix script failed:", e);
    }
}

fix();
