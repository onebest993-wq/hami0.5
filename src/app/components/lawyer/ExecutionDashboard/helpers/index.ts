/**
 * نقطة الدخول الموحدة للدوال المساعدة في ExecutionDashboard.
 */

export { executionDebtorRowCleared } from './progressBars';

export {
    evictionLocalYmdToday,
    evictionInclusiveCalendarDays,
} from './dateUtils';

export {
    seizureCoerciveKeyFromAssetType,
    stripSeizureTypeDecorators,
} from './seizureUtils';

export {
    upsertSeizedMovableFromDetails,
    upsertSeizedPropertyFromDetails,
} from './seizureRegistryBridge';

export {
    makeHeirRowId,
    heirsDetailsIncludeClient,
    heirRowHasAnyText,
    type HeirDetailRow,
} from './heirUtils';

export {
    dossierLifecycleLabelAr,
    dossierLifecycleTriggerTextClass,
    dossierLifecycleTriggerDotClass,
} from './dossierLifecycleUtils';

export { bindHorizontalWheelToScroll } from './domUtils';
