#!/usr/bin/env node
/**
 * Script to create the role_permissions collection in PocketBase.
 * Run: node scripts/setup_rbac.js
 */

import PocketBase from 'pocketbase';

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'geldofa@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'cQGNFBWI$zVV%3UV!hBqi*8Le&K3nLS!V!z&#8*zJk9z6wIaoh7OdmebJuhWuq4$';

async function main() {
    const pb = new PocketBase(PB_URL);

    try {
        console.log(`Connecting to PocketBase at ${PB_URL}...`);
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✓ Authenticated as admin');

        const collectionName = 'role_permissions';
        let collection;

        try {
            collection = await pb.collections.getOne(collectionName);
            console.log(`✓ Collection "${collectionName}" already exists.`);

            // Update rules if it exists to be sure they are correct
            await pb.collections.update(collection.id, {
                listRule: "@request.auth.id != ''",
                viewRule: "@request.auth.id != ''",
                createRule: "@request.auth.role = 'Admin'",
                updateRule: "@request.auth.role = 'Admin'",
                deleteRule: "@request.auth.role = 'Admin'",
            });
            console.log(`✓ Collection "${collectionName}" rules updated.`);
        } catch (e) {
            console.log(`  → Creating collection "${collectionName}"...`);

            const collectionData = {
                name: collectionName,
                type: 'base',
                fields: [
                    { name: 'role', type: 'text', required: true, min: 1, max: 20 },
                    { name: 'permissions', type: 'json', required: true }
                ],
                listRule: "@request.auth.id != ''",
                viewRule: "@request.auth.id != ''",
                createRule: "@request.auth.role = 'Admin'",
                updateRule: "@request.auth.role = 'Admin'",
                deleteRule: "@request.auth.role = 'Admin'",
            };

            collection = await pb.collections.create(collectionData);
            console.log(`✓ Collection "${collectionName}" created successfully!`);
        }

        // Add index separately
        try {
            const updatedCollection = await pb.collections.getOne(collectionName);
            if (!updatedCollection.indexes || !updatedCollection.indexes.includes('idx_role')) {
                const existingIndexes = updatedCollection.indexes || [];
                await pb.collections.update(updatedCollection.id, {
                    indexes: [...existingIndexes, 'CREATE UNIQUE INDEX idx_role ON role_permissions (role)']
                });
                console.log('✓ Unique index on "role" added.');
            }
        } catch (indexError) {
            console.warn('  ! Could not add index:', indexError.message);
        }

        // --- SEEDING ---
        console.log('  → Seeding initial permissions...');
        const defaults = [
            {
                role: 'Admin',
                permissions: [
                    'tasks_view', 'tasks_edit', 'drukwerken_view', 'drukwerken_view_all', 'reports_view', 'checklist_view',
                    'extern_view', 'management_access', 'manage_personnel', 'manage_categories',
                    'manage_tags', 'manage_presses', 'manage_accounts', 'manage_permissions',
                    'toolbox_access', 'logs_view', 'feedback_view', 'feedback_manage'
                ]
            },
            {
                role: 'Meestergast',
                permissions: [
                    'tasks_view', 'tasks_edit', 'drukwerken_view', 'drukwerken_view_all', 'checklist_view',
                    'extern_view', 'logs_view', 'feedback_view'
                ]
            },
            {
                role: 'Operator',
                permissions: ['tasks_view', 'drukwerken_view', 'feedback_view']
            }
        ];

        for (const def of defaults) {
            try {
                const existing = await pb.collection(collectionName).getFirstListItem(`role="${def.role}"`);
                console.log(`  - Role "${def.role}" already seeded.`);
            } catch (e) {
                await pb.collection(collectionName).create(def);
                console.log(`  + Role "${def.role}" seeded.`);
            }
        }

    } catch (error) {
        console.error('\n✗ Error:', error.message);
        if (error.response) {
            console.error('  Response:', JSON.stringify(error.response, null, 2));
        }
        process.exit(1);
    }
}

main();
