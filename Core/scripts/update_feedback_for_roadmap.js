#!/usr/bin/env node
/**
 * Script to update the feedback collection schema for Roadmap features.
 * Run: node scripts/update_feedback_for_roadmap.js
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

        // PocketBase v0.23+ uses 'fields' instead of 'schema'
        const fields = feedbackCollection.fields || feedbackCollection.schema || [];

        let modified = false;

        // Inspect 'onderhoud' collection to see how select fields are structured
        try {
            const onderhoud = await pb.collections.getOne('onderhoud');
            const selectField = (onderhoud.fields || onderhoud.schema || []).find(f => f.type === 'select');
            if (selectField) {
                console.log('Found example select field in "onderhoud":', JSON.stringify(selectField, null, 2));
            } else {
                console.log('No select field found in "onderhoud" to use as reference.');
            }
        } catch (e) {
            console.log('Could not fetch "onderhoud" collection for reference.');
        }



        // 1. show_on_roadmap (bool)
        if (!fields.find(f => f.name === 'show_on_roadmap')) {
            console.log('  → Adding "show_on_roadmap" field');
            fields.push({ name: 'show_on_roadmap', type: 'bool', required: false, options: {} });
            modified = true;
        }

        // 2. roadmap_status (select)
        if (!fields.find(f => f.name === 'roadmap_status')) {
            console.log('  → Adding "roadmap_status" field');
            // Try flattened structure if options nesting was the issue, or verify against example
            // Based on error "values: Cannot be blank", it seems it expects values to be present.
            // If I see the example, I might change this. For now, I will keep standard structure but ensure it is clean.
            fields.push({
                name: 'roadmap_status',
                type: 'select',
                required: false,
                maxSelect: 1,
                values: ['planned', 'in_progress', 'completed']
            });
            modified = true;
        }

        // 3. roadmap_title (text)
        if (!fields.find(f => f.name === 'roadmap_title')) {
            console.log('  → Adding "roadmap_title" field');
            fields.push({ name: 'roadmap_title', type: 'text', required: false, options: {} });
            modified = true;
        }

        if (!modified) {
            console.log('No schema changes needed.');
            return;
        }

        // Update the collection
        const updateData = {
            // PocketBase might require sending all rules again, or just the changes. 
            // Usually updating a collection requires sending the full object or at least the parts you want to update/keep?
            // The previous script sent everything.
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

        console.log('\n✓ Feedback collection updated successfully!');
        console.log('  Added fields: show_on_roadmap, roadmap_status, roadmap_title');

    } catch (error) {
        console.error('\n✗ Error:', error.message);
        if (error.response) {
            console.error('  Response:', JSON.stringify(error.response, null, 2));
        }
        process.exit(1);
    }
}

main();
