import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function fixFeedback() {
    try {
        await pb.admins.authWithPassword('admin@example.com', 'admin123456');
        console.log("Authenticated as Admin.");

        const feedbackSchema = [
            { name: "type", type: "text", required: true }, // Changed to text to avoid select schema issues
            { name: "message", type: "text", required: true },
            { name: "context", type: "json", required: false },
            { name: "user", type: "text", required: false }, // Store username or ID
            { name: "status", type: "text", required: false }, // Changed to text
        ];

        try {
            const collection = await pb.collections.getOne("feedback");
            console.log("Feedback collection exists. Attempting update...");
            try {
                await pb.collections.update(collection.id, {
                    fields: feedbackSchema
                });
                console.log("SUCCESS: Updated 'feedback' fields.");
            } catch (updateErr) {
                console.error("Update failed:", updateErr.message);
                console.dir(updateErr.data, { depth: null });

                // If update fails, DELETE and RECREATE (Assuming data loss is acceptable during dev/fix phase)
                console.log("Deleting and recreating 'feedback' collection...");
                await pb.collections.delete(collection.id);
                throw { status: 404 }; // Trigger create block
            }
        } catch (e) {
            if (e.status === 404) {
                console.log("Creating 'feedback' collection...");
                await pb.collections.create({
                    name: "feedback",
                    type: "base",
                    fields: feedbackSchema,
                    listRule: "", // Public? Or auth only? Let's make it public for now to debug
                    viewRule: "",
                    createRule: "", // Public create
                    updateRule: "@request.auth.id != ''",
                    deleteRule: "@request.auth.role = 'admin'",
                });
                console.log("SUCCESS: Created 'feedback' collection.");
            } else {
                throw e;
            }
        }

    } catch (e) {
        console.error("Script failed:", e);
    }
}

fixFeedback();
