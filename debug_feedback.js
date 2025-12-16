import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function debugFeedback() {
    try {
        await pb.admins.authWithPassword('admin@example.com', 'admin123456');
        console.log("Authenticated as Admin.");

        // 1. List existing feedback
        try {
            const records = await pb.collection('feedback').getFullList();
            console.log(`Found ${records.length} feedback items.`);
            if (records.length > 0) {
                console.log("First item:", JSON.stringify(records[0], null, 2));
            }
        } catch (e) {
            console.error("Failed to list feedback:", e.message);
        }

        // 2. Try to create a dummy feedback item
        console.log("Attempting to create dummy feedback...");
        try {
            const newItem = await pb.collection('feedback').create({
                type: "bug",
                message: "Debug message from script " + new Date().toISOString(),
                user: "DebugScript",
                status: "new"
            });
            console.log("SUCCESS: Created feedback item:", newItem.id);
        } catch (e) {
            console.error("FAILED to create feedback:", e.message);
            console.dir(e.data, { depth: null });
        }

    } catch (e) {
        console.error("Script failed:", e);
    }
}

debugFeedback();
