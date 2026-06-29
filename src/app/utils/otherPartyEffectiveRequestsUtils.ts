import type { ExecutionFile } from '@/app/types/execution';
import {
    getGoverningEvictionProcedureRowForBranch,
    getGoverningPersonalCoerciveSubtypeRowFromDecisions,
    isExecutorHubRowInactiveForGoverning,
    isExecutorRowEffectivelyApproved,
    isExecutorRowRejectedAndFinal,
    readSeizureRequestTarget,
    type PersonalCoerciveSubtype,
    type SeizureRequestSubtype,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    isEncroachmentRemovalClaim,
    isEvictionClaim,
    isSpecificDeliveryClaim,
} from '@/app/utils/executionModuleStrategies';
import {
    resolveSeizureMatrixFromExecution,
    type SeizureMatrixButtonKey,
} from '@/app/utils/seizureMatrix';
import {
    isCreditorGuarantorRequestOptionVisible,
    isEmployeeCoerciveDetentionRestricted,
    isPersonalCoerciveDetentionPathAllowedForDebtor,
    listHiddenGuarantorCatalog,
    listHiddenPersonalCoerciveCatalog,
    resolveHiddenBreakInventoryRequest,
    shouldShowHiddenBreakInventoryRequest,
    type HiddenFollowupVisibilityInput,
    type HiddenGuarantorContext,
    type HiddenPersonalCoerciveRequestKey,
} from '@/app/components/lawyer/ExecutionDashboard/components/hiddenFollowupRequestsUtils';
import { hasActiveFinancialGuarantorFollowup } from '@/app/utils/execution/guarantorFollowup';
import {
    isCreditorOtherPartyOptionAccessible,
    type CreditorMirrorWorkflowContext,
} from '@/app/utils/creditorOtherPartyMirrorVisibility';

export type OtherPartyRequestOutcome = 'none' | 'available' | 'effective' | 'pending' | 'rejected' | 'alternative';

export interface OtherPartyRequestBadge {
    id: string;
    label: string;
    shortLabel: string;
    hintAr: string;
    outcome: OtherPartyRequestOutcome;
    statusShort: string;
    decisionId: string | null;
    hasRequest: boolean;
}

export interface OtherPartyCatalogInput {
    claimType: string;
    flags: HiddenFollowupVisibilityInput;
    guarantorCtx: HiddenGuarantorContext;
    activeDebtorKey?: string;
    primaryDebtorKey?: string;
    remainingBalanceIqd?: number;
    executionData?: ExecutionFile | null;
    activeDebtorIsDeceased?: boolean;
    /** وكيل المدين — إظهار ما يظهر لوكيل الدائن فقط (بدون خيارات فارغة) */
    mirrorWorkflow?: CreditorMirrorWorkflowContext;
    /** وكيل المدين — لا قراءة تلقائية من قرارات المنفذ؛ تتبع يدوي فقط */
    debtorAgentManualTrack?: boolean;
}

interface CatalogEntry {
    id: string;
    label: string;
    shortLabel: string;
    hintAr: string;
    resolve: (decisions: Record<string, unknown>[]) => Record<string, unknown> | null;
}

const REQUEST_HINTS: Record<string, string> = {
    'pc-forced_bring_in': 'طلب إحضار المدين بالقوة — يظهر لوكيل الدائن بعد انتهاء مهلة الإخبار دون حضور.',
    'pc-travel_ban': 'طلب منع سفر المدين — ضمن التنفيذ الجبري الشخصي.',
    'pc-arrest_warrant_investigation': 'مفاتحة محكمة التحقيق — بعد تسجيل «متخفي» في الإحضار الجبري.',
    'pc-executive_dossier_presentation': 'عرض الإضبارة على قاضي البداءة — مسار الحبس التنفيذي.',
    'pc-executive_detention_judge': 'قرار قاضي البداءة بالحبس — بعد موافقة عرض الإضبارة.',
    'sz-debtor-salary': 'حجز راتب أو مستحقات — للمدين الموظف عند وجود مبلغ قائم.',
    'sz-debtor-property': 'حجز عقار بإجراءات المزاد أو التقدير.',
    'sz-debtor-movable': 'حجز منقولات المدين.',
    'sz-debtor-third_party': 'حجز مبالغ أو أصول لدى الغير.',
    'gu-request': 'طلب توجيه الكفيل أو ضمان التنفيذ.',
    'break-inventory': 'طلب كسر الأقفال للوصول إلى العين محل التنفيذ.',
};

