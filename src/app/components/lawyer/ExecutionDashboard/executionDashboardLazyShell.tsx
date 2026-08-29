/**
 * Lazy chunk boundary barrel for ExecutionDashboard.
 *
 * Kept as `export *` re-exports (not converted to named lists): renaming/adding
 * Lazy* / prefetch / UI helpers across registry + shellUi + followup/phone/shell
 * lazy modules would churn every consumer and risk breaking dynamic
 * `import(.../executionDashboardLazyShell)` warm paths. Prefer deep imports at
 * call sites that only need one/few symbols (registry / shellUi / …Lazy).
 */
export * from './executionDashboardLazyRegistry';
export * from './executionDashboardLazyShellUi';
export * from './executionFollowupTabPrefetch';
export * from './executionFollowupModalLazy';
export * from './executionDashboardPhoneBodyLazy';
export * from './executionDashboardShellOverlaysLazy';
