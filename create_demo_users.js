import PocketBase from 'pocketbase';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PB_URL = `http://127.0.0.1:8090`; // Ensure this matches your PocketBase instance
const pb = new PocketBase(PB_URL);

const SUPER_ADMIN_EMAIL = 'admin@example.com';
const SUPER_ADMIN_PASSWORD = 'admin123';

const DEMO_USERS = {
  ADMIN: { username: 'admin', password: 'admin123' },
  TOM: { username: 'tom', password: 'tom123' },
  LITHOMAN: { username: 'lithoman', password: 'litho123' },
  C80: { username: 'c80', password: 'c80123' },
  C818: { username: 'c818', password: 'c818123' },
};

async function createDemoUsers() {
  try {
    // 1. Authenticate as super admin
    console.log(`Attempting to authenticate as super admin: ${SUPER_ADMIN_EMAIL}`);
    await pb.admins.authWithPassword(SUPER_ADMIN_EMAIL, SUPER_ADMIN_PASSWORD);
    console.log('Super admin authenticated successfully.');

    if (!pb.authStore.isValid) {
      console.error('Failed to authenticate super admin. Check credentials.');
      return;
    }

    // 2. Ensure 'users' collection exists and is configured for auth
    // (This step is more for verification, actual creation/config usually happens via migrations or admin UI)
    try {
      await pb.collection('users').getOne('some_id', { '$autoCancel': false }); // Just a quick check if collection is accessible
      console.log("'users' collection is accessible.");
    } catch (e) {
      if (e.status === 404) {
        console.warn("'users' collection not found or not accessible. Please ensure it exists and has auth rules set up via PocketBase Admin UI.");
        console.warn("Attempting to create 'users' collection - this might fail if you haven't enabled allow unverified collections to be created via API. Best to create it manually in the admin UI if this fails.");
        // Attempt to create a basic 'users' collection if it doesn't exist
        await pb.collections.create({
          "name": "users",
          "type": "auth",
          "schema": [
            {
              "system": false,
              "id": "users_username",
              "name": "username",
              "type": "text",
              "required": true,
              "unique": true,
              "options": {
                "min": null,
                "max": null,
                "pattern": ""
              }
            },
            {
              "system": false,
              "id": "users_email",
              "name": "email",
              "type": "email",
              "required": true,
              "unique": true,
              "options": {
                "exceptDomains": null,
                "onlyDomains": null
              }
            },
            {
              "system": false,
              "id": "users_password",
              "name": "password",
              "type": "text",
              "required": true,
              "unique": false,
              "options": {
                "min": null,
                "max": null,
                "pattern": ""
              }
            },
            {
              "system": false,
              "id": "users_name",
              "name": "name",
              "type": "text",
              "required": false,
              "unique": false,
              "options": {
                "min": null,
                "max": null,
                "pattern": ""
              }
            },
            {
              "system": false,
              "id": "users_role",
              "name": "role",
              "type": "select",
              "required": false,
              "options": {
                "maxSelect": 1,
                "values": [
                  "admin",
                  "press",
                  "meestergast",
                  "operator"
                ]
              }
            },
            {
              "system": false,
              "id": "users_press",
              "name": "press",
              "type": "text",
              "required": false,
              "unique": false,
              "options": {
                "min": null,
                "max": null,
                "pattern": ""
              }
            }
          ],
          "auth": {
            "allowEmailAuth": true,
            "allowOAuth2Auth": true,
            "allowUsernameAuth": true,
            "minPasswordLength": 8,
            "onlyEmailDomains": null,
            "onlyVerified": false,
            "requireEmail": false
          }
        });
        console.log("Attempted to create 'users' collection.");
      } else {
        throw e; // Re-throw other errors
      }
    }


    // 3. Create demo users
    for (const key in DEMO_USERS) {
      if (Object.prototype.hasOwnProperty.call(DEMO_USERS, key)) {
        const demoUser = DEMO_USERS[key];
        try {
          const newUser = {
            username: demoUser.username,
            email: `${demoUser.username}@example.com`, // PocketBase auth collection requires email
            password: demoUser.password,
            passwordConfirm: demoUser.password,
            name: demoUser.username.charAt(0).toUpperCase() + demoUser.username.slice(1), // Capitalize first letter
            role: demoUser.username === 'admin' ? 'admin' : 'press', // Set role based on username
            press: demoUser.username === 'admin' ? '' : demoUser.username.toUpperCase(), // Set press based on username
          };

          await pb.collection('users').create(newUser);
          console.log(`Successfully created user: ${demoUser.username}`);
        } catch (e) {
          if (e.response && e.response.code === 400 && e.response.data.username?.message === 'The username is already taken.') {
            console.warn(`User '${demoUser.username}' already exists. Skipping.`);
          } else {
            console.error(`Failed to create user ${demoUser.username}:`, e);
          }
        }
      }
    }

    console.log('Demo user creation process completed.');

  } catch (e) {
    console.error('An error occurred during the demo user creation process:', e);
  } finally {
    pb.authStore.clear(); // Clear admin authentication after script
  }
}

createDemoUsers();