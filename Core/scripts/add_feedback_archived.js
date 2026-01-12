#!/usr/bin/env node
/**
 * Script to add archived field to feedback collection.
 * Run: node scripts/add_feedback_archived.js
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

        const feedbackCollection = await pb.collections.getOne('feedback');
        console.log(`✓ Found feedback collection (id: ${feedbackCollection.id})`);

        const fields = feedbackCollection.fields || feedbackCollection.schema || [];
        console.log('  Current fields:', fields.map(f => f.name).join(', '));

        // Check if archived field exists
        let archivedField = fields.find(f => f.name === 'archived');
        if (!archivedField) {
            fields.push({
                name: 'archived',
                type: 'bool',
                required: false,
                options: {}
            });
            console.log('  → Adding archived field');

            const updatePayload = feedbackCollection.fields !== undefined
                ? { fields: fields }
                : { schema: fields };

            await pb.collections.update(feedbackCollection.id, updatePayload);

            console.log('\n✓ Feedback collection updated with archived field!');
        } else {
            console.log('  ✓ archived field already exists');
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
