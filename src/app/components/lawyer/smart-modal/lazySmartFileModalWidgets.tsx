/** تحميل مسبق — يُستدعى من smartFileModalLoader عند فتح/قرب الدعوى */
export function prefetchSmartFileModalShellWidgets(): void {
  if (typeof window === 'undefined') return;
  void import('./parts/SmartHeader').catch(() => undefined);
  void import('./parts/QuickActions').catch(() => undefined);
  void import('./parts/ToDoList').catch(() => undefined);
  void import('./parts/SessionAndRequestsHub').catch(() => undefined);
  void import('./parts/TimelineFeed').catch(() => undefined);
  void import('./parts/IncidentalCasesManager').catch(() => undefined);
  void import('./parts/CivilLawReferenceHub').catch(() => undefined);
  void import('./parts/LegalActionsMenu').catch(() => undefined);
}
