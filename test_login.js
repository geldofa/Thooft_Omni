import PocketBase from 'pocketbase';

const pb = new PocketBase('http://localhost:8090');

async function testLogin() {
    console.log("Attempting login as 'admin'...");

    // 1. Try User Login
    try {
        const authData = await pb.collection('users').authWithPassword('admin', 'password123'); // I will ask user for password or just test a guess, but wait. user said they entered correctly.
        // Actually, I can't guess the password.
        // But I can try to CREATE a new user and login with it to see if SYSTEM is broken or just credentials.
        console.log("Login Success!", authData.record.id);
    } catch (e) {
        console.log("Login Failed:");
        console.log(e.originalError || e);
        console.log("Full data:", e.data);
    }
}

// I need the user's password to test strictly. 
// Instead, I will assume the system creates users correctly.
// I'll create a TEST user via verifying script logic.

async function verifySystem() {
    const testUsername = 'test_debug_user_' + Math.floor(Math.random() * 1000);
    const testPassword = 'Password123!';

    console.log(`Creating test user: ${testUsername} ...`);
    try {
        await pb.collection('users').create({
            username: testUsername,
            email: `${testUsername}@example.com`,
            password: testPassword,
            passwordConfirm: testPassword,
            name: 'Test Debug'
        });
        console.log("Creation successful.");

        // CHECK DB
        try {
            const { exec } = await import('child_process');
            const util = await import('util');
            const execPromise = util.promisify(exec);
            const { stdout } = await execPromise(`sqlite3 pb_data/data.db "SELECT password FROM users WHERE username='${testUsername}';"`);
            console.log("DB Password Hash:", stdout.trim());
        } catch (err) {
            console.error("Failed to read DB:", err);
        }

        // Print active options
        try {
            // AUTH AS ADMIN LOCALLY
            await pb.admins.authWithPassword('geldofa@gmail.com', 'cQGNFBWI$zVV%3UV!hBqi*8Le&K3nLS!V!z&#8*zJk9z6wIaoh7OdmebJuhWuq4$');
            const uCol = await pb.collections.getOne('users');
            console.log("Active passwordAuth config:", JSON.stringify(uCol.options?.passwordAuth, null, 2));
            pb.authStore.clear(); // Clear admin
        } catch (e) { console.log("Could not fetch config:", e.message); }

        console.log("Attempting login with USERNAME...");
        try {
            const authData = await pb.collection('users').authWithPassword(testUsername, testPassword);
            console.log("Username Login successful! Token:", authData.token.substring(0, 10) + "...");
        } catch (e) {
            console.log("Username Login Failed:", e.status);
        }

        console.log("Attempting login with EMAIL...");
        try {
            const authData = await pb.collection('users').authWithPassword(`${testUsername}@example.com`, testPassword);
            console.log("Email Login successful! Token:", authData.token.substring(0, 10) + "...");
            // Clean up
            await pb.collection('users').delete(authData.record.id);
            console.log("Test user deleted.");
            return;
        } catch (e) {
            console.log("Email Login Failed:", e.status);
            console.log("Email Login Error:", e.response || e.data);
        }


    } catch (e) {
        console.error("SYSTEM VERIFICATION FAILED:");
        console.error("Status:", e.status);
        console.error("Message:", e.message);
        console.error("Data:", JSON.stringify(e.data, null, 2));
        console.error("Original Error:", e.originalError);
    }


    // AUTH AS ADMIN
    try {
        console.log("Authenticating as Admin...");
        await pb.admins.authWithPassword('geldofa@gmail.com', 'cQGNFBWI$zVV%3UV!hBqi*8Le&K3nLS!V!z&#8*zJk9z6wIaoh7OdmebJuhWuq4$');
        console.log("Admin Auth Success.");

        // INSPECT USERS COLLECTION
        try {
            const usersCol = await pb.collections.getOne('users');
            console.log("USERS COLLECTION (Before Update):");
            console.log(JSON.stringify(usersCol, null, 2));

            // APPLY FIX VIA API
            console.log("Applying fix via API...");
            usersCol.options = usersCol.options || {};
            usersCol.options.passwordAuth = usersCol.options.passwordAuth || {};
            usersCol.options.passwordAuth.identityFields = ["username", "email"];

            // Ensure email verification is NOT required
            usersCol.options.requireEmailVerification = false;

            // Fix authRule (must be empty string to allow auth)
            usersCol.authRule = "";

            console.log(`Updating collection ${usersCol.id}...`);
            await pb.collections.update(usersCol.id, usersCol);
            console.log("USERS COLLECTION UPDATED SUCCESSFULLY.");

            // Verify
            const updatedCol = await pb.collections.getOne('users');
            console.log("USERS COLLECTION (After Update):");
            console.log(JSON.stringify(updatedCol, null, 2));

        } catch (e) {
            console.error("Failed to update users collection:", e.message);
            console.error(e.data);
        }

    } catch (e) {
        console.error("ADMIN AUTH FAILED:", e.data || e.message);
        return;
    }

    // TEST FRESH COLLECTION
    console.log("\n--- Testing Fresh Collection ---");
    try {
        const colName = 'test_users_' + Math.floor(Math.random() * 1000);
        await pb.collections.create({
            name: colName,
            type: 'auth',
            options: {
                allowEmailAuth: true,
                allowUsernameAuth: true,
                allowOAuth2Auth: true,
                allowEmailAuth: true,
                minPasswordLength: 8,
                requireEmailVerification: false
            }
        });
        console.log(`Created collection ${colName}`);

        const testUser = 'user' + Math.floor(Math.random() * 1000);
        await pb.collection(colName).create({
            username: testUser,
            password: 'Password123!',
            passwordConfirm: 'Password123!'
        });
        console.log(`Created user ${testUser} in ${colName}`);

        const auth = await pb.collection(colName).authWithPassword(testUser, 'Password123!');
        console.log(`Login to ${colName} SUCCESS! Token: ` + auth.token.substring(0, 10));

        // Cleanup
        await pb.collections.delete(colName);
        console.log("Cleanup success.");

    } catch (err) {
        console.error("FRESH COLLECTION TEST FAILED:", err.data || err);
    }
}

verifySystem();
