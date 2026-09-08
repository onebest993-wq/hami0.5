/**
 * LitigationDecisionEngine — محرك قرار نقي (Pure Domain)
 * =================================================================
 * مصدر حقيقة لعقد القبول المدني (تعدد مدعى عليهم + اختصام).
 * لا يعتمد على واجهات ولا محركات تشغيلية أخرى.
 *
 * عقد حسم التعارضات:
 * - م/190: hasCrossAppeal خامل فقط
 * - م/172: isJointOrIndivisible حارس إلزامي للاستئخار
 * - م/168: PARTIAL ⇒ canAppeal = true
 */
export type PartyOutcome = 'FULL_WIN' | 'FULL_LOSS' | 'PARTIAL' | 'EXEMPT';

export type PresenceForm = 'HADORI' | 'GHIABI';

export type ObjectionPath = 'NONE' | 'PENDING' | 'DIRECT_APPEAL' | 'SUCCEEDED_QUASH';

export type StagingStatus = 'ACTIVE' | 'FALSE';

export type PartyRole = 'plaintiff' | 'defendant' | 'interpleader';

/** حالة التفرد بعد الحكم — Party-Level Independence */
export type DispositionState =
    | 'EXEMPT'
    | 'RELEASED'
    | 'ELIGIBLE_FOR_APPEAL'
    | 'ELIGIBLE_FOR_OBJECTION_OR_DIRECT_APPEAL';

export type MatrixParty = {
    id: string;
    name?: string;
    role: PartyRole;
    outcome: PartyOutcome;
    form: PresenceForm;
    /** تدخل إرادي م/66 دائماً HADORI؛ إدخال جبري م/69 قد يكون GHAYABI */
    interpleaderKind?: 'voluntary_66' | 'compulsory_69';
    /** هل قيّد طعنه في هذه الإضبارة بعد؟ */
    challengeConsumed?: boolean;
};

export type MatrixInput = {
    parties: MatrixParty[];
    /** تضامن أو عدم قابلية تجزئة — حارس م/172 */
    isJointOrIndivisible: boolean;
    /**
     * اعتراض الغائب الملزَم إن وُجد.
     * partyId يشير للغائب الذي قيّد/أنهى الاعتراض.
     */
    ghayabiObjection?: {
        partyId: string;
        path: ObjectionPath;
    };
    /**
     * م/190 — خامل فقط في هذه المرحلة (لا مسارات تشغيل).
     * Feature Flag للواجهة: مؤجّل.
     */
    hasCrossAppeal?: boolean;
};

export type PartyDecision = {
    id: string;
    role: PartyRole;
    outcome: PartyOutcome;
    dispositionState: DispositionState;
    canAppeal: boolean;
    appealSuspendedByStaging: boolean;
    clockExtinguished: boolean;
    exempt: boolean;
};

export type TopBarAction = {
    kind: 'SPAWN_INDEPENDENT_CHALLENGE';
    label: string;
    challengerId: string;
    challengerName: string;
    /** لا يُعدَّل الملف المفتوح — يُستدعى spawnSmartBranchDossier */
    mutatesOpenDossier: false;
};

export type LineageSpawn = {
    parentId: string;
    originStageId: string;
    appellantId: string;
    appelleeIds: string[];
    /** أسماء المبرَّئين مستبعدة من قائمة الخصوم */
    excludedExemptIds: string[];
};

export type ConsolidationDecision = {
    unifiedRollSessionId: string;
    /** أرقام الأقلام تبقى مستقلة */
    retainedCaseNumbers: string[];
    mergesAdministrativeIdentity: false;
};

export type MatrixDecision = {
    staging: StagingStatus;
    parties: PartyDecision[];
    /** أزرار الشريط العلوي — طاعنون مؤهلون لم يقيّدوا بعد */
    topBarActions: TopBarAction[];
    /** إضبارة منشقة عند انقلاب المراكز (مدعي ضد المعترض الفائز) */
    spawnInvertedDossier: null | {
        appellantId: string;
        appelleeId: string;
        reason: 'ROLE_INVERSION_AFTER_OBJECTION_QUASH';
    };
    /** حقل خامل م/190 — لا يولّد إضبارة */
    hasCrossAppeal: boolean;
};

/** م/168: بوابة المصلحة من أثر الحكم فقط */
export function canAppealFromOutcome(outcome: PartyOutcome): boolean {
    if (outcome === 'FULL_WIN' || outcome === 'EXEMPT') return false;
    if (outcome === 'FULL_LOSS' || outcome === 'PARTIAL') return true;
    return false;
}

