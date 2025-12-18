import PocketBase from 'pocketbase';

// Use environment variable for PB_URL with a fallback
const PB_URL = process.env.PB_URL || 'http://127.0.0.1:8090';
const pb = new PocketBase(PB_URL);


const users = [
    { username: 'admin', email: 'admin_user@example.com', name: 'Admin User', password: 'admin123', passwordConfirm: 'admin123', role: 'admin' },
    { username: 'tom', email: 'tom@example.com', name: 'Tom Peeters', password: 'tompassword', passwordConfirm: 'tompassword', role: 'admin' },
    { username: 'meestergast', email: 'meestergast@example.com', name: 'Meestergast', password: 'meestergast', passwordConfirm: 'meestergast', role: 'meestergast' },
    { username: 'lithoman', email: 'lithoman@example.com', name: 'Lithoman Operator', password: 'litho123', passwordConfirm: 'litho123', role: 'press', press: 'Lithoman' },
    { username: 'c80', email: 'c80@example.com', name: 'C80 Operator', password: 'c80password', passwordConfirm: 'c80password', role: 'press', press: 'C80' },
    { username: 'c818', email: 'c818@example.com', name: 'C818 Operator', password: 'c818password', passwordConfirm: 'c818password', role: 'press', press: 'C818' }
];

async function seed() {
    try {
        // Authenticate as Super Admin
        await pb.admins.authWithPassword('admin@example.com', 'admin123456');
        console.log("Authenticated as Admin.");

        for (const u of users) {
            try {
                await pb.collection('users').create({
                    username: u.username,
                    email: u.email,
                    name: u.name,
                    password: u.password,
                    passwordConfirm: u.passwordConfirm,
                    role: u.role,
                    press: u.press
                }, { requestKey: null }); // disable auto cancellation
                console.log(`Created user: ${u.username}`);
            } catch (e) {
                if (e.status === 400) console.log(`User ${u.username} already exists or invalid (check pw length).`);
                else console.error(`Failed to create ${u.username}:`, e.message);
            }
        }
    } catch (e) {
        console.error("Seeding failed:", e);
    }
}

seed();
