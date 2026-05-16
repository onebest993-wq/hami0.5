import { lazy } from 'react';

export const LazySmartHeader = lazy(() =>
  import('./parts/SmartHeader').then((m) => ({ default: m.SmartHeader }))
);
export const LazyFinancialCard = lazy(() =>
  import('./parts/FinancialCard').then((m) => ({ default: m.FinancialCard }))
);
export const LazyGhostAIInsightDeck = lazy(() =>
  import('./parts/GhostAIInsightDeck').then((m) => ({ default: m.GhostAIInsightDeck }))
);
export const LazyQuickActions = lazy(() =>
  import('./parts/QuickActions').then((m) => ({ default: m.QuickActions }))
);
export const LazyToDoList = lazy(() =>
  import('./parts/ToDoList').then((m) => ({ default: m.ToDoList }))
);
export const LazyFastTrackPetitionsList = lazy(() =>
  import('./parts/FastTrackPetitionsList').then((m) => ({ default: m.FastTrackPetitionsList }))
);
export const LazyAttachmentShieldCard = lazy(() =>
  import('./parts/AttachmentShieldCard').then((m) => ({ default: m.AttachmentShieldCard }))
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
