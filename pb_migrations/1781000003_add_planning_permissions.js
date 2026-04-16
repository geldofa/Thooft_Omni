/// <reference path="../pb_data/types.d.ts" />

migrate((app) => {
    console.log("🚀 Starting migration: Add planning permissions to existing roles");

    const newPermissions = ['planning_view', 'planning_edit', 'planning_settings'];

    // Define which roles get which planning permissions
    const rolePermissionMap = {
        'Admin': ['planning_view', 'planning_edit', 'planning_settings'],
        'Meestergast': ['planning_view', 'planning_edit'],
        'Operator': ['planning_view'],
        'Waarnemer': ['planning_view'],
    };

    const rolePermissionsCollection = app.findCollectionByNameOrId("role_permissions");
    const records = app.findAllRecords("role_permissions");

    records.forEach(record => {
        const roleName = record.get("role");
        const planningPerms = rolePermissionMap[roleName];

        if (!planningPerms) {
            console.log(`   - Skipping unknown role: ${roleName}`);
            return;
        }

        const currentPerms = record.get("permissions") || [];
        const permsToAdd = planningPerms.filter(p => !currentPerms.includes(p));

        if (permsToAdd.length === 0) {
            console.log(`   - ${roleName} already has planning permissions, skipping.`);
            return;
        }

        const updatedPerms = [...currentPerms, ...permsToAdd];
        record.set("permissions", updatedPerms);
        app.save(record);
        console.log(`   + ${roleName}: added ${permsToAdd.join(', ')}`);
    });

    // If any expected roles don't have a record yet, create them
    const existingRoles = records.map(r => r.get("role"));
    for (const [roleName, perms] of Object.entries(rolePermissionMap)) {
        if (!existingRoles.includes(roleName)) {
            console.log(`   + Creating missing role_permissions record for: ${roleName}`);
            try {
                const record = new Record(rolePermissionsCollection);
                record.set("role", roleName);
                record.set("permissions", perms);
                app.save(record);
                console.log(`   ✅ Created ${roleName} with: ${perms.join(', ')}`);
            } catch (e) {
                console.warn(`   ⚠ Could not create ${roleName}:`, e);
            }
        }
    }

    console.log("🏁 Migration complete: planning permissions added to roles");

}, (app) => {
    console.log("↩️ Rolling back: removing planning permissions from roles");

    const planningPerms = ['planning_view', 'planning_edit', 'planning_settings'];

    try {
        const records = app.findAllRecords("role_permissions");
        records.forEach(record => {
            const currentPerms = record.get("permissions") || [];
            const cleaned = currentPerms.filter(p => !planningPerms.includes(p));
            if (cleaned.length !== currentPerms.length) {
                record.set("permissions", cleaned);
                app.save(record);
                console.log(`   - Removed planning perms from ${record.get("role")}`);
            }
        });
        console.log("   ✅ Rollback complete");
    } catch (e) {
        console.warn("   ⚠ Rollback failed:", e);
    }
});
