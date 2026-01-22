import PocketBase from 'pocketbase';

const pb = new PocketBase('http://localhost:8090');

async function debug() {
    try {
        console.log("--- PocketBase Auth Debug ---");

        // 1. Check if we can reach the server
        try {
            const health = await pb.health.check();
            console.log("Server Health:", health);
        } catch (e) {
            console.log("Health check failed (might be old PB version):", e.message);
        }

        // 2. Inspect the users collection schema
        try {
            console.log("\nInspecting 'users' collection...");
            const collections = await pb.collections.getFullList();
            const usersColl = collections.find(c => c.name === 'users');
            if (usersColl) {
                console.log("Collection Options:", JSON.stringify(usersColl.options, null, 2));
                console.log("Identity Fields:", usersColl.options?.passwordAuth?.identityFields);
            } else {
                console.log("Collection 'users' not found!");
            }
        } catch (e) {
            console.error("Failed to inspect collection:", e.message);
        }

        // 3. List some users (since listRule is open)
        try {
            console.log("\nListing first 5 users...");
            const records = await pb.collection('users').getList(1, 5);
            console.log("Total Users:", records.totalItems);
            records.items.forEach(r => {
                console.log(`- [${r.id}] username: '${r.username}', email: '${r.email}', name: '${r.name}'`);
            });
        } catch (e) {
            console.error("Failed to list users:", e.message);
        }

    } catch (e) {
        console.error("Fatal Error:", e);
    }
}

debug();
