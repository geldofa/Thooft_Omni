import PocketBase from 'pocketbase';

const pb = new PocketBase('http://localhost:8090');

async function debug() {
    try {
        await pb.collection('_superusers').authWithPassword(
            'geldofa@gmail.com',
            'cQGNFBWI$zVV%3UV!hBqi*8Le&K3nLS!V!z&#8*zJk9z6wIaoh7OdmebJuhWuq4$'
        );

        const usersColl = await pb.send('/api/collections/users', {});
        console.log("RAW COLLECTION JSON:");
        console.log(JSON.stringify(usersColl, null, 2));

        const records = await pb.collection('users').getList(1, 1);
        if (records.items.length > 0) {
            console.log("\nRAW RECORD SAMPLE:");
            console.log(JSON.stringify(records.items[0], null, 2));
        }

    } catch (e) {
        console.error("Debug Error:", e.message);
    }
}

debug();