function hintForEntry(id: string, label: string): string {
    return REQUEST_HINTS[id] || `خيار «${label}» — كما يظهر حالياً لوكيل الدائن في محضر المتابعة.`;
}

function resolveExecutorOutcomeShort(row: Record<string, unknown> | null): {
    outcome: OtherPartyRequestOutcome;
    statusShort: string;
    hasRequest: boolean;
} {
    if (!row) {
        return { outcome: 'none', statusShort: '—', hasRequest: false };
    }
    if (isExecutorRowRejectedAndFinal(row)) {
        return { outcome: 'rejected', statusShort: 'مرفوض', hasRequest: true };
    }
    const raw = String((row as { executorOutcome?: string }).executorOutcome ?? 'pending').trim();
    if (raw === 'alternative') {
        return { outcome: 'alternative', statusShort: 'بديل', hasRequest: true };
    }
    if (raw === 'pending' || raw === '') {
        return { outcome: 'pending', statusShort: 'قيد البت', hasRequest: true };
    }
    if (isExecutorRowEffectivelyApproved(row)) {
        return { outcome: 'effective', statusShort: 'نافذ', hasRequest: true };
    }
    if (raw === 'approved') {
        return { outcome: 'effective', statusShort: 'موافق', hasRequest: true };
    }
    return { outcome: 'pending', statusShort: 'قيد البت', hasRequest: true };
}

function governingPersonalRow(
    decisions: Record<string, unknown>[],
    subtype: PersonalCoerciveSubtype,
    opts?: { activeDebtorKey?: string; primaryDebtorKey?: string }
): Record<string, unknown> | null {
    const row = getGoverningPersonalCoerciveSubtypeRowFromDecisions(decisions, subtype, opts);
    if (!row || isExecutorHubRowInactiveForGoverning(row, decisions)) return null;
    return row;
}

function seizureSubtypeMatches(st: string, subtype: SeizureRequestSubtype): boolean {
    if (subtype === 'movable') {
        return st === 'movable' || st === 'movable_auction';
    }
    return st === subtype;
}

function governingSeizureRow(
    decisions: Record<string, unknown>[],
    subtype: SeizureRequestSubtype,
    target: 'debtor' | 'guarantor' = 'debtor'
): Record<string, unknown> | null {
    const rows = decisions.filter((r) => {
        if (String(r.requestKind || '') !== 'seizure') return false;
        let st = String((r as { seizureSubtype?: string }).seizureSubtype || '').trim();
        if (!st && subtype === 'property') {
            if (/عقار/i.test(`${String(r.title || '')}\n${String(r.body || '')}`)) st = 'property';
        }
        if (!seizureSubtypeMatches(st, subtype)) return false;
        return readSeizureRequestTarget(r) === target;
    });
    if (rows.length === 0) return null;
    const sorted = [...rows].sort(
        (a, b) =>
            String((b as { date?: string }).date || '').localeCompare(
                String((a as { date?: string }).date || '')
            )
    );
    const row = sorted.find((r) => !isExecutorHubRowInactiveForGoverning(r, decisions)) ?? sorted[0]!;
    return row ?? null;
}

type PersonalDef = {
    key: HiddenPersonalCoerciveRequestKey;
    subtype: PersonalCoerciveSubtype;
    label: string;
    shortLabel: string;
    allowed: (flags: HiddenFollowupVisibilityInput) => boolean;
};

