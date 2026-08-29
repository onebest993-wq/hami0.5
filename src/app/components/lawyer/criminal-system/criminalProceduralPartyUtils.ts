export type OurRepresentation = 'complainant_side' | 'defendant_side';

type ProceduralPartyComplainant = { id: string; fullName?: string };
type ProceduralPartyDefendant = { id: string; fullName?: string };

export function normalizeOurRepresentation(incoming: string, role: string): OurRepresentation {
    const rep = String(incoming ?? '').trim();
    if (rep === 'complainant_side' || rep === 'defendant_side') return rep;
    if (rep === 'defendant') return 'defendant_side';
    if (rep === 'complainant' || rep === 'civil_claimant') return 'complainant_side';
    if (String(role ?? '').trim() === 'وكيل المشكو منه') return 'defendant_side';
    return 'complainant_side';
}

/**
 * 🧭 تَحويل مُعرّف طَرف إلى مُعرّف متهم لأغراض الإجراءات القَضائية.
 *
 * المَنطق:
 *  1) إن كان `partyId` يُطابق مُتهماً مَوجوداً → يُرجَع كما هو.
 *  2) إن لم تَكن الإضبارة شكوى متقابلة → يُرجَع كما هو (حتى لو كان مُعرّف مشتكي).
 *  3) إن كانت شكوى متقابلة + `partyId` مشتكي + يوجد متهم بنفس **الاسم الكامل** المُجرّد
 *     → يُعاد رَبط المُعرّف بِالمتهم المُطابق (سُلوك مَوروث).
 *  4) خلاف ذلك → يُرجَع المُعرّف الأصلي (مشتكٍ) ليَستهلكه المَسار المُوازي للمشتكي المتقابل.
 */
export function resolveProceduralDefendantId(
    complainants: ProceduralPartyComplainant[],
    defendants: ProceduralPartyDefendant[],
    partyId: string,
    isMutualComplaint: boolean,
): string {
    const id = String(partyId ?? '').trim();
    if (!id) return '';
    if (defendants.some((d) => d.id === id)) return id;
    if (!isMutualComplaint) return id;
    const complainant = complainants.find((c) => c.id === id);
    if (!complainant) return id;
    const name = String(complainant.fullName ?? '').trim();
    if (!name) return id;
    const match = defendants.find((d) => String(d.fullName ?? '').trim() === name);
    return match?.id ?? id;
}

export function resolveProceduralDefendantIds(
    complainants: ProceduralPartyComplainant[],
    defendants: ProceduralPartyDefendant[],
    partyIds: string[],
    isMutualComplaint: boolean,
): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const raw of partyIds) {
        const resolved = resolveProceduralDefendantId(complainants, defendants, raw, isMutualComplaint);
        if (!resolved || seen.has(resolved)) continue;
        seen.add(resolved);
        out.push(resolved);
    }
    return out;
}

/** يُورّث تمثيل المحامي من الإضبارة الأم عند شطر الإضبارة. */
export function resolveOurRepresentationFromCaseRecord(
    record:
        | {
              basics?: { ourRepresentation?: string; role?: string };
          }
        | null
        | undefined,
): OurRepresentation {
    if (!record) return 'complainant_side';
    return normalizeOurRepresentation(
        String(record.basics?.ourRepresentation ?? ''),
        String(record.basics?.role ?? ''),
    );
}

/**
 * 🔎 يُصنّف مُعرّف طَرف داخل قرار «حجز الأموال» وما شابه:
 *   - 'defendant' عندما يَنتمي لـ `defendants`.
 *   - 'complainant' عندما يَنتمي لـ `complainants` (بالعادة مُشتكي متقابل).
 *   - 'unknown' عندما لا يَتطابق مع أيٍّ منهما (بَيانات تَالفة أو مَحذوفة).
 */
export function classifyAssetSeizurePartyKind(
    caseRecord: { defendants?: { id: string }[]; complainants?: { id: string }[] } | undefined,
    partyId: string,
): 'defendant' | 'complainant' | 'unknown' {
    const id = String(partyId ?? '').trim();
    if (!id || !caseRecord) return 'unknown';
    const defendants = Array.isArray(caseRecord.defendants) ? caseRecord.defendants : [];
    if (defendants.some((d) => d.id === id)) return 'defendant';
    const complainants = Array.isArray(caseRecord.complainants) ? caseRecord.complainants : [];
    if (complainants.some((c) => c.id === id)) return 'complainant';
    return 'unknown';
}
