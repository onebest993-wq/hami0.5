import { useCallback, useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { fileHasSpecificDeliveryClaim } from '@/app/utils/executionDossierHeaderFields';
import { useExecutionDashboardParentDossierPersistence } from './useExecutionDashboardParentDossierPersistence';
import { validateDossierMetaDraft, formatDossierFileRef, parseDossierFileRef } from '../../helpers/dossierMetaValidation';

type DossierMetaDraft = Record<string, string>;

type ShowToast = (message: string, type?: string) => void;

type UseExecutionDashboardUnifiedDossierMetaWorkflowParams = {
    executionData: ExecutionFile | null | undefined;
    directorate: string;
    fileNumber: string;
    fileYear: string;
    docNumber: string;
    judgmentDate: string;
    classification: string;
    evictionPropertyNumber: string;
    evictionPropertyDistrict: string;
    evictionPropertyTypeField: string;
    evictionFullAddressField: string;
    evictionPremisesUseRaw: string | undefined;
    isEvictionExecutionModule: boolean;
    persistExecutionMerge: (patch: Record<string, unknown>) => void;
    parentDossierId: string | undefined;
    parentExecutionFile: ExecutionFile | null | undefined;
    onUpdate: ((file: ExecutionFile) => void) | undefined;
    setExecutionStorageTick: Dispatch<SetStateAction<number>>;
    showToast: ShowToast;
};

type DossierMetaTarget = 'current' | 'parent';

function resolveInstrumentDocNumber(
    file: ExecutionFile | null | undefined,
    fallback = '',
): string {
    if (!file) return String(fallback ?? '').trim();
    const row = file as ExecutionFile & {
        chequeNumber?: string;
        shariaDeedNumber?: string;
    };
    return String(row.docNumber || row.chequeNumber || row.shariaDeedNumber || fallback || '').trim();
}

function resolveInstrumentJudgmentDate(
    file: ExecutionFile | null | undefined,
    fallback = '',
): string {
    if (!file) return String(fallback ?? '').trim().slice(0, 10);
    const row = file as ExecutionFile & {
        chequeIssueDate?: string;
        shariaIssueDate?: string;
    };
    return String(row.judgmentDate || row.chequeIssueDate || row.shariaIssueDate || fallback || '')
        .trim()
        .slice(0, 10);
}

function buildDossierMetaDraft(
    executionData: ExecutionFile | null | undefined,
    fallback: {
        directorate: string;
        fileNumber: string;
        fileYear: string;
        docNumber: string;
        judgmentDate: string;
        classification: string;
        evictionPropertyNumber: string;
        evictionPropertyDistrict: string;
        evictionPropertyTypeField: string;
        evictionFullAddressField: string;
        evictionPremisesUseRaw: string | undefined;
    },
): DossierMetaDraft {
    return {
        directorate: String(executionData?.directorate ?? fallback.directorate ?? ''),
        fileNumber: String(executionData?.fileNumber ?? fallback.fileNumber ?? ''),
        fileYear: String(executionData?.fileYear ?? fallback.fileYear ?? ''),
        docType: String(executionData?.docType ?? ''),
        claimType: String(executionData?.claimType ?? ''),
        docNumber: resolveInstrumentDocNumber(executionData, fallback.docNumber),
        judgmentDate: resolveInstrumentJudgmentDate(executionData, fallback.judgmentDate),
        classification: String(executionData?.classification ?? fallback.classification ?? ''),
        property_number: String(
            (executionData as { property_number?: string } | null)?.property_number ??
                fallback.evictionPropertyNumber ??
                '',
        ),
        district: String(
            (executionData as { district?: string } | null)?.district ??
                fallback.evictionPropertyDistrict ??
                '',
        ),
        property_type: String(
            (executionData as { property_type?: string } | null)?.property_type ??
                fallback.evictionPropertyTypeField ??
                '',
        ),
        full_address: String(
            (executionData as { full_address?: string } | null)?.full_address ??
                fallback.evictionFullAddressField ??
                '',
        ),
        eviction_premises_use:
            (executionData as { eviction_premises_use?: string } | null)?.eviction_premises_use ===
                'residential' || fallback.evictionPremisesUseRaw === 'residential'
                ? 'residential'
                : (executionData as { eviction_premises_use?: string } | null)
                        ?.eviction_premises_use === 'commercial' ||
                    fallback.evictionPremisesUseRaw === 'commercial'
                  ? 'commercial'
                  : '',
        specificDeliveryItemName: String(
            (executionData as { specificDeliveryItemName?: string } | null | undefined)
                ?.specificDeliveryItemName ?? '',
        ),
        specificDeliveryItemNature: String(
            (executionData as { specificDeliveryItemNature?: string } | null | undefined)
                ?.specificDeliveryItemNature ?? '',
        ),
    };
}

export function useExecutionDashboardUnifiedDossierMetaWorkflow({
    executionData,
    directorate,
    fileNumber,
    fileYear,
    docNumber,
    judgmentDate,
    classification,
    evictionPropertyNumber,
    evictionPropertyDistrict,
    evictionPropertyTypeField,
    evictionFullAddressField,
    evictionPremisesUseRaw,
    isEvictionExecutionModule,
    persistExecutionMerge,
    parentDossierId,
    parentExecutionFile,
    onUpdate,
    setExecutionStorageTick,
    showToast,
}: UseExecutionDashboardUnifiedDossierMetaWorkflowParams) {
    const [showEditDossierMetaModal, setShowEditDossierMetaModal] = useState(false);
    const [dossierMetaDraft, setDossierMetaDraft] = useState<DossierMetaDraft | null>(null);
    const [dossierMetaTarget, setDossierMetaTarget] = useState<DossierMetaTarget>('current');
    const parentDossierPersistence = useExecutionDashboardParentDossierPersistence({
        parentDossierId,
        parentExecutionFile,
        onUpdate,
        setExecutionStorageTick,
        showToast,
    });

    const currentDraftFallback = useMemo(
        () => ({
            directorate,
            fileNumber,
            fileYear,
            docNumber,
            judgmentDate,
            classification,
            evictionPropertyNumber,
            evictionPropertyDistrict,
            evictionPropertyTypeField,
            evictionFullAddressField,
            evictionPremisesUseRaw,
        }),
        [
            classification,
            directorate,
            docNumber,
            evictionFullAddressField,
            evictionPremisesUseRaw,
            evictionPropertyDistrict,
            evictionPropertyNumber,
            evictionPropertyTypeField,
            fileNumber,
            fileYear,
            judgmentDate,
        ],
    );

    const parentDraftFallback = useMemo(
        () => ({
            directorate: String(parentExecutionFile?.directorate ?? ''),
            fileNumber: String(parentExecutionFile?.fileNumber ?? ''),
            fileYear: String(parentExecutionFile?.fileYear ?? ''),
            docNumber: String(parentExecutionFile?.docNumber ?? ''),
            judgmentDate: String(parentExecutionFile?.judgmentDate ?? ''),
            classification: String(parentExecutionFile?.classification ?? ''),
            evictionPropertyNumber: String(
                (parentExecutionFile as { property_number?: string } | null)?.property_number ?? '',
            ),
            evictionPropertyDistrict: String(
                (parentExecutionFile as { district?: string } | null)?.district ?? '',
            ),
            evictionPropertyTypeField: String(
                (parentExecutionFile as { property_type?: string } | null)?.property_type ?? '',
            ),
            evictionFullAddressField: String(
                (parentExecutionFile as { full_address?: string } | null)?.full_address ?? '',
            ),
            evictionPremisesUseRaw:
                (parentExecutionFile as { eviction_premises_use?: string } | null)?.eviction_premises_use,
        }),
        [parentExecutionFile],
    );

    const openEditDossierMeta = useCallback(() => {
        setDossierMetaTarget('current');
        setDossierMetaDraft(buildDossierMetaDraft(executionData, currentDraftFallback));
        setShowEditDossierMetaModal(true);
    }, [
        currentDraftFallback,
        executionData,
        setShowEditDossierMetaModal,
    ]);

    const openParentDossierMetaEdit = useCallback(() => {
        if (!parentExecutionFile) {
            showToast('تعذر فتح بيانات الحاوية الأبوية لأن بياناتها غير متاحة الآن.', 'warning');
            return;
        }
        setDossierMetaTarget('parent');
        setDossierMetaDraft(buildDossierMetaDraft(parentExecutionFile, parentDraftFallback));
        setShowEditDossierMetaModal(true);
    }, [
        parentDraftFallback,
        parentExecutionFile,
        setShowEditDossierMetaModal,
        showToast,
    ]);

    const dossierMetaEditIsEvictionExecutionModule =
        dossierMetaTarget === 'parent'
            ? parentDossierPersistence.parentIsEvictionForExpandedHeader
            : isEvictionExecutionModule;

    const saveDossierMetaDraft = useCallback(() => {
        if (!dossierMetaDraft) {
            return;
        }

        const validation = validateDossierMetaDraft(dossierMetaDraft, {
            isEviction:
                dossierMetaTarget === 'parent'
                    ? parentDossierPersistence.parentIsEvictionForExpandedHeader
                    : isEvictionExecutionModule,
        });
        if (!validation.ok) {
            showToast(validation.message, 'warning');
            return;
        }

        const baseFile = dossierMetaTarget === 'parent' ? parentExecutionFile : executionData;
        const persistMerge =
            dossierMetaTarget === 'parent'
                ? parentDossierPersistence.persistParentDossierMerge
                : persistExecutionMerge;
        const targetIsEviction =
            dossierMetaTarget === 'parent'
                ? parentDossierPersistence.parentIsEvictionForExpandedHeader
                : isEvictionExecutionModule;

        const ep = dossierMetaDraft.eviction_premises_use;
        const parsedFile = parseDossierFileRef(
            formatDossierFileRef(dossierMetaDraft.fileNumber, dossierMetaDraft.fileYear) ||
                dossierMetaDraft.fileNumber,
        );
        const resolvedFileNumber = parsedFile.fileNumber || String(dossierMetaDraft.fileNumber ?? '').trim();
        const resolvedFileYear = parsedFile.fileYear || String(dossierMetaDraft.fileYear ?? '').trim();
        const basePatch = {
            directorate: dossierMetaDraft.directorate as ExecutionFile['directorate'],
            fileNumber: resolvedFileNumber,
            fileYear: resolvedFileYear,
            docType: dossierMetaDraft.docType,
            claimType: dossierMetaDraft.claimType,
            docNumber: dossierMetaDraft.docNumber,
            judgmentDate: dossierMetaDraft.judgmentDate,
            classification: String(
                baseFile?.classification ?? dossierMetaDraft.classification ?? '',
            ),
        };

        const specificDeliveryPatch = fileHasSpecificDeliveryClaim({
            ...(baseFile ?? {}),
            claimType: dossierMetaDraft.claimType,
        } as ExecutionFile)
            ? {
                  specificDeliveryItemName: String(
                      dossierMetaDraft.specificDeliveryItemName || '',
                  ).trim(),
                  ...(dossierMetaDraft.specificDeliveryItemNature === 'movable' ||
                  dossierMetaDraft.specificDeliveryItemNature === 'immovable'
                      ? {
                            specificDeliveryItemNature: dossierMetaDraft
                                .specificDeliveryItemNature as 'movable' | 'immovable',
                        }
                      : {}),
              }
            : {};

        const patch = targetIsEviction
            ? {
                  ...basePatch,
                  property_number: dossierMetaDraft.property_number,
                  district: dossierMetaDraft.district,
                  property_type: dossierMetaDraft.property_type,
                  full_address: dossierMetaDraft.full_address,
                  eviction_premises_use:
                      ep === 'residential' || ep === 'commercial'
                          ? (ep as 'commercial' | 'residential')
                          : undefined,
                  ...specificDeliveryPatch,
              }
            : {
                  ...basePatch,
                  ...specificDeliveryPatch,
              };

        persistMerge(patch);
        showToast('تم حفظ بيانات الإضبارة', 'success');
        setShowEditDossierMetaModal(false);
        setDossierMetaDraft(null);
        setDossierMetaTarget('current');
    }, [
        dossierMetaDraft,
        dossierMetaTarget,
        executionData,
        isEvictionExecutionModule,
        parentDossierPersistence.parentIsEvictionForExpandedHeader,
        parentDossierPersistence.persistParentDossierMerge,
        parentExecutionFile,
        persistExecutionMerge,
        setShowEditDossierMetaModal,
        showToast,
    ]);

    return useMemo(
        () => ({
            showEditDossierMetaModal,
            dossierMetaDraft,
            setShowEditDossierMetaModal,
            setDossierMetaDraft,
            openEditDossierMeta,
            openParentDossierMetaEdit,
            saveDossierMetaDraft,
            parentIsEvictionForExpandedHeader:
                parentDossierPersistence.parentIsEvictionForExpandedHeader,
            dossierMetaEditIsEvictionExecutionModule,
        }),
        [
            dossierMetaDraft,
            dossierMetaEditIsEvictionExecutionModule,
            openEditDossierMeta,
            openParentDossierMetaEdit,
            parentDossierPersistence.parentIsEvictionForExpandedHeader,
            saveDossierMetaDraft,
            setShowEditDossierMetaModal,
            showEditDossierMetaModal,
        ],
    );
}
