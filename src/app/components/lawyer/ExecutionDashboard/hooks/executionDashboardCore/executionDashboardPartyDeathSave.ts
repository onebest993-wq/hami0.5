/** مسار وفاة الخصوم — منطق الحفظ المستخرج من core */
import type { Debtor, ExecutionFile, TimelineEvent } from '@/app/types/execution';
import type { PartyDeathSavePayload } from '@/app/components/lawyer/execution/PartyDeathReportModal';
import {
    getDebtorHeirSubstitutionRequestStatus,
} from '@/app/utils/executorSeizureDecisionQueue';
import {
    buildDossierAutoFinishPatch,
    isHeirSubstitutionAllowedForClaim,
    shouldAutoFinishDossierOnDeathReport,
} from '@/app/utils/partyDeathClaimPolicy';
import {
    buildScopedPartyDeathPersistPatch,
    getPartyDeathCaseForRole,
} from '@/app/utils/partyDeathCaseScope';

export type { PartyDeathSaveDeps } from './executionDashboardPartyDeathSave.types';
import type { PartyDeathSaveDeps } from './executionDashboardPartyDeathSave.types';
import { mergeHeirDetails, mergeHeirNames } from './partyDeathSaveHeirHelpers';
import { runCreditorPartyDeathSave } from './runCreditorPartyDeathSave';