const PERSONAL_DEFS: PersonalDef[] = [
    {
        key: 'forced_bring_in',
        subtype: 'forced_bring_in',
        label: 'إحضار جبري',
        shortLabel: 'إحضار جبري',
        allowed: (f) =>
            isPersonalCoerciveDetentionPathAllowedForDebtor('forced_bring_in', {
                activeDebtorIsEmployee: f.activeDebtorIsEmployee,
                isCustodyRemovalClaim: f.isCustodyRemovalClaim,
            }),
    },
    {
        key: 'travel_ban',
        subtype: 'travel_ban',
        label: 'منع سفر',
        shortLabel: 'منع سفر',
        allowed: (f) =>
            isPersonalCoerciveDetentionPathAllowedForDebtor('travel_ban', {
                activeDebtorIsEmployee: f.activeDebtorIsEmployee,
                isCustodyRemovalClaim: f.isCustodyRemovalClaim,
            }),
    },
    {
        key: 'arrest_warrant_investigation',
        subtype: 'arrest_warrant_investigation',
        label: 'مفاتحة محكمة التحقيق',
        shortLabel: 'مفاتحة التحقيق',
        allowed: (f) =>
            isPersonalCoerciveDetentionPathAllowedForDebtor('arrest_warrant_investigation', {
                activeDebtorIsEmployee: f.activeDebtorIsEmployee,
                isCustodyRemovalClaim: f.isCustodyRemovalClaim,
            }),
    },
    {
        key: 'executive_dossier_presentation',
        subtype: 'executive_dossier_presentation',
        label: 'عرض الإضبارة على قاضي البداءة',
        shortLabel: 'عرض الإضبارة',
        allowed: (f) =>
            !f.hidePersonalJudgePresentation &&
            !isEmployeeCoerciveDetentionRestricted(f) &&
            isPersonalCoerciveDetentionPathAllowedForDebtor('executive_dossier_presentation', {
                activeDebtorIsEmployee: f.activeDebtorIsEmployee,
                isCustodyRemovalClaim: f.isCustodyRemovalClaim,
            }),
    },
    {
        key: 'executive_detention_judge',
        subtype: 'executive_detention_judge',
        label: 'قرار قاضي البداءة (الحبس)',
        shortLabel: 'قرار القاضي',
        allowed: (f) =>
            !f.hidePersonalJudgePresentation &&
            !isEmployeeCoerciveDetentionRestricted(f) &&
            isPersonalCoerciveDetentionPathAllowedForDebtor('executive_detention_judge', {
                activeDebtorIsEmployee: f.activeDebtorIsEmployee,
                isCustodyRemovalClaim: f.isCustodyRemovalClaim,
            }),
    },
];

/** نفس ظهور طلبات التنفيذ الجبري الشخصي لدى وكيل الدائن (تبويب + مخفي) */
function buildCreditorPersonalCoerciveCatalog(
    flags: HiddenFollowupVisibilityInput,
    opts?: { activeDebtorKey?: string; primaryDebtorKey?: string }
): CatalogEntry[] {
    if (flags.suppressHiddenPersonalCoerciveRequests) return [];

    const allowedKeys = new Set<HiddenPersonalCoerciveRequestKey>();

    if (flags.showPersonalCoerciveFollowupTab) {
        for (const def of PERSONAL_DEFS) {
            if (def.allowed(flags)) allowedKeys.add(def.key);
        }
    }

    for (const item of listHiddenPersonalCoerciveCatalog(flags)) {
        allowedKeys.add(item.key);
    }

    return PERSONAL_DEFS.filter((def) => allowedKeys.has(def.key)).map((def) => ({
        id: `pc-${def.key}`,
        label: def.label,
        shortLabel: def.shortLabel,
        hintAr: hintForEntry(`pc-${def.key}`, def.label),
        resolve: (decisions) => governingPersonalRow(decisions, def.subtype, opts),
    }));
}

const SEIZURE_LABELS: Record<
    SeizureMatrixButtonKey,
    { label: string; shortLabel: string; subtype: SeizureRequestSubtype }
> = {
    salary: { label: 'طلب حجز راتب', shortLabel: 'حجز راتب', subtype: 'salary' },
    property: { label: 'طلب حجز عقار', shortLabel: 'حجز عقار', subtype: 'property' },
    movable: { label: 'طلب حجز منقولات', shortLabel: 'حجز منقول', subtype: 'movable' },
    third_party: { label: 'طلب حجز لدى الغير', shortLabel: 'حجز لدى الغير', subtype: 'third_party' },
};

