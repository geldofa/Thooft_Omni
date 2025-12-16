import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function debugApi() {
    try {
        await pb.admins.authWithPassword('admin@example.com', 'admin123456');
        console.log("Authenticated as Admin.");

        console.log("\n--- Testing Feedback Query ---");
        try {
            // Replicating AuthContext call: .getList(1, 100, { sort: '-created' })
            console.log("Calling feedback.getList(1, 100, { sort: '-created' })...");
            const feedback = await pb.collection('feedback').getList(1, 100, { sort: '-created' });
            console.log("SUCCESS: Fetched feedback.", feedback.items.length, "items.");
        } catch (e) {
            console.error("FAILURE: feedback.getList failed:", e.message);
            console.dir(e.data, { depth: null });
        }

        console.log("\n--- Testing Maintenance Tasks Query ---");
        try {
            // Replicating AuthContext call: .getFullList() (assuming that's what it is, checking later)
            console.log("Calling maintenance_tasks.getFullList()...");
            const tasks = await pb.collection('maintenance_tasks').getFullList();
            console.log("SUCCESS: Fetched tasks.", tasks.length, "items.");
        } catch (e) {
            console.error("FAILURE: maintenance_tasks.getFullList failed:", e.message);
            console.dir(e.data, { depth: null });
        }

    } catch (e) {
        console.error("Global error:", e);
    }
}

debugApi();
