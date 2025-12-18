migrate((app) => {
    try {
        const users = app.findCollectionByNameOrId("users");

        // 1. Add fields if missing
        let hasUsername = false;
        try {
            users.fields.getByName("username");
            hasUsername = true;
        } catch (e) { }

        if (!hasUsername) {
            users.fields.add({
                name: "username",
                type: "text",
                required: true,
                pattern: "^[a-zA-Z0-9_\\.]+$"
            });
        }

        let hasOperatorId = false;
        try {
            users.fields.getByName("operatorId");
            hasOperatorId = true;
        } catch (e) { }

        if (!hasOperatorId) {
            users.fields.add({
                name: "operatorId",
                type: "text"
            });
        }

        // SAVE 1: Commit fields to schema
        app.save(users);

        // 2. Re-fetch and update identity/indexes
        const updatedUsers = app.findCollectionByNameOrId("users");

        if (!updatedUsers.passwordAuth.identityFields.includes("username")) {
            updatedUsers.passwordAuth.identityFields.push("username");
        }

        const indexName = `idx_username_${updatedUsers.id}`;
        const indexSql = `CREATE UNIQUE INDEX \`${indexName}\` ON \`users\` (\`username\`)`;

        let hasIndex = false;
        if (updatedUsers.indexes) {
            hasIndex = updatedUsers.indexes.some(idx => idx.includes("username"));
        } else {
            updatedUsers.indexes = [];
        }

        if (!hasIndex) {
            updatedUsers.indexes.push(indexSql);
        }

        // SAVE 2: Commit identity and index changes
        app.save(updatedUsers);

    } catch (e) {
        console.log("Error updating users collection:", e.message);
    }
}, (app) => {
    // Rollback
});