function resolveCreditorSeizureButtonKeys(input: OtherPartyCatalogInput): SeizureMatrixButtonKey[] {
    if (input.flags.hideFollowupSeizureRequestsTab) return [];

    const matrix = resolveSeizureMatrixFromExecution({
        remainingBalanceIqd: Math.max(0, Number(input.remainingBalanceIqd ?? 0)),
        executionData: input.executionData,
        activeDebtorIsEmployee: Boolean(input.flags.activeDebtorIsEmployee),
    });

    if (matrix.hideSeizureTab || !matrix.showTabContentButtons || matrix.allSeizureDisabled) {
        return [];
    }

    const keys = new Set<SeizureMatrixButtonKey>();
    const employeeOrDeceased = Boolean(
        input.flags.activeDebtorIsEmployee || input.activeDebtorIsDeceased
    );

    const maybeAdd = (key: SeizureMatrixButtonKey) => {
        if (key === 'salary' && !employeeOrDeceased) return;
        keys.add(key);
    };

    (Object.keys(matrix.buttons) as SeizureMatrixButtonKey[]).forEach((key) => {
        if (matrix.buttons[key]) maybeAdd(key);
    });

    if (input.flags.hideCoerciveSeizureSalaryAndProperty) {
        keys.delete('salary');
        keys.delete('property');
    }

    return [...keys];
}

function buildSeizureCatalog(input: OtherPartyCatalogInput): CatalogEntry[] {
    return resolveCreditorSeizureButtonKeys(input).map((key) => {
        const meta = SEIZURE_LABELS[key];
        return {
            id: `sz-debtor-${key}`,
            label: meta.label,
            shortLabel: meta.shortLabel,
            hintAr: hintForEntry(`sz-debtor-${key}`, meta.label),
            resolve: (decisions) => governingSeizureRow(decisions, meta.subtype, 'debtor'),
        };
    });
}

function buildGuarantorCatalog(
    flags: HiddenFollowupVisibilityInput,
    ctx: HiddenGuarantorContext
): CatalogEntry[] {
    const entries: CatalogEntry[] = [];
    const seen = new Set<string>();

    const push = (entry: CatalogEntry) => {
        if (seen.has(entry.id)) return;
        seen.add(entry.id);
        entries.push(entry);
    };

    if (isCreditorGuarantorRequestOptionVisible(flags, ctx)) {
        push({
            id: 'gu-request',
            label: 'طلب الكفيل',
            shortLabel: 'طلب الكفيل',
            hintAr: hintForEntry('gu-request', 'طلب الكفيل'),
            resolve: (decisions) => {
                const rows = decisions.filter(
                    (r) => String(r.requestKind || '') === 'guarantor_request'
                );
                const active = rows.find((r) => !isExecutorHubRowInactiveForGoverning(r, decisions));
                return active ?? rows[0] ?? null;
            },
        });
    }

    for (const item of listHiddenGuarantorCatalog(flags, ctx)) {
        if (item.key === 'guarantor_request') continue;
        const subtype: SeizureRequestSubtype =
            item.key === 'guarantor_seizure_salary'
                ? 'salary'
                : item.key === 'guarantor_seizure_property'
                  ? 'property'
                  : 'movable';
        push({
            id: `gu-${item.key}`,
            label: item.label,
            shortLabel: item.shortLabel,
            hintAr: hintForEntry(`gu-${item.key}`, item.label),
            resolve: (decisions) => governingSeizureRow(decisions, subtype, 'guarantor'),
        });
    }

    if (hasActiveFinancialGuarantorFollowup(ctx.executionData) && !flags.hideGuarantorSeizureSubTab) {
        for (const [key, subtype, label, shortLabel] of [
            ['guarantor_seizure_salary', 'salary', 'حجز راتب الكفيل', 'حجز راتب الكفيل'],
            ['guarantor_seizure_property', 'property', 'حجز عقار الكفيل', 'حجز عقار الكفيل'],
            ['guarantor_seizure_movable', 'movable', 'حجز منقول الكفيل', 'حجز منقول الكفيل'],
        ] as const) {
            push({
                id: `gu-${key}`,
                label,
                shortLabel,
                hintAr: hintForEntry(`gu-${key}`, label),
                resolve: (decisions) => governingSeizureRow(decisions, subtype, 'guarantor'),
            });
        }
    }

    return entries;
}

