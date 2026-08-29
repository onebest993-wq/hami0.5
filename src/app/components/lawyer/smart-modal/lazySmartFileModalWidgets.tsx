/** تحميل مسبق — يُستدعى من smartFileModalLoader عند فتح/قرب الدعوى */
import { prefetchSmartFileMainPanelSecondaryHubs } from './smartFileMainPanelLazyHubs';

export function prefetchSmartFileModalShellWidgets(): void {
  if (typeof window === 'undefined') return;
  void import('./parts/SmartHeader').catch(() => undefined);
  void import('./parts/ToDoList').catch(() => undefined);
  void import('./parts/IncidentalCasesManager').catch(() => undefined);
  void import('./parts/CivilLawReferenceHub').catch(() => undefined);
  void import('./parts/LegalActionsMenu').catch(() => undefined);
  /* Wave 2 — hubs عبر preloadable identity مشتركة مع SmartFileMainPanel */
  prefetchSmartFileMainPanelSecondaryHubs();
}
