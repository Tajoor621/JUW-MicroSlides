# Browser storage migrations

The existing database is `juw-microslides`. It was already opened with IndexedDB schema version 1; it was not unversioned. Native SQLite is separate and unchanged.

`src/lib/db/migrations.ts` now owns browser schema version **2** and the ordered migration registry. The app identity stays **V6.2.1**. Version 1 has the `state` key/value store; version 2 adds `schema-history` in the upgrade transaction. Existing state, raw recovery saves, review drafts, revision history and unknown keys are not rewritten or deleted. An aborted upgrade rolls back atomically. A newer-tab upgrade closes older cooperative connections; blocked upgrades explain how to retry. Rejected connections are not cached forever.

Future migrations must be additive by default. Do not delete a store, call `deleteDatabase`, drop unknown keys, or reinterpret saved scientific content just to change a schema. Data transformations require explicit format validation and a retained raw recovery copy. Changing a version constant is not a migration plan.

Library JSON export/import already exists. Import validates before adding copies; it does not replace the library. Keep a backup outside the browser because eviction, clearing site data or device loss can still remove browser storage. Formal reviewed status is derived from current claim/surface evidence snapshots, not a trusted imported flag.
