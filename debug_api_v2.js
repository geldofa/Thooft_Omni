import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function debugApiV2() {
    try {
        await pb.admins.authWithPassword('admin@example.com', 'admin123456');
        console.log("Authenticated as Admin.");

        console.log("\n--- TEST 1: Feedback WITH sort ---");
        try {
            await pb.collection('feedback').getList(1, 10, { sort: '-created' });
            console.log("SUCCESS: Feedback with sort");
        } catch (e) {
            console.log("FAILURE: Feedback with sort ->", e.status);
        }

        console.log("\n--- TEST 2: Feedback WITHOUT sort ---");
        try {
            await pb.collection('feedback').getList(1, 10);
            console.log("SUCCESS: Feedback without sort");
        } catch (e) {
            console.log("FAILURE: Feedback without sort ->", e.status);
        }

        console.log("\n--- TEST 3: Tasks WITH sort ---");
        try {
            await pb.collection('maintenance_tasks').getFullList({ sort: '-created' });
            console.log("SUCCESS: Tasks with sort");
        } catch (e) {
            console.log("FAILURE: Tasks with sort ->", e.status);
        }

        console.log("\n--- TEST 4: Tasks WITHOUT sort ---");
        try {
            await pb.collection('maintenance_tasks').getFullList();
            console.log("SUCCESS: Tasks without sort");
        } catch (e) {
            console.log("FAILURE: Tasks without sort ->", e.status);
        }

    } catch (e) {
        console.error("Global error:", e);
    }
}

debugApiV2();
