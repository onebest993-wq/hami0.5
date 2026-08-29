/**
 * ExecutionFile domain slice: ExecutionFileLegacyDisplay.
 */
import type { GhuramaDistributionLog } from './financial';

export interface ExecutionFileLegacyDisplay {
    // ─── لوحة التنفيذ — حقول عرض/حالة (توافق نماذج قديمة وربط 1:1) ───
    creditorAttended?: boolean;
    /** إيقاف مؤقت للعرض — منفصل عن isPaused عند الحاجة */
    executionPaused?: boolean;
    debtorForcedToAttend?: boolean;
    executionFeeInjected?: boolean;
    executionNumber?: string;
    executionYear?: string;
    executionType?: string;
    classification?: string;
    lawyerFeesAmount?: number;
    clientFeesAmount?: number;
    monthlyAlimony?: number;
    accumulatedAlimony?: number;
    initiator?: string;
    representedParty?: string;
    daysSinceNotice?: number;
    isAlimonyCase?: boolean;
    lastPaymentDate?: string | null;
    shariaDeedNumber?: string;
    shariaRegisterNumber?: string;
    shariaIssueDate?: string;
    shariaIssuingCourt?: string;
    chequeBankName?: string;
    chequeIssueDate?: string;
    chequeNumber?: string;
    garnishmentAmount?: number;
    employeeSalary?: number;
    perDebtorSalaries?: Record<string, string>;
    perDebtorGarnishments?: Record<string, string>;
    pastWifeAlimony?: number;
    pastChildrenAlimony?: number;
    monthlyWifeAlimony?: number;
    monthlyChildrenAlimony?: number;
    childrenCount?: number;

    /** أنواع مطالبة متعددة محفوظة على الإضبارة — تُكمّل claimType المفرد */
    claimTypes?: string[];

    ghuramaDistributionLogs?: GhuramaDistributionLog[];
}
