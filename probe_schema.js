import PocketBase from 'pocketbase';

const PB_URL = 'http://127.0.0.1:8090';
const pb = new PocketBase(PB_URL);

async function probe() {
    try {
        const adminEmail = "geldofa@gmail.com";
        const adminPass = "cQGNFBWI$zVV%3UV!hBqi*8Le&K3nLS!V!z&#8*zJk9z6wIaoh7OdmebJuhWuq4$";

        await pb.admins.authWithPassword(adminEmail, adminPass);

        console.log("Fetching collections...");
        const usersColl = await pb.collections.getOne("users");
        const persenColl = await pb.collections.getOne("persen");

        // Check if fields exist
        const hasPress = usersColl.fields.some(f => f.name === "press");
        const hasPers = usersColl.fields.some(f => f.name === "pers");

        if (!hasPress) {
            console.log("Adding 'press' field...");
            usersColl.fields.push({
                name: "press",
                type: "text",
                system: false,
                required: false,
                presentable: false
            });
        }

        if (!hasPers) {
            console.log("Adding 'pers' relation field...");
            usersColl.fields.push({
                name: "pers",
                type: "relation",
                system: false,
                required: false,
                presentable: false,
                collectionId: persenColl.id,
                cascadeDelete: false,
                maxSelect: 1,
                minSelect: 0
            });
        }

        if (!hasPress || !hasPers) {
            await pb.collections.update(usersColl.id, usersColl);
            console.log("Users schema updated successfully via SDK.");
        } else {
            console.log("Fields already exist in schema.");
        }

        // Now seed the data
        const users = await pb.collection('users').getFullList();
        const persen = await pb.collection('persen').getFullList();

        const mappings = {
            "lithoman": "Lithoman",
            "c80": "C80",
            "c818": "C818"
        };

        for (const [username, pressName] of Object.entries(mappings)) {
            const user = users.find(u => u.username === username);
            const press = persen.find(p => p.naam === pressName);

            if (user) {
                const updateData = { press: pressName };
                if (press) updateData.pers = press.id;

                await pb.collection('users').update(user.id, updateData);
                console.log(`Updated user ${username} with press ${pressName}`);
            }
        }

    } catch (e) {
        console.error("Task failed:", e.message);
        if (e.data) console.error("Error data:", JSON.stringify(e.data, null, 2));
    }
}

probe();
