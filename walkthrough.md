# Walkthrough - Fix Tags API and Rendering Issues

I have resolved the issues preventing tags from being created and rendered correctly.

## Changes

### Database Migrations

#### [MODIFY] [1737623740_create_tags_collection.js](file:///Users/ctpthooft/Documents/Antony/[0] Werk/Omni.Thooft/pb_migrations/1737623740_create_tags_collection.js)
Corrected the original migration to remove redundant system fields (`id`, `created`, `updated`) from the fields array. This allows PocketBase to auto-generate the `id` during record creation, fixing the `400 Bad Request` error.

#### [MODIFY] [ImportTool.tsx](file:///Users/ctpthooft/Documents/Antony/[0] Werk/Omni.Thooft/Core/src/components/ImportTool.tsx)
- Corrected the field name from `name` to `naam` when creating or looking up presses in the `persen` collection.
- Standardized the "Start Import" button by replacing the raw `<button>` with the standard UI `Button` component and refined the container layout to fix alignment and padding issues in the preview step.

#### [MODIFY] [AuthContext.tsx](file:///Users/ctpthooft/Documents/Antony/[0] Werk/Omni.Thooft/Core/src/components/AuthContext.tsx)
- Updated the `addTask` function to use the correct `naam` field when dynamically creating a new press during import.
- Modified the `isFirstRun` export to prioritize the database check, ensuring onboarding triggers on fresh installs even if previously dismissed in the browser.
- Normalized `tagIds` to use IDs consistently across the application.
- Defined `EXTERNAL_TAG_NAME = 'Extern'` for unified external task tracking.
- Implemented **System Tag** protection: crucial tags like "Extern" are now automatically created and protected from being renamed or deleted by users.

#### [NEW] [1737623742_add_is_system_to_tags.js](file:///Users/ctpthooft/Documents/Antony/[0] Werk/Omni.Thooft/pb_migrations/1737623742_add_is_system_to_tags.js)
Added the `is_system` field to the tags collection to support tag protection.

#### [MODIFY] [App.tsx](file:///Users/ctpthooft/Documents/Antony/[0] Werk/Omni.Thooft/Core/src/App.tsx)
Prioritized the onboarding wizard in the conditional rendering logic. The wizard will now show immediately if the database is empty, even if the browser has a stale user session.

### UI Components

#### [MODIFY] [MaintenanceTable.tsx](file:///Users/ctpthooft/Documents/Antony/[0] Werk/Omni.Thooft/Core/src/components/MaintenanceTable.tsx)
- Fixed the tag rendering logic to lookup tags by ID from the context.
- Removed redundant hardcoded "EXTERNE TAAK" badges, as they are now handled by the "Extern" tag.

#### [MODIFY] [ExternalSummary.tsx](file:///Users/ctpthooft/Documents/Antony/[0] Werk/Omni.Thooft/Core/src/components/ExternalSummary.tsx)
Updated filtering logic to identify "External" tasks by the presence of the "Extern" tag ID, ensuring consistency with the manual toggle.

#### [MODIFY] [AddMaintenanceDialog.tsx](file:///Users/ctpthooft/Documents/Antony/[0] Werk/Omni.Thooft/Core/src/components/AddMaintenanceDialog.tsx)
- Removed the redundant "Externe Taak" toggle from the UI.
- Cleaned up synchronization logic, making the "Extern" tag the single source of truth for external status.

#### [MODIFY] [TagManagement.tsx](file:///Users/ctpthooft/Documents/Antony/[0] Werk/Omni.Thooft/Core/src/components/TagManagement.tsx)
Added visual protection for system tags (lock icon) and disabled rename/delete actions for them to prevent accidental setup issues.

#### [MODIFY] [ImportTool.tsx](file:///Users/ctpthooft/Documents/Antony/[0] Werk/Omni.Thooft/Core/src/components/ImportTool.tsx)
- Added support for a "Tags" column in CSV imports.
- Supports comma-separated tag names (e.g., "Filter, Extern, Prioriteit").
- Automatically creates missing tags in the database during import.
- Automatically marks tasks as "External" if the "Extern" tag is present in the import data.
- **Fixed UI**: Standardized "Step 3" buttons with improved alignment, responsive behavior, and consistent widths.
- **Improved Stability**: Added `Array.isArray` guards to error and tag mapping in `ImportTool.tsx`, `AuthContext.tsx`, and `MaintenanceTable.tsx` to prevent runtime crashes during data processing.
- **Fixed Migration**: Corrected the syntax in `1737623742_add_is_system_to_tags.js` to correctly add the `is_system` field using the `BoolField` constructor required by newer PocketBase versions.

#### [MODIFY] [AuthContext.tsx](file:///Users/ctpthooft/Documents/Antony/[0] Werk/Omni.Thooft/Core/src/components/AuthContext.tsx)
Added several safety checks (`Array.isArray`) and default fallbacks for `tagIds` to ensure smooth operation even with inconsistent data.

## Verification Results

### API Verification
Verified that tags can be created successfully without providing an `id`:
```javascript
Success: {
  active: true,
  collectionId: 'tags00000000001',
  collectionName: 'tags',
  id: 'by4x0acdvqqgdgq',
  naam: 'Test Tag'
}
```

### UI Verification
Tags now render correctly in the task list. Each tag displays as a badge with its associated color from the database.

> [!NOTE]
> I reset the local `pb_data` directory to apply the corrected migration cleanly.
