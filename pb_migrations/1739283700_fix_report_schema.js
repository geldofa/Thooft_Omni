migrate((app) => {
    // 1. Get the collection
    const collection = app.findCollectionByNameOrId("maintenance_reports");
    const pressCollection = app.findCollectionByNameOrId("persen");

    // 2. Re-apply schema fields if missing
    // We will clear existing fields and re-add them to be safe
    // Note: This might lose data if there was any, but "sample_record" was "No records" so it's safe.

    // Actually, safer to update/merge fields.

    collection.fields.add(new Field({
        name: "name",
        type: "text",
        required: true,
        presentable: true
    }));

    collection.fields.add(new RelationField({
        name: "press_ids",
        collectionId: pressCollection.id,
        cascadeDelete: false,
        maxSelect: 0 // unlimited
    }));

    collection.fields.add(new SelectField({
        name: "period",
        required: true,
        maxSelect: 1,
        values: ["day", "week", "month", "year"]
    }));

    collection.fields.add(new BoolField({
        name: "auto_generate",
        required: false
    }));

    collection.fields.add(new NumberField({
        name: "schedule_day",
        required: false,
        min: 1,
        max: 31,
        onlyInt: true
    }));

    collection.fields.add(new DateField({
        name: "last_run",
        required: false
    }));

    collection.fields.add(new BoolField({
        name: "email_enabled",
        required: false
    }));

    collection.fields.add(new TextField({
        name: "email_recipients",
        required: false
    }));

    collection.fields.add(new TextField({
        name: "email_subject",
        required: false
    }));

    app.save(collection);

}, (app) => {
    // Rever logic (optional/tricky without knowing old state)
})
