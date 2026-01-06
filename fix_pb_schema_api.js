import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

async function fixSchema() {
    try {
        await pb.admins.authWithPassword('geldofa@gmail.com', 'cQGNFBWI$zVV%3UV!hBqi*8Le&K3nLS!V!z&#8*zJk9z6wIaoh7OdmebJuhWuq4$');
        console.log("Authenticated as Admin.");

        const collection = await pb.collections.getOne('onderhoud');
        console.log("Current fields:", collection.fields.map(f => f.name).join(', '));

        let changed = false;

        // Check opmerkingen
        if (!collection.fields.find(f => f.name === 'opmerkingen')) {
            console.log("Adding 'opmerkingen' field...");
            collection.fields.push({
                name: "opmerkingen",
                type: "text",
                required: false
            });
            changed = true;
        }

        // Check commentDate
        if (!collection.fields.find(f => f.name === 'commentDate')) {
            console.log("Adding 'commentDate' field...");
            collection.fields.push({
                name: "commentDate",
                type: "date",
                required: false
            });
            changed = true;
        }

        if (changed) {
            await pb.collections.update(collection.id, collection);
            console.log("Schema updated successfully!");
        } else {
            console.log("Schema already has the fields.");
        }

    } catch (e) {
        console.error("Error fixing schema:", e.message);
        if (e.data) console.dir(e.data, { depth: null });
    }
}

fixSchema();
