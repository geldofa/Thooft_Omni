import PocketBase from 'pocketbase';

const pb = new PocketBase('http://127.0.0.1:8090');

const usersToUpdate = [
    { username: 'admin', role: 'admin' },
    { username: 'tom', role: 'admin' },
    { username: 'meestergast', role: 'meestergast' },
    { username: 'lithoman', role: 'press', press: 'Lithoman' },
    { username: 'c80', role: 'press', press: 'C80' },
    { username: 'c818', role: 'press', press: 'C818' }
];

async function fixRoles() {
    try {
        // We need to auth as superuser to update other users
        await pb.collection('_superusers').authWithPassword('admin@example.com', 'admin123456');
        console.log("Authenticated as Superuser.");

        for (const u of usersToUpdate) {
            try {
                // Find user by username
                const record = await pb.collection('users').getFirstListItem(`username="${u.username}"`);

                // Update
                await pb.collection('users').update(record.id, {
                    role: u.role,
                    press: u.press || ''
                });

                console.log(`Updated ${u.username} -> role: ${u.role}`);
            } catch (e) {
                console.log(`Skipping ${u.username}: ${e.message}`);
            }
        }
    } catch (e) {
        console.error("Fix failed:", e);
    }
}

fixRoles();
