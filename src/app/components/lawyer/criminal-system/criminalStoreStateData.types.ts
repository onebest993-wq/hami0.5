/** Persisted store data fields — slice of CriminalStoreState */
import type { CriminalCase, CriminalCaseDraft, PendingSeveranceContext } from './criminalCaseModel';

export type CriminalStoreStateData = {
    draft: CriminalCaseDraft;
    casesById: Record<string, CriminalCase>;
    /**
    * محامي الجلسة الحالية — غير مُصرَّح في persist؛ يُستخدم لختم ownerLawyerId عند الإنشاء.
    */
    sessionOwnerLawyerId: string | null;
    /** سياق تفريق الدعوى الجاري — null عند عدم وجود عملية تفريق. */
    pendingSeveranceContext: PendingSeveranceContext | null;
};
