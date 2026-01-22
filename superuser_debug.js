import PocketBase from 'pocketbase';

const pb = new PocketBase('http://localhost:8090');

async function debug() {
    try {
        console.log("--- Superuser Debug ---");

        // 1. Auth as superuser
        await pb.collection('_superusers').authWithPassword(
            'geldofa@gmail.com',
            'cQGNFBWI$zVV%3UV!hBqi*8Le&K3nLS!V!z&#8*zJk9z6wIaoh7OdmebJuhWuq4$'
        );
        console.log("Superuser authenticated successfully.");

        // 2. Inspect users collection
        const usersColl = await pb.collections.getOne('users');
        console.log("\nUsers Collection Configuration:");
        console.log("Options:", JSON.stringify(usersColl.options, null, 2));

        // 3. List fields
        console.log("\nFields in 'users':");
        usersColl.fields.forEach(f => {
            console.log(`- [${f.id}] ${f.name} (${f.type}, system: ${f.system})`);
        });

        // 4. Try a test authentication manually if we can find a user
        const records = await pb.collection('users').getList(1, 5);
        if (records.totalItems > 0) {
            const user = records.items[0];
            console.log(`\nTesting with user: ID=${user.id}, Username='${user.username}', Email='${user.email}'`);
        } else {
            console.log("No users found to test with.");
        }

    } catch (e) {
        console.error("Debug Error:", e.message);
        if (e.data) console.error("Error Details:", JSON.stringify(e.data, null, 2));
    }
}

debug();
