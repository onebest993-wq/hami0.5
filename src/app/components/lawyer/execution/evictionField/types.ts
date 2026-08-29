import type { TimelineEvent } from '@/app/types/execution';
import type { EvictionPremisesUse, EvictionTimelineActionId } from '@/app/utils/executionModuleStrategies';
import type { MaritalFurnitureItem } from '@/app/types/maritalFurniture';
import type { BreakInventoryFurnitureSavePayload } from '@/app/utils/executorApprovalWorkflow';

export interface EvictionFieldProceduresPanelProps {
    locked: boolean;
    lockHint?: string;
    timelineEvents: TimelineEvent[];
    premisesUse: EvictionPremisesUse;
    decisionsStorageExecutionId: string;
    /** لقطة الإضبارة — توحيد قراءة/تخزين قرارات المنفذ مع معرّف الأب */
    executionData?: Record<string, unknown> | null;
    /** عقار سكني / منزل (استعمال سكني) — زر مهلة التخلية بجانب الخروج الميداني */
    showResidentialEvictionGraceButton?: boolean;
    /** مهلة سكنية محفوظة — يُعرض زر التعديل بدل فتح نموذج الإنشاء */
    residentialGracePeriodSaved?: boolean;
    onResidentialEvictionGraceClick?: (opts?: { edit?: boolean }) => void;
    /** مهلة سكنية سارية (بداية + نهاية ولم تنتهِ بعد) */
    showResidentialGraceEarlyEndRequest?: boolean;
    /** كسر الأقفال — يظهر فقط بلا مهلة سكنية أو بعد إنهائها/الموافقة على إنهاء المهلة */
    showBreakInventoryRequest?: boolean;
    /** الخروج الميداني والقوة الجبرية — نفس شرط المهلة السكنية */
    showEvictionFieldworkRequests?: boolean;
    /** تخلية + مدين متوفى: أدوات إخبار الورثة */
    showDebtorHeirsEvictionTools?: boolean;
    heirsNotificationDateYmd?: string;
    onHeirsNotificationDateYmdChange?: (ymd: string) => void;
    onIssueHeirsExecutionNoticeMemo?: () => void;
    onRecordAction?: (input: {
        actionId: EvictionTimelineActionId;
        title: string;
        description: string;
    }) => void;
    /** موافقة على الجرد دون حفظ القائمة في الملاحظات */
    tryOpenPendingBreakInventoryLedger?: () => boolean;
    /** موافقة على الحارس دون حفظ الاسم والراتب */
    tryOpenPendingCustodianDetails?: () => boolean;
    saveJudicialCustodianDetails?: (input: {
        decisionId: string;
        name: string;
        salary: string;
    }) => void;
    openPoliceAssistanceDetails?: (input: { decisionId: string; requestTitle: string }) => void;
    savePoliceAssistance?: (input: {
        decisionId: string;
        agencyName: string;
        linkToTasks: boolean;
    }) => void;
    saveBreakInventoryLedger?: (input: {
        decisionId: string;
        payload: BreakInventoryFurnitureSavePayload;
    }) => void;
    finalizeBreakInventoryRequest?: (input: { decisionId: string }) => void;
    isMaritalFurnitureClaim?: boolean;
    maritalFurnitureItems?: MaritalFurnitureItem[];
    saveMaritalFurnitureDeliveryInventory?: (input: {
        decisionId: string;
        items: MaritalFurnitureItem[];
    }) => void;
}
