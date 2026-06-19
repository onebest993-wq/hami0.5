import { lazy } from 'react';

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
export const LazyLegalActionsMenu = lazy(() =>
  import('./parts/LegalActionsMenu').then((m) => ({ default: m.LegalActionsMenu }))
);
