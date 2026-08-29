/**
 * Lazy registry — بلا استيراد phone body / shell overlays / followup portal (يكسر circular chunks).
 * PartyEdit / DossierMetaEdit: dynamic import حقيقي (لا static) حتى لا يثقل chunk الفتح البارد.
 */
export * from './executionDashboardLazyRegistryShell';
export * from './executionDashboardLazyRegistryOverlays';
