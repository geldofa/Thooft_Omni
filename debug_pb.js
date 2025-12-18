import PocketBase from 'pocketbase';

// Use environment variable for PB_URL with a fallback
const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090';
const pb = new PocketBase(PB_URL);


async function debug() {
    try {
        // 1. Authenticate as Super Admin
        await pb.admins.authWithPassword('admin@example.com', 'admin123456');
        console.log("Authenticated as Super Admin.");

        // 2. Inspcet 'presses' collection
        try {
            const collection = await pb.collections.getOne('presses');
            console.log("--- Collection 'presses' ---");
            console.log("Create Rule:", collection.createRule);
            console.log("Schema:", JSON.stringify(collection.schema, null, 2));
        } catch (e) {
            console.error("Failed to get 'presses' collection:", e.message);
        }

        // 3. Inspect 'users' collection to check for 'role' field
        try {
            const collection = await pb.collections.getOne('users');
            console.log("--- Collection 'users' ---");
            console.log("Schema:", JSON.stringify(collection.schema, null, 2));
        } catch (e) {
            console.error("Failed to get 'users' collection:", e.message);
        }

        // 4. Authenticate as 'admin' user (regular user)
        console.log("\n--- Testing User Auth ---");
        try {
            const authData = await pb.collection('users').authWithPassword('admin', 'admin123');
            console.log("Logged in as user 'admin'.");
            console.log("User Data:", JSON.stringify(authData.record, null, 2));

            // 5. Try to create a press as this user
            console.log("Attempting to create press as user...");
            try {
                const result = await pb.collection('presses').create({
                    name: "DebugPress_" + Date.now(),
                    active: true
                });
                console.log("SUCCESS: Created press", result.id);
                // clean up
                await pb.collection('presses').delete(result.id);
            } catch (e) {
                console.error("FAILURE: Failed to create press:", e.message);
                console.error("Details:", e.data);
            }

        } catch (e) {
            console.error("Login as 'admin' user failed (might not exist or wrong pw):", e.message);
        }

    } catch (e) {
        console.error("Global error:", e);
    }
}

debug();