export function runPartyDeathSave(payload: PartyDeathSavePayload, deps: PartyDeathSaveDeps): boolean {

    const {
        executionDataRef,
        executionData,
        claimType,
        creditors,
        debtors,
        decisionsStorageExecutionId,
        partyDeathModalDecisionId,
        nextTimelineId,
        persistExecutionMerge,
        patchExecutorDecisionRow,
        showToast,
        setTimelineEvents,
    } = deps;

            const base = executionDataRef.current ?? executionData;
            if (
                (payload.action === 'heir_substitution' ||
                    payload.action === 'seek_heir' ||
                    payload.action === 'no_heirs') &&
                !isHeirSubstitutionAllowedForClaim(base as Record<string, unknown>, claimType)
            ) {
                showToast('لا يوجد مسار ورثة لهذا النوع من المطالبة.', 'info');
                return false;
            }
            const partyLabelAr = payload.deceased_party === 'debtor' ? 'المدين' : 'الدائن';

            if (payload.deceased_party === 'creditor') {
                return runCreditorPartyDeathSave(payload, deps, base);
            }

            const creditorsList = [...(base?.creditors || creditors)];
            const debtorsList = [...(base?.debtors || debtors)];
            const nameSnapshot = String(debtorsList[0]?.name || '').trim();

            if (payload.action === 'heir_substitution') {
                const st = getDebtorHeirSubstitutionRequestStatus(decisionsStorageExecutionId);
                if (st !== 'approved' && st !== 'alternative') {
                    showToast('لا يمكن إدراج الورثة قبل موافقة المنفذ على طلب الإحلال.', 'warning');
                    return false;
                }
            }

            const heirNamesResolved =
                payload.action === 'heir_substitution' || payload.action === 'seek_heir'
                    ? payload.heir_names.filter((s) => /\S/.test(String(s)))
                    : [];
            const heirDetailsResolved =
                payload.action === 'heir_substitution' || payload.action === 'seek_heir'
                    ? (payload.heir_details || [])
                          .map((h) => ({
                              name: String(h?.name || '').trim(),
                              phone: String(h?.phone || '').trim(),
                              address: String(h?.address || '').trim(),
                              isClient: Boolean((h as { isClient?: boolean }).isClient),
                          }))
                          .filter((h) => /\S/.test(h.name))
                    : [];
            const existingPrimaryHeirs = debtorsList[0]?.heirs || [];
            const existingCaseHeirs = (
                getPartyDeathCaseForRole(base, 'debtor')?.heir_names || []
            ).filter((s) => /\S/.test(String(s)));
            const mergedHeirNames = mergeHeirNames(
                mergeHeirNames(existingPrimaryHeirs as string[], existingCaseHeirs),
                heirNamesResolved
            );
            const primaryParty = debtorsList[0];
            const existingPrimaryDetails = Array.isArray(primaryParty?.heirs_details)
                ? primaryParty.heirs_details
                : [];
            const debtorDeathCaseRead = getPartyDeathCaseForRole(base, 'debtor');
            const existingCaseDetails = Array.isArray(debtorDeathCaseRead?.heir_details)
                ? (debtorDeathCaseRead.heir_details as Array<{
                      name?: string;
                      phone?: string;
                      address?: string;
                  }>)
                : [];
            const mergedHeirDetails = mergeHeirDetails(
                mergeHeirDetails(existingPrimaryDetails, existingCaseDetails),
                heirDetailsResolved
            );

            const applyHeirsToParty = (
                heirs: string[],
                heirDetails: Array<{ name: string; phone?: string; address?: string; isClient?: boolean }>
            ) => {
                if (debtorsList[0]) {
                    debtorsList[0] = {
                        ...debtorsList[0],
                        type: 'debtor',
                        isDeceased: true,
                        heirs,
                        heirs_details: heirDetails,
                    } as Debtor;
                }
            };

            const deceasedFlags = {
                is_debtor_deceased: true,
                is_creditor_deceased: executionData?.is_creditor_deceased,
                deceased_debtor_legal_name_snapshot:
                    nameSnapshot || executionData?.deceased_debtor_legal_name_snapshot,
                deceased_creditor_legal_name_snapshot: executionData?.deceased_creditor_legal_name_snapshot,
            };

            const now = new Date().toISOString();
            const teId = nextTimelineId();
            const closedReason = 'وفاة المدين دون ورثة — إغلاق الإضبارة';

            let te: TimelineEvent;
            let flow: 'no_heirs' | 'heir_substitution' | 'death_only';
            let storedHeirNames: string[];
            let mergeExtra: Record<string, unknown> = {};

            if (payload.action === 'death_only') {
                applyHeirsToParty([], []);
                flow = 'death_only';
                storedHeirNames = [];
                const autoFinishDebtor = shouldAutoFinishDossierOnDeathReport(
                    base as Record<string, unknown>,
                    claimType,
                    'debtor'
                );
                if (autoFinishDebtor) {
                    mergeExtra = buildDossierAutoFinishPatch('وفاة المدين — إغلاق الإضبارة');
                }
                te = {
                    id: teId,
                    date: now.slice(0, 10),
                    timestamp: now,
                    title: autoFinishDebtor
                        ? 'تسجيل وفاة المدين — إغلاق الإضبارة'
                        : 'تسجيل الإبلاغ عن الوفاة',
                    description: autoFinishDebtor
                        ? `تم تسجيل وفاة ${nameSnapshot || partyLabelAr} وإغلاق الإضبارة آلياً.`
                        : `تم تسجيل الإبلاغ عن وفاة ${nameSnapshot || partyLabelAr} في الإضبارة.`,
                    type: 'procedure',
                    source: 'بطاقة الخصوم',
                };
            } else if (payload.action === 'no_heirs') {
                applyHeirsToParty([], []);
                flow = 'no_heirs';
                storedHeirNames = [];
                te = {
                    id: teId,
                    date: now.slice(0, 10),
                    timestamp: now,
                    title: 'تسجيل وفاة — إغلاق الإضبارة',
                    description: `تم تسجيل وفاة ${nameSnapshot || partyLabelAr} دون ورثة؛ أُغلقت الإضبارة آلياً وفق المسار المختار.`,
                    type: 'procedure',
                    source: 'بطاقة الخصوم',
                };
                mergeExtra = {
                    dossier_lifecycle_status: 'finished' as const,
                    dossier_status_reason: closedReason,
                    dossier_status_date: now.slice(0, 10),
                };
            } else if (payload.action === 'seek_heir') {
                applyHeirsToParty(mergedHeirNames, mergedHeirDetails);
                flow = 'heir_substitution';
                storedHeirNames = mergedHeirNames;
                const heirsLine =
                    mergedHeirNames.length > 0 ? `\nأسماء الورثة: ${mergedHeirNames.join('، ')}` : '';
                te = {
                    id: teId,
                    date: now.slice(0, 10),
                    timestamp: now,
                    title: 'العثور على وريث — إعادة فتح الإضبارة',
                    description: `بعد مسار «بلا ورثة» تم تسجيل وريث لـ${nameSnapshot || partyLabelAr} وإعادة تفعيل الإضبارة.${heirsLine}`,
                    type: 'procedure',
                    source: 'بطاقة الخصوم',
                };
                mergeExtra = {
                    dossier_lifecycle_status: 'active' as const,
                    dossier_status_reason: '',
                    dossier_status_date: '',
                };
            } else {
                applyHeirsToParty(mergedHeirNames, mergedHeirDetails);
                flow = 'heir_substitution';
                storedHeirNames = mergedHeirNames;
                const heirsLine =
                    mergedHeirNames.length > 0 ? `\nأسماء الورثة: ${mergedHeirNames.join('، ')}` : '';
                te = {
                    id: teId,
                    date: now.slice(0, 10),
                    timestamp: now,
                    title: 'تسجيل وفاة وإحلال الورثة',
                    description: `تم تسجيل وفاة ${nameSnapshot || partyLabelAr} وإحلال ورثته محله في الإضبارة.${heirsLine}`,
                    type: 'procedure',
                    source: 'بطاقة الخصوم',
                };
            }

            const mergeBase: Record<string, unknown> = {
                ...buildScopedPartyDeathPersistPatch(base, 'debtor', {
                    deceased_party: 'debtor',
                    heir_names: storedHeirNames,
                    heir_details: flow === 'heir_substitution' ? mergedHeirDetails : [],
                    flow,
                    heir_certificate_file_name: null,
                }),
                creditors: creditorsList,
                debtors: debtorsList,
                ...deceasedFlags,
                ...mergeExtra,
            };

            setTimelineEvents((prev) => {
                const next = [te, ...prev];
                persistExecutionMerge({
                    ...mergeBase,
                    timelineEvents: next,
                });
                return next;
            });

            if (payload.action === 'death_only') {
                showToast(
                    mergeExtra.dossier_lifecycle_status === 'finished'
                        ? 'تم تسجيل وفاة المدين وإغلاق الإضبارة.'
                        : 'تم تسجيل الإبلاغ عن الوفاة.',
                    'success'
                );
            } else if (payload.action === 'no_heirs') {
                showToast('تم تسجيل الوفاة وإغلاق الإضبارة (لا ورثة).', 'success');
            } else if (payload.action === 'seek_heir') {
                showToast('تم تسجيل الوريث وإعادة تفعيل الإضبارة.', 'success');
            } else {
                showToast('تم تسجيل الوفاة وإحلال الورثة.', 'success');
                if (partyDeathModalDecisionId) {
                    patchExecutorDecisionRow(decisionsStorageExecutionId, partyDeathModalDecisionId, {
                        heirSubstitutionCompletedAt: now,
                    });
                }
            }
            return true;

}