function buildEvictionCatalog(
    claimType: string,
    flags: HiddenFollowupVisibilityInput
): CatalogEntry[] {
    const c = String(claimType || '').trim();
    const isEviction = isEvictionClaim(c);
    const isEncroachment = isEncroachmentRemovalClaim(c);
    const isSpecific = isSpecificDeliveryClaim(c);
    if (!isEviction && !isEncroachment && !isSpecific && !flags.showSpecificDeliveryFieldProcedures) {
        return [];
    }

    const branches: Array<{ branch: string; label: string; shortLabel: string; allowed: boolean }> = [
        {
            branch: 'Field Visit Date',
            label: 'تحديد موعد كشف ميداني',
            shortLabel: 'كشف ميداني',
            allowed: isEviction && !flags.hideEncroachmentEvictionProcedureItems,
        },
        {
            branch: 'Police Assistance Request',
            label: 'طلب مساعدة الشرطة',
            shortLabel: 'مساعدة الشرطة',
            allowed: isEviction && !flags.hideEncroachmentEvictionProcedureItems,
        },
        {
            branch: 'Lock Breaking & Inventory',
            label: 'كسر الأقفال والجرد',
            shortLabel: 'كسر الأقفال',
            allowed:
                !shouldShowHiddenBreakInventoryRequest(flags) &&
                (isEviction || flags.showSpecificDeliveryFieldProcedures) &&
                !flags.hideEncroachmentEvictionProcedureItems,
        },
        {
            branch: 'Judicial Custodian',
            label: 'تنصيب حارس قضائي',
            shortLabel: 'حارس قضائي',
            allowed: isEviction && !flags.hideEvictionCustodianProcedure,
        },
        {
            branch: 'Residential Grace Early End',
            label: 'إنهاء المهلة السكنية',
            shortLabel: 'إنهاء المهلة',
            allowed: isEviction && !flags.hideEncroachmentEvictionProcedureItems,
        },
    ];

    return branches
        .filter((b) => b.allowed)
        .map(({ branch, label, shortLabel }) => ({
            id: `ev-${branch}`,
            label,
            shortLabel,
            hintAr: hintForEntry(`ev-${branch}`, label),
            resolve: (decisions) => {
                const row = getGoverningEvictionProcedureRowForBranch(decisions, branch);
                if (!row || isExecutorHubRowInactiveForGoverning(row, decisions)) return null;
                return row;
            },
        }));
}

function buildBreakInventoryCatalog(flags: HiddenFollowupVisibilityInput): CatalogEntry[] {
    if (!shouldShowHiddenBreakInventoryRequest(flags)) return [];
    return [
        {
            id: 'break-inventory',
            label: 'طلب كسر الأقفال',
            shortLabel: 'كسر الأقفال',
            hintAr: hintForEntry('break-inventory', 'طلب كسر الأقفال'),
            resolve: (decisions) => resolveHiddenBreakInventoryRequest(decisions).row,
        },
    ];
}

function buildEncroachmentCatalog(flags: HiddenFollowupVisibilityInput): CatalogEntry[] {
    if (!flags.showEncroachmentRemovalRequestCards) return [];
    return [
        {
            id: 'enc-survey',
            label: 'انتداب خبير مساح',
            shortLabel: 'خبير مساح',
            hintAr: hintForEntry('enc-survey', 'انتداب خبير مساح'),
            resolve: (decisions) => {
                const row = decisions.find(
                    (r) =>
                        String(r.requestKind || '') === 'special_followup' &&
                        /مساح|خبير/i.test(`${String(r.title || '')}\n${String(r.body || '')}`)
                );
                return row && !isExecutorHubRowInactiveForGoverning(row, decisions) ? row : null;
            },
        },
    ];
}

