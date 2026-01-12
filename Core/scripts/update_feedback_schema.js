#!/usr/bin/env node
/**
 * Script to update the feedback collection schema and API rules in PocketBase.
 * Run: node scripts/update_feedback_schema.js
 */

import PocketBase from 'pocketbase';

const PB_URL = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
const ADMIN_EMAIL = process.env.PB_ADMIN_EMAIL || 'geldofa@gmail.com';
const ADMIN_PASSWORD = process.env.PB_ADMIN_PASSWORD || 'cQGNFBWI$zVV%3UV!hBqi*8Le&K3nLS!V!z&#8*zJk9z6wIaoh7OdmebJuhWuq4$';

async function main() {
    const pb = new PocketBase(PB_URL);

    try {
        // Authenticate as admin
        console.log(`Connecting to PocketBase at ${PB_URL}...`);
        await pb.admins.authWithPassword(ADMIN_EMAIL, ADMIN_PASSWORD);
        console.log('✓ Authenticated as admin');

        // Fetch current feedback collection
        const feedbackCollection = await pb.collections.getOne('feedback');

        if (!feedbackCollection) {
            console.error('✗ Feedback collection not found!');
            process.exit(1);
        }

        console.log(`✓ Found feedback collection (id: ${feedbackCollection.id})`);

        // Update API Rules
        console.log('  → Updating API rules...');
        feedbackCollection.listRule = "@request.auth.id != ''";
        feedbackCollection.viewRule = "@request.auth.id != ''";
        feedbackCollection.createRule = "@request.auth.id != ''";

        // Restrict Update and Delete to Admin role only
        feedbackCollection.updateRule = "@request.auth.role = 'Admin'";
        feedbackCollection.deleteRule = "@request.auth.role = 'Admin'";

        // PocketBase v0.23+ uses 'fields' instead of 'schema'
        const fields = feedbackCollection.fields || feedbackCollection.schema || [];

        // Ensure fields exist
        if (!fields.find(f => f.name === 'admin_comment')) {
            fields.push({ name: 'admin_comment', type: 'text', required: false, options: {} });
        }
        if (!fields.find(f => f.name === 'archived')) {
            fields.push({ name: 'archived', type: 'bool', required: false, options: {} });
        }

        // Update the collection
        const updateData = {
            listRule: feedbackCollection.listRule,
            viewRule: feedbackCollection.viewRule,
            createRule: feedbackCollection.createRule,
            updateRule: feedbackCollection.updateRule,
            deleteRule: feedbackCollection.deleteRule
        };

        if (feedbackCollection.fields !== undefined) {
            updateData.fields = fields;
        } else {
            updateData.schema = fields;
        }

        await pb.collections.update(feedbackCollection.id, updateData);

        console.log('\n✓ Feedback collection updated successfully!');
        console.log('  Permissions:');
        console.log('    List/View/Create: All logged in users');
        console.log('    Update/Delete: Admin only (@request.auth.role = \'Admin\')');

    } catch (error) {
        console.error('\n✗ Error:', error.message);
        if (error.response) {
            console.error('  Response:', JSON.stringify(error.response, null, 2));
        }
        process.exit(1);
    }
}

main();