/**
 * تحويل نتيجة الموكل إلى كود مسار تشغيلي (بدون واجهة).
 * - FULL_WIN / EXEMPT → انتظار طعن الخصم
 * - FULL_LOSS → طعن ذاتي
 * - PARTIAL → both_paths (بداءة) أو self_appeal (اختصام — التلميح يذكر الطرفين)
 */
export type OperationalAppealAction = 'wait_opponent' | 'self_appeal' | 'both_paths';

export function resolveOperationalAppealAction(
    outcome: PartyOutcome,
    options?: { partialAction?: 'both_paths' | 'self_appeal' },
): OperationalAppealAction {
    if (!canAppealFromOutcome(outcome)) return 'wait_opponent';
    if (outcome === 'PARTIAL') return options?.partialAction ?? 'both_paths';
    return 'self_appeal';
}

/** تفريد الحالة بعد الحكم — لا كتلة مدمجة */
export function resolveDispositionState(
    outcome: PartyOutcome,
    form: PresenceForm,
): DispositionState {
    if (outcome === 'EXEMPT' || outcome === 'FULL_WIN') {
        return outcome === 'EXEMPT' ? 'EXEMPT' : 'RELEASED';
    }
    if (!canAppealFromOutcome(outcome)) return 'RELEASED';
    if (form === 'GHIABI') return 'ELIGIBLE_FOR_OBJECTION_OR_DIRECT_APPEAL';
    return 'ELIGIBLE_FOR_APPEAL';
}

/**
 * مهلة الغائب: من اليوم التالي للتبليغ فقط — يُحظر النطق.
 * الحاضر: من اليوم التالي للنطق.
 */
export function resolveChallengeClockAnchor(params: {
    form: PresenceForm;
    judgmentPronouncementDate: string;
    officialServiceDate?: string | null;
}): { anchorDate: string | null; source: 'PRONOUNCEMENT' | 'SERVICE' | null } {
    if (params.form === 'GHIABI') {
        const service = String(params.officialServiceDate ?? '').trim();
        if (!service) return { anchorDate: null, source: null };
        return { anchorDate: service, source: 'SERVICE' };
    }
    return { anchorDate: params.judgmentPronouncementDate, source: 'PRONOUNCEMENT' };
}

/**
 * م/172 زناد رباعي:
 * LIABLE ∧ GHAYABI ∧ Objection PENDING ∧ isJointOrIndivisible
 */
export function resolveStaging(input: MatrixInput): StagingStatus {
    if (!input.isJointOrIndivisible) return 'FALSE';
    const obj = input.ghayabiObjection;
    if (!obj || obj.path !== 'PENDING') return 'FALSE';
    const p = input.parties.find((row) => row.id === obj.partyId);
    if (!p) return 'FALSE';
    const liable = p.outcome === 'FULL_LOSS' || p.outcome === 'PARTIAL';
    if (!liable) return 'FALSE';
    if (p.form !== 'GHIABI') return 'FALSE';
    return 'ACTIVE';
}

/** شريط علوي: مؤهل لم يستهلك طعنه — لا تكديس داخل بطاقة المرحلة */
export function resolveTopBarChallengeActions(
    parties: MatrixParty[],
    decisions: PartyDecision[],
): TopBarAction[] {
    const byId = new Map(decisions.map((d) => [d.id, d]));
    const eligible = parties.filter((row) => {
        const d = byId.get(row.id);
        if (!d?.canAppeal || d.exempt || d.clockExtinguished) return false;
        if (row.challengeConsumed) return false;
        return true;
    });
    if (eligible.length <= 1) return [];
    return eligible.map((row) => ({
        kind: 'SPAWN_INDEPENDENT_CHALLENGE' as const,
        label: `تسجيل طعن مستقل باسم: ${row.name ?? row.id} — إنشاء إضبارة تابعة`,
        challengerId: row.id,
        challengerName: row.name ?? row.id,
        mutatesOpenDossier: false as const,
    }));
}

