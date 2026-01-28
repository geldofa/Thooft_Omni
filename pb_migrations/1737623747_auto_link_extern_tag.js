migrate((app) => {
    const collection = app.findCollectionByNameOrId("tags");
    const onderhoud = app.findCollectionByNameOrId("onderhoud");

    // 1. Set rules to empty string (matches other collections for public access)
    collection.listRule = "";
    collection.viewRule = "";
    collection.createRule = "";
    collection.updateRule = "";
    collection.deleteRule = "";
    app.save(collection);

    // 2. Find the Extern tag
    const externTag = app.findFirstRecordByFilter("tags", "naam = 'Extern'");

    if (externTag) {
        // 3. Update all onderhoud records where is_external is true
        const records = app.findRecordsByFilter("onderhoud", "is_external = true && tags !~ '" + externTag.id + "'");

        records.forEach(record => {
            const currentTags = record.get("tags") || [];
            const tagList = Array.isArray(currentTags) ? currentTags : (currentTags ? [currentTags] : []);

            if (!tagList.includes(externTag.id)) {
                tagList.push(externTag.id);
                record.set("tags", tagList);
                app.save(record);
            }
        });

        console.log(`Linked ${records.length} tasks to the Extern tag.`);
    }
})
