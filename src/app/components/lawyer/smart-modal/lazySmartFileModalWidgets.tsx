import { lazy } from 'react';
import { LegalActionsMenu } from './parts/LegalActionsMenu';

export { LegalActionsMenu };
export const LazyLegalActionsMenu = LegalActionsMenu;

export const LazySmartHeader = lazy(() =>
  import('./parts/SmartHeader').then((m) => ({ default: m.SmartHeader }))
);
export const LazyFinancialCard = lazy(() =>
  import('./parts/FinancialCard').then((m) => ({ default: m.FinancialCard }))
);
export const LazyQuickActions = lazy(() =>
  import('./parts/QuickActions').then((m) => ({ default: m.QuickActions }))
);
export const LazyToDoList = lazy(() =>
  import('./parts/ToDoList').then((m) => ({ default: m.ToDoList }))
);
export const LazySessionAndRequestsHub = lazy(() =>
  import('./parts/SessionAndRequestsHub').then((m) => ({ default: m.SessionAndRequestsHub }))
);
export const LazyCivilLawReferenceHub = lazy(() =>
  import('./parts/CivilLawReferenceHub').then((m) => ({ default: m.CivilLawReferenceHub }))
);
export const LazyPersonalStatusLawReferenceHub = lazy(() =>
  import('@/app/components/lawyer/personal-status/PersonalStatusLawReferenceHub').then((m) => ({
    default: m.PersonalStatusLawReferenceHub,
  }))
);
export const LazyIncidentalCasesManager = lazy(() =>
  import('./parts/IncidentalCasesManager').then((m) => ({ default: m.IncidentalCasesManager }))
);
export const LazyTimelineFeed = lazy(() =>
  import('./parts/TimelineFeed').then((m) => ({ default: m.TimelineFeed }))
);

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
