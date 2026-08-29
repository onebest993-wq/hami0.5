import React from 'react';
import { Pencil } from '@/app/components/ui/icons/Pencil';
import { XCircle } from '@/app/components/ui/icons/XCircle';
import type { ExecutionFile } from '@/app/types/execution';
import { useExecutionDashboardStore } from '@/app/stores/executionDashboardStore';
import { LazyDashboardHeaderSection } from '../executionDashboardLazyRegistryShell';
import { toastAfterExecutionPersist } from '../helpers/toastAfterExecutionPersist';
import { EXEC_HEADER_LAZY_FALLBACK } from '../executionDashboardLazyShellUi';
import { PreloadableOverlayGate } from '../preloadableOverlayGate';
import { pickExecutionPhoneBodyPrimaryHeaderScope } from './executionPhoneBodyPrimaryHeaderScope';
import type { DossierHeaderResolved } from '@/app/utils/executionDossierHeaderFields';

function asVoidFn(value: unknown): () => void {
    return typeof value === 'function' ? (value as () => void) : () => undefined;
}

function asBool(value: unknown): boolean {
    return Boolean(value);
}

function asStr(value: unknown): string {
    return value == null ? '' : String(value);
}

export function PhoneBodyPrimaryHeaderSection(p: {
    s: Record<string, unknown>;
    safeOpenEditDossierMeta: () => void;
    safeOpenParentDossierMetaEdit: () => void;
}) {
    const s = pickExecutionPhoneBodyPrimaryHeaderScope(p.s);
    const {
        statuteStatus,
        isAlimonyClaim,
        executionPaused,
        handleResumeExecution,
        stayOfExecutionActive,
        viewExecutionData,
        handleLiftStayOfExecution,
        isHeaderExpanded,
        toggleHeaderExpanded,
        headerFields,
        isEvictionExecutionModule,
        classificationDisplay,
        showJudgmentMeta,
        docNumber,
        judgmentDateDisplay,
        claimTypeArabicDisplay,
        evictionPropertyNumber,
        evictionPropertyDistrict,
        evictionPropertyTypeField,
        evictionFullAddressField,
        isInabaActive,
        inabaTargets,
        executionData,
        isUnifiedTabActive,
        persistExecutionMerge,
        showToast,
        setLinkedDossierToView,
        setShowLinkedDossierTimeline,
        setShowTransferFileNumberChangeModal,
        activeSubFileId,
        setExecutionStorageTick,
        parentExecutionFile,
        parentHeaderFields,
        parentClassificationDisplay,
        parentClaimTypeArabicDisplay,
        parentShowJudgmentMeta,
        parentJudgmentDateDisplay,
        parentIsEvictionForExpandedHeader,
    } = s;

    const file = (executionData ?? viewExecutionData) as ExecutionFile & {
        delegationPurpose?: string;
    };
    const persistMerge = persistExecutionMerge as (patch: Record<string, unknown>) => unknown;
    const toast = showToast as (message: string, type: 'success' | 'error' | 'warning' | 'info') => void;
    const parentFields = parentHeaderFields as DossierHeaderResolved;
    const parentFile = parentExecutionFile as ExecutionFile | null | undefined;
    const inabaList = Array.isArray(inabaTargets) ? inabaTargets : [];

    return (
        <PreloadableOverlayGate
            lazy={LazyDashboardHeaderSection}
            fallback={EXEC_HEADER_LAZY_FALLBACK}
            lazyProps={{
                statuteStatus: (statuteStatus ?? null) as {
                    daysRemaining: number;
                    yearsRemaining: number;
                    isCritical: boolean;
                    isExpired: boolean;
                } | null,
                isAlimonyClaim: asBool(isAlimonyClaim),
                executionPaused: asBool(executionPaused),
                handleResumeExecution: asVoidFn(handleResumeExecution),
                stayOfExecutionActive: asBool(stayOfExecutionActive),
                executionData: file,
                handleLiftStayOfExecution: asVoidFn(handleLiftStayOfExecution),
                XCircle,
                isHeaderExpanded: asBool(isHeaderExpanded),
                toggleHeaderExpanded: asVoidFn(toggleHeaderExpanded),
                headerFields: headerFields as DossierHeaderResolved,
                openEditDossierMeta: p.safeOpenEditDossierMeta,
                Pencil,
                isEvictionExecutionModule: asBool(isEvictionExecutionModule),
                classificationDisplay: asStr(classificationDisplay),
                showJudgmentMeta: asBool(showJudgmentMeta),
                docNumber: docNumber == null ? undefined : asStr(docNumber),
                judgmentDateDisplay: asStr(judgmentDateDisplay),
                claimTypeArabicDisplay: asStr(claimTypeArabicDisplay),
                evictionPropertyNumber: asStr(evictionPropertyNumber),
                evictionPropertyDistrict: asStr(evictionPropertyDistrict),
                evictionPropertyTypeField: asStr(evictionPropertyTypeField),
                evictionFullAddressField: asStr(evictionFullAddressField),
                isSubFile: asBool(isInabaActive),
                hasActiveInaba: !asBool(isInabaActive) && inabaList.length > 0,
                delegationPurpose: file?.delegationPurpose,
                linkToken: asBool(isInabaActive) ? undefined : file?.linkToken,
                onCopyLinkToken: () => {
                    const token = file?.linkToken;
                    if (token) {
                        navigator.clipboard.writeText(token).catch(() => {});
                        toast('تم نسخ رمز المشاركة', 'success');
                    }
                },
                linkedDossiers: asBool(isInabaActive) ? undefined : file?.linkedDossiers,
                onRemoveLinkedDossier: (linkedId: string) => {
                    const store = useExecutionDashboardStore.getState();
                    const existing = Array.isArray(file?.linkedDossiers) ? file.linkedDossiers : [];
                    const next = existing.filter((d) => String(d?.linkedId || '') !== String(linkedId));
                    const curId = String(file?.id || '').trim();
                    const hasChildren = curId ? store.getChildDossiers(curId).length > 0 : false;
                    const patch: Record<string, unknown> = { linkedDossiers: next };
                    if (next.length === 0 && !hasChildren) {
                        patch.linkToken = undefined;
                    }
                    if (asBool(isUnifiedTabActive)) {
                        toastAfterExecutionPersist(
                            persistMerge(patch),
                            toast,
                            'تم إلغاء الربط بنجاح',
                        );
                    } else {
                        store.updateCurrentFile(patch);
                        toast('تم إلغاء الربط بنجاح', 'success');
                    }
                },
                onOpenLinkedDossier: (dossier: { type?: string }) => {
                    if (dossier.type === 'colleague') {
                        (setLinkedDossierToView as (next: unknown) => void)(dossier);
                        (setShowLinkedDossierTimeline as (open: boolean) => void)(true);
                    }
                },
                onRequestTransferFileNumberChange: () => {
                    (setShowTransferFileNumberChangeModal as (open: boolean) => void)(true);
                },
                onSaveSubFileNumber: (fileNumber: string, fileYear: string) => {
                    if (!asBool(isInabaActive) || !activeSubFileId) return;
                    const num = String(fileNumber || '').trim();
                    const year = String(fileYear || '').trim();
                    const st = useExecutionDashboardStore.getState();
                    const cur = st.currentFile
                        ? ({ ...st.currentFile, fileNumber: num, fileYear: year } as ExecutionFile)
                        : null;
                    useExecutionDashboardStore.setState({
                        currentFile: cur,
                        subFiles: st.subFiles.map((f) =>
                            f.id === activeSubFileId ? { ...f, fileNumber: num, fileYear: year } : f,
                        ),
                    });
                    toastAfterExecutionPersist(
                        persistMerge({ fileNumber: num, fileYear: year }),
                        toast,
                        'تم حفظ رقم الإضبارة الفرعية',
                    );
                    (setExecutionStorageTick as (updater: (t: number) => number) => void)((t) => t + 1);
                },
                expandedDossierFromParent:
                    asBool(isInabaActive) && parentFile
                        ? {
                              headerFields: parentFields,
                              classificationDisplay: asStr(parentClassificationDisplay),
                              claimTypeArabicDisplay: asStr(parentClaimTypeArabicDisplay),
                              showJudgmentMeta: asBool(parentShowJudgmentMeta),
                              judgmentDateDisplay: asStr(parentJudgmentDateDisplay),
                              docNumber: parentFields.docNumber,
                              evictionPropertyNumber: String(parentFile.property_number ?? ''),
                              evictionPropertyDistrict: String(parentFile.district ?? ''),
                              evictionPropertyTypeField: String(parentFile.property_type ?? ''),
                              evictionFullAddressField: String(parentFile.full_address ?? ''),
                              isEvictionExecutionModule: asBool(parentIsEvictionForExpandedHeader),
                              openEditDossierMeta: p.safeOpenParentDossierMetaEdit,
                          }
                        : undefined,
            }}
        />
    );
}
