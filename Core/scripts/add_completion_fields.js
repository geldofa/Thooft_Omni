#!/usr/bin/env node
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
        const fields = feedbackCollection.fields || feedbackCollection.schema || [];
        let modified = false;

        // 1. completed_version (text)
        if (!fields.find(f => f.name === 'completed_version')) {
            console.log('  → Adding "completed_version" field');
            fields.push({ name: 'completed_version', type: 'text', required: false, options: {} });
            modified = true;
        }

        // 2. completed_at (date)
        if (!fields.find(f => f.name === 'completed_at')) {
            console.log('  → Adding "completed_at" field');
            fields.push({ name: 'completed_at', type: 'date', required: false, options: {} });
            modified = true;
        }

        if (!modified) {
            console.log('No schema changes needed.');
            return;
        }

        const updateData = {
            listRule: feedbackCollection.listRule,
            viewRule: feedbackCollection.viewRule,
            createRule: feedbackCollection.createRule,
            updateRule: feedbackCollection.updateRule,
            deleteRule: feedbackCollection.deleteRule,
            name: feedbackCollection.name,
            type: feedbackCollection.type,
            system: feedbackCollection.system
        };

        if (feedbackCollection.fields !== undefined) {
            updateData.fields = fields;
        } else {
            updateData.schema = fields;
        }

        await pb.collections.update(feedbackCollection.id, updateData);
        console.log('✓ Feedback collection updated successfully!');
    } catch (error) {
        console.error('✗ Error:', error.message);
        process.exit(1);
    }
}

main();
