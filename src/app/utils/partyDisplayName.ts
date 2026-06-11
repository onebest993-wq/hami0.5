import type { ExecutionFile, Party } from '@/app/types/execution';
import { resolvePartyStoredName } from '@/app/utils/executionPartyNormalize';
import { getPartyDeathCaseForRole, isPartyDeathCaseForRole } from '@/app/utils/partyDeathCaseScope';
import {
    getCreditorHeirSubstitutionRequestStatus,
    getDebtorHeirSubstitutionRequestStatus,
} from '@/app/utils/executorSeizureDecisionQueue';

/** صيغة قديمة — عند غياب بيانات المسار الجديد */
export function getDeceasedPartyDisplayText(baseName: string): string {
    const n = baseName.trim();
    if (!n) return 'ورثة المرحوم — إضافة لتركته';
    return `ورثة المرحوم ${n} إضافة لتركته`;
}

function partyHasRegisteredHeirs(party: Party | undefined, file: ExecutionFile | null | undefined, role: 'creditor' | 'debtor'): boolean {
    const partyHeirs = (party?.heirs || []).filter((s) => /\S/.test(String(s)));
    const partyDetails = Array.isArray((party as { heirs_details?: unknown[] } | undefined)?.heirs_details)
        ? ((party as { heirs_details: Array<{ name?: string }> }).heirs_details || []).filter((h) =>
              /\S/.test(String(h?.name || ''))
          )
        : [];
    if (partyHeirs.length > 0 || partyDetails.length > 0) return true;
    const deathCase = getPartyDeathCaseForRole(file, role);
    const caseHeirs = (deathCase?.heir_names || []).filter((s) => /\S/.test(String(s)));
    const caseDetails = (deathCase?.heir_details || []).filter((h) => /\S/.test(String(h?.name || '')));
    return caseHeirs.length > 0 || caseDetails.length > 0;
}

/** بعد وفاة الطرف وتسجيل ورثة — التعديل يقتصر على بيانات الورثة */
export function isPartyHeirsEditOnlyMode(
    file: ExecutionFile | null | undefined,
    role: 'creditor' | 'debtor',
    party: Party | undefined,
    index: number,
    decisionsExecutionId: string
): boolean {
    const deceased =
        index === 0 ? isPrimaryPartyDeceased(role, party, file) : Boolean(party?.isDeceased);
    if (!deceased) return false;

    const subSt =
        role === 'creditor'
            ? getCreditorHeirSubstitutionRequestStatus(decisionsExecutionId)
            : getDebtorHeirSubstitutionRequestStatus(decisionsExecutionId);
    if (subSt === 'approved' || subSt === 'alternative') return true;

    return partyHasRegisteredHeirs(party, file, role);
}

export function isPrimaryPartyDeceased(
    role: 'creditor' | 'debtor',
    party: Party | undefined,
    file: ExecutionFile | null | undefined
): boolean {
    if (party?.isDeceased) return true;
    if (isPartyDeathCaseForRole(file, role)) return true;
    if (role === 'debtor' && file?.is_debtor_deceased === true) return true;
    if (role === 'creditor' && file?.is_creditor_deceased === true) return true;
    return false;
}

export type ExecutionPartyDisplayNameResult = {
    text: string;
    showDeceasedGlyph: boolean;
    heirSubstituteLines?: string[];
    prefix?: string;
    baseName: string;
};

function deceasedSnapshotName(
    role: 'creditor' | 'debtor',
    partyBaseName: string,
    file: ExecutionFile | null | undefined
): string {
    if (role === 'creditor') {
        return (file?.deceased_creditor_legal_name_snapshot || partyBaseName).trim() || partyBaseName;
    }
    return (file?.deceased_debtor_legal_name_snapshot || partyBaseName).trim() || partyBaseName;
}