function buildSpecificDeliveryCatalog(flags: HiddenFollowupVisibilityInput): CatalogEntry[] {
    const entries: CatalogEntry[] = [];
    if (flags.showSpecificDeliverySurveyorCard) {
        entries.push({
            id: 'sd-surveyor',
            label: 'انتداب خبير مساح',
            shortLabel: 'خبير مساح',
            hintAr: hintForEntry('sd-surveyor', 'انتداب خبير مساح'),
            resolve: (decisions) => {
                const row = decisions.find(
                    (r) =>
                        String(r.requestKind || '') === 'special_followup' &&
                        /مساح|خبير/i.test(`${String(r.title || '')}\n${String(r.body || '')}`)
                );
                return row && !isExecutorHubRowInactiveForGoverning(row, decisions) ? row : null;
            },
        });
    }
    if (flags.showSpecificDeliveryConversionCard) {
        entries.push({
            id: 'sd-conversion',
            label: 'تحويل لتعذر التسليم',
            shortLabel: 'تعذر التسليم',
            hintAr: hintForEntry('sd-conversion', 'تحويل لتعذر التسليم'),
            resolve: (decisions) => {
                const row = decisions.find(
                    (r) =>
                        String(r.requestKind || '') === 'special_followup' &&
                        /تعذر|تحويل|هلاك/i.test(`${String(r.title || '')}\n${String(r.body || '')}`)
                );
                return row && !isExecutorHubRowInactiveForGoverning(row, decisions) ? row : null;
            },
        });
    }
    return entries;
}

export function buildOtherPartyRequestCatalog(input: OtherPartyCatalogInput): CatalogEntry[] {
    const opts = {
        activeDebtorKey: input.activeDebtorKey,
        primaryDebtorKey: input.primaryDebtorKey,
    };
    const seen = new Set<string>();
    const merged: CatalogEntry[] = [];

    const pushUnique = (entries: CatalogEntry[]) => {
        for (const entry of entries) {
            if (seen.has(entry.id)) continue;
            seen.add(entry.id);
            merged.push(entry);
        }
    };

    pushUnique(buildCreditorPersonalCoerciveCatalog(input.flags, opts));
    pushUnique(buildSeizureCatalog(input));
    pushUnique(buildGuarantorCatalog(input.flags, input.guarantorCtx));
    pushUnique(buildBreakInventoryCatalog(input.flags));
    pushUnique(buildEvictionCatalog(input.claimType, input.flags));
    pushUnique(buildEncroachmentCatalog(input.flags));
    pushUnique(buildSpecificDeliveryCatalog(input.flags));

    return merged;
}

const EMPLOYEE_EXCLUDED_OPTION_IDS = new Set([
    'pc-arrest_warrant_investigation',
    'pc-executive_dossier_presentation',
    'pc-executive_detention_judge',
]);

/** وكيل المدين — قائمة كاملة كما يراها الدائن + إكمال النواقص (موظف → كفيل، إحضار، …) */
function buildDebtorAgentManualTrackCatalog(input: OtherPartyCatalogInput): CatalogEntry[] {
    const noopResolve = () => null;
    const base = buildOtherPartyRequestCatalog(input);
    const byId = new Map(base.map((e) => [e.id, e]));
    const employee = Boolean(
        input.guarantorCtx.activeDebtorIsEmployee ?? input.flags.activeDebtorIsEmployee
    );
    const deceased = Boolean(
        input.activeDebtorIsDeceased ?? input.guarantorCtx.activeDebtorIsDeceased
    );

    const ensure = (entry: CatalogEntry) => {
        if (!byId.has(entry.id)) byId.set(entry.id, entry);
    };

    if (!deceased && !input.flags.hideAllGuarantorPresence) {
        ensure({
            id: 'gu-request',
            label: 'طلب الكفيل',
            shortLabel: 'طلب الكفيل',
            hintAr: hintForEntry('gu-request', 'طلب الكفيل'),
            resolve: noopResolve,
        });
    }

    if (employee && !input.flags.suppressHiddenPersonalCoerciveRequests) {
        ensure({
            id: 'pc-forced_bring_in',
            label: 'إحضار جبري',
            shortLabel: 'إحضار جبري',
            hintAr: hintForEntry('pc-forced_bring_in', 'إحضار جبري'),
            resolve: noopResolve,
        });
        ensure({
            id: 'pc-travel_ban',
            label: 'منع سفر',
            shortLabel: 'منع سفر',
            hintAr: hintForEntry('pc-travel_ban', 'منع سفر'),
            resolve: noopResolve,
        });
        ensure({
            id: 'sz-debtor-salary',
            label: 'طلب حجز راتب',
            shortLabel: 'حجز راتب',
            hintAr: hintForEntry('sz-debtor-salary', 'طلب حجز راتب'),
            resolve: noopResolve,
        });
    }

    let entries = [...byId.values()];
    if (employee) {
        entries = entries.filter((e) => !EMPLOYEE_EXCLUDED_OPTION_IDS.has(e.id));
    }
    return entries;
}

