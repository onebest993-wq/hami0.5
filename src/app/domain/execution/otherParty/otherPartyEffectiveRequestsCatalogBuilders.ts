import {
    getGoverningEvictionProcedureRowForBranch,
    isExecutorHubRowInactiveForGoverning,
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
import type { CatalogEntry, OtherPartyCatalogInput } from './otherPartyEffectiveRequestsTypes';
import {
    governingPersonalRow,
    governingSeizureRow,
    hintForEntry,
} from './otherPartyEffectiveRequestsResolve';

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
export function buildCreditorPersonalCoerciveCatalog(
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

export function buildSeizureCatalog(input: OtherPartyCatalogInput): CatalogEntry[] {
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

export function buildGuarantorCatalog(
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

export function buildEvictionCatalog(
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

export function buildBreakInventoryCatalog(flags: HiddenFollowupVisibilityInput): CatalogEntry[] {
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

export function buildEncroachmentCatalog(flags: HiddenFollowupVisibilityInput): CatalogEntry[] {
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

export function buildSpecificDeliveryCatalog(flags: HiddenFollowupVisibilityInput): CatalogEntry[] {
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