/**
 * عرض اسم طرف في الإضبارة (بطاقات، ترويسة، إلخ).
 * مسار إحلال الورثة: عنوان رئيسي + سطر أسماء الورثة.
 */
export function getExecutionPartyDisplayName(
    party: Party | undefined,
    role: 'creditor' | 'debtor',
    index: number,
    file: ExecutionFile | null | undefined
): ExecutionPartyDisplayNameResult {
    const fallback = role === 'creditor' ? 'الدائن' : 'المدين';
    const baseName = resolvePartyStoredName(party) || fallback;
    const deceased =
        index === 0
            ? isPrimaryPartyDeceased(role, party, file)
            : Boolean(party?.isDeceased);
    if (!deceased) {
        return { text: baseName, baseName, showDeceasedGlyph: false };
    }

    const death = getPartyDeathCaseForRole(file, role);
    const deathMatchesPrimary = index === 0 && death != null;
    const flow = death?.flow;

    const heirsFromParty = (party?.heirs || []).filter((s) => /\S/.test(String(s)));
    const heirsFromCase = (death?.heir_names || []).filter((s) => /\S/.test(String(s)));
    const primaryHeirsList = heirsFromParty.length > 0 ? heirsFromParty : heirsFromCase;

    if (index > 0) {
        const localHeirs = (party?.heirs || []).filter((s) => /\S/.test(String(s)));
        if (localHeirs.length > 0) {
            const snap = baseName;
            const prefix =
                role === 'creditor'
                    ? localHeirs.length === 1
                        ? 'وريث الدائن'
                        : 'ورثة الدائن'
                    : localHeirs.length === 1
                      ? 'وريث المدين'
                      : 'ورثة المدين';
            return {
                text: `${prefix}: ${snap}`,
                baseName: snap,
                prefix,
                showDeceasedGlyph: true,
                heirSubstituteLines: localHeirs,
            };
        }
        return { text: baseName, baseName, showDeceasedGlyph: true };
    }

    /** أولاً: إن وُجدت أسماء ورثة محفوظة على الطرف نفسه تُعرض دائماً (مستقلة عن party_death_case) */
    if (heirsFromParty.length > 0 && flow !== 'no_heirs') {
        const snap = deceasedSnapshotName(role, baseName, file);
        const prefix =
            role === 'creditor'
                ? heirsFromParty.length === 1
                    ? 'وريث الدائن'
                    : 'ورثة الدائن'
                : heirsFromParty.length === 1
                  ? 'وريث المدين'
                  : 'ورثة المدين';
        return {
            text: `${prefix}: ${snap}`,
            baseName: snap,
            prefix,
            showDeceasedGlyph: true,
            heirSubstituteLines: heirsFromParty,
        };
    }

    /** ثانياً: إن لم تُحفظ أسماء على الطرف، نسمح بعرض أسماء case فقط عندما يطابق الدور */
    if (deathMatchesPrimary && heirsFromCase.length > 0 && flow !== 'no_heirs') {
        const snap = deceasedSnapshotName(role, baseName, file);
        const prefix =
            role === 'creditor'
                ? heirsFromCase.length === 1
                    ? 'وريث الدائن'
                    : 'ورثة الدائن'
                : heirsFromCase.length === 1
                  ? 'وريث المدين'
                  : 'ورثة المدين';
        return {
            text: `${prefix}: ${snap}`,
            baseName: snap,
            prefix,
            showDeceasedGlyph: true,
            heirSubstituteLines: heirsFromCase,
        };
    }

    if (deathMatchesPrimary && (flow === 'no_heirs' || flow === 'death_only')) {
        return { text: baseName, baseName, showDeceasedGlyph: true };
    }

    if (deathMatchesPrimary && flow === undefined && primaryHeirsList.length === 0) {
        return { text: getDeceasedPartyDisplayText(baseName), baseName, showDeceasedGlyph: true };
    }

    return { text: baseName, baseName, showDeceasedGlyph: true };
}