const OUTCOME_SORT: Record<OtherPartyRequestOutcome, number> = {
    effective: 0,
    pending: 1,
    alternative: 2,
    rejected: 3,
    available: 4,
    none: 5,
};

export function resolveOtherPartyRequestOptionBadges(
    input: OtherPartyCatalogInput & { decisions: Record<string, unknown>[] }
): OtherPartyRequestBadge[] {
    const manualTrack = Boolean(input.debtorAgentManualTrack);
    const catalog = manualTrack
        ? buildDebtorAgentManualTrackCatalog(input)
        : buildOtherPartyRequestCatalog(input);
    const badges: OtherPartyRequestBadge[] = [];
    const mirror = input.mirrorWorkflow;

    for (const entry of catalog) {
        const row = manualTrack ? null : entry.resolve(input.decisions);
        const { outcome, statusShort, hasRequest } = manualTrack
            ? { outcome: 'available' as const, statusShort: 'متاح', hasRequest: false }
            : resolveExecutorOutcomeShort(row);

        if (mirror && !manualTrack) {
            const accessible = isCreditorOtherPartyOptionAccessible({
                entryId: entry.id,
                hasRequest,
                mirrorWorkflow: mirror,
                flags: input.flags,
                guarantorCtx: input.guarantorCtx,
            });
            if (!accessible) continue;
        }

        badges.push({
            id: entry.id,
            label: entry.label,
            shortLabel: entry.shortLabel,
            hintAr: entry.hintAr,
            outcome: hasRequest ? outcome : 'available',
            statusShort: hasRequest ? statusShort : 'متاح',
            decisionId: row ? String((row as { id?: string }).id || '').trim() || null : null,
            hasRequest,
        });
    }

    return badges.sort((a, b) => {
        const o = OUTCOME_SORT[a.outcome] - OUTCOME_SORT[b.outcome];
        if (o !== 0) return o;
        return a.shortLabel.localeCompare(b.shortLabel, 'ar');
    });
}

export type OtherPartyExecutorTabBadge = {
    label: string;
    tone: 'amber' | 'emerald' | 'rose' | 'violet' | 'slate';
};

/** شارة اختصار على تبويب «تحركات الطرف الآخر» — موافقة المنفذ أو غيرها */
export function resolveOtherPartyExecutorTabBadge(
    badges: OtherPartyRequestBadge[]
): OtherPartyExecutorTabBadge | null {
    const submitted = badges.filter((b) => b.hasRequest);
    if (submitted.length === 0) return null;

    if (submitted.some((b) => b.outcome === 'pending')) {
        return { label: 'قيد البت', tone: 'amber' };
    }
    if (submitted.some((b) => b.outcome === 'rejected')) {
        return { label: 'مرفوض', tone: 'rose' };
    }
    if (submitted.some((b) => b.outcome === 'alternative')) {
        return { label: 'بديل', tone: 'violet' };
    }
    if (submitted.every((b) => b.outcome === 'effective')) {
        return { label: 'موافق', tone: 'emerald' };
    }
    return { label: 'مختلط', tone: 'slate' };
}

export function resolveOtherPartyEffectiveRequestBadges(
    input: OtherPartyCatalogInput & {
        decisions: Record<string, unknown>[];
        effectiveOnly?: boolean;
    }
): OtherPartyRequestBadge[] {
    const all = resolveOtherPartyRequestOptionBadges(input);
    if (!input.effectiveOnly) return all.filter((b) => b.hasRequest);
    return all.filter((b) => b.outcome === 'effective');
}

export type { HiddenPersonalCoerciveRequestKey };
