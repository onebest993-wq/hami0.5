/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 📦 Helpers Index - فهرس الدوال المساعدة
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * نقطة الدخول الموحدة لجميع الدوال المساعدة
 * 
 * @version 1.0.0
 * @author Hami Legal System - Modular Architecture
 */

// Export from progressBars
export { executionDebtorRowCleared } from './progressBars';

// Export from dateUtils
export { 
    evictionLocalYmdToday, 
    evictionInclusiveCalendarDays 
} from './dateUtils';

// Export from seizureUtils
export { 
    seizureCoerciveKeyFromAssetType,
    stripSeizureTypeDecorators,
    isSalarySeizureRow,
    isMovablePropertySeizureRow
} from './seizureUtils';

export {
    buildSeizureRegistryDraftPatch,
    upsertSeizedMovableFromDetails,
    upsertSeizedPropertyFromDetails,
} from './seizureRegistryBridge';

// Export from heirUtils
export { 
    makeHeirRowId,
    heirsDetailsIncludeClient,
    heirRowCompletenessScore,
    dedupeHeirDetailRowsByName,
    collectPartyHeirDetailRows,
    heirRowHasAnyText,
    type HeirDetailRow
} from './heirUtils';

// Export from dossierLifecycleUtils
export { 
    dossierLifecycleLabelAr,
    dossierLifecycleTriggerTextClass,
    dossierLifecycleTriggerDotClass
} from './dossierLifecycleUtils';

// Export from domUtils
export { bindHorizontalWheelToScroll } from './domUtils';