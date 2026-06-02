/**
 * Dashboard_Active_Order_File — ملف الأمر الولائي النشط
 *
 * طبقات:
 * - ActiveOrderFileRoot: تنسيق hooks
 * - hooks/state: useOrderFileLifecycleState
 * - hooks/hydrate: IDB + restoreLifecycleNavigation
 * - hooks/pathway: نوع الإجراء ومسار الخطوات
 * - hooks/lifecycleDerived: حسابات قانونية/زمنية
 * - hooks/lifecycleActions: حفظ وانتقالات المراحل
 * - layout: ActiveOrderFileView + buildLifecyclePanelProps
 * - panels: قرار القاضي | التظلم | التمييز
 */
export { Dashboard_Active_Order_File } from './ActiveOrderFileRoot';
export type { ActiveOrderFileProps } from './types';
export type { LifecyclePanelProps } from './layout/LifecyclePanelProps';
export type { PersistedCaseRecord } from './hooks/hydrate/caseRecordTypes';