/** وراثة النسب + تصفية المبرَّئين */
export function buildLineageSpawn(params: {
    parentId: string;
    originStageId: string;
    challengerId: string;
    parties: MatrixParty[];
}): LineageSpawn {
    const challenger = params.parties.find((row) => row.id === params.challengerId);
    const exemptIds = params.parties
        .filter((row) => row.outcome === 'EXEMPT' || row.outcome === 'FULL_WIN')
        .map((row) => row.id)
        .filter((id) => id !== params.challengerId);

    if (challenger?.role === 'plaintiff') {
        const appellees = params.parties
            .filter((row) => row.role !== 'plaintiff' && !exemptIds.includes(row.id))
            .map((row) => row.id);
        return {
            parentId: params.parentId,
            originStageId: params.originStageId,
            appellantId: params.challengerId,
            appelleeIds: appellees,
            excludedExemptIds: exemptIds,
        };
    }

    const plaintiffs = params.parties.filter((row) => row.role === 'plaintiff').map((row) => row.id);
    return {
        parentId: params.parentId,
        originStageId: params.originStageId,
        appellantId: params.challengerId,
        appelleeIds: plaintiffs,
        excludedExemptIds: exemptIds,
    };
}

/** منع تناقض UI: الموكل لا يكون مستأنِفاً ومستأنَفاً عليه في نفس البطاقة */
export function assertsHomogeneousAppealCard(params: {
    clientPartyId: string;
    appellantIds: string[];
    appelleeIds: string[];
}): { ok: boolean; requiresSpawnedDossier: boolean } {
    const isAppellant = params.appellantIds.includes(params.clientPartyId);
    const isAppellee = params.appelleeIds.includes(params.clientPartyId);
    if (isAppellant && isAppellee) {
        return { ok: false, requiresSpawnedDossier: true };
    }
    return { ok: true, requiresSpawnedDossier: false };
}

/** توحيد قضائي: رول موحد بلا طمس أرقام الأقلام */
export function resolveJudicialConsolidation(params: {
    unifiedRollSessionId: string;
    caseNumbers: string[];
}): ConsolidationDecision {
    return {
        unifiedRollSessionId: params.unifiedRollSessionId,
        retainedCaseNumbers: [...params.caseNumbers],
        mergesAdministrativeIdentity: false,
    };
}

/**
 * م/190 — سطح المتقابل معطّل بقرار منتج (Feature Flag).
 * الحقل `hasCrossAppeal` على المرحلة خامل فقط؛ لا يفتح مسارات.
 */
export function isCrossAppealFeatureEnabled(): boolean {
    return false;
}

/** قراءة العلم الخامل دون تفعيل أهلية متقابل */
export function readDormantHasCrossAppeal(
    stage?: { hasCrossAppeal?: boolean } | null,
): boolean {
    return Boolean(stage?.hasCrossAppeal);
}

/** قرار مصفوفة خالص — مصدر حقيقة القبول */
export function resolveCivilLitigationMatrixDecision(input: MatrixInput): MatrixDecision {
    const staging = resolveStaging(input);
    const obj = input.ghayabiObjection;

    const spawnInvertedDossier =
        obj?.path === 'SUCCEEDED_QUASH'
            ? {
                  appellantId: input.parties.find((row) => row.role === 'plaintiff')?.id ?? 'plaintiff',
                  appelleeId: obj.partyId,
                  reason: 'ROLE_INVERSION_AFTER_OBJECTION_QUASH' as const,
              }
            : null;

    /** بعد إبطال ناجح عن الغائب: يُفك الاستئخار عن طعون الملزَمين الآخرين */
    const stagingReleasedAfterQuash = obj?.path === 'SUCCEEDED_QUASH';

    const parties: PartyDecision[] = input.parties.map((row) => {
        const exempt = row.outcome === 'EXEMPT';
        const canAppeal = canAppealFromOutcome(row.outcome);
        const clockExtinguished = exempt || row.outcome === 'FULL_WIN' || !canAppeal;
        const dispositionState = resolveDispositionState(row.outcome, row.form);

        const appealSuspendedByStaging =
            staging === 'ACTIVE'
            && canAppeal
            && row.id !== obj?.partyId
            && !stagingReleasedAfterQuash;

        return {
            id: row.id,
            role: row.role,
            outcome: row.outcome,
            dispositionState,
            canAppeal,
            appealSuspendedByStaging,
            clockExtinguished,
            exempt,
        };
    });

    return {
        staging: stagingReleasedAfterQuash ? 'FALSE' : staging,
        parties,
        topBarActions: resolveTopBarChallengeActions(input.parties, parties),
        spawnInvertedDossier,
        hasCrossAppeal: Boolean(input.hasCrossAppeal),
    };
}

/** مساعد اختبارات / مستهلكين: جلب قرار طرف بالمعرّف */
export function getPartyDecision(decision: MatrixDecision, id: string): PartyDecision {
    const row = decision.parties.find((p) => p.id === id);
    if (!row) throw new Error(`[litigation:decision_engine:party_missing] missing party ${id}`);
    return row;
}
