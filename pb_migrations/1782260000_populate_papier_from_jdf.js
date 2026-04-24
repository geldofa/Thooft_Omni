/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    console.log("🚀 Starting migration: Populate papier collection from existing jdf_orders");

    try {
        const jdfOrders = app.findRecordsByFilter("jdf_orders", "papier != ''");
        const papierCollection = app.findCollectionByNameOrId("papier");
        
        const existingPapers = app.findRecordsByFilter("papier", "1=1");
        const existingNames = new Set(existingPapers.map(p => p.getString("naam")));

        let count = 0;
        jdfOrders.forEach(order => {
            const papierName = order.getString("papier");
            if (papierName && !existingNames.has(papierName)) {
                const record = new Record(papierCollection);
                record.set("naam", papierName);
                app.save(record);
                existingNames.add(papierName);
                count++;
            }
        });

        console.log(`   ✅ Added ${count} new papers from existing JDF orders`);
    } catch (e) {
        console.error("   ❌ Failed to populate papier from JDF orders:", e);
    }

}, (app) => {
    // No rollback needed
});
