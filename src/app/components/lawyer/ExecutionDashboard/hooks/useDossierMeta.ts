import { useState, useCallback, useMemo, useRef } from 'react';
import type { ExecutionFile } from '@/app/types/execution';
import { fileHasSpecificDeliveryClaim } from '@/app/utils/executionDossierHeaderFields';
import { toastAfterExecutionPersist } from '../helpers/toastAfterExecutionPersist';
import {
    formatDossierFileRef,
    normalizeDossierMetaFileParts,
    parseDossierFileRef,
    validateDossierMetaDraft,
} from '../helpers/dossierMetaValidation';
import {
    buildDossierPartyNamesPatch,
    encodeDossierPartyNames,
    validateDossierPartyNames,
} from '../helpers/dossierMetaPartyNames';

function resolveInstrumentDocNumber(file: ExecutionFile | null | undefined, fallback = ''): string {
    if (!file) return String(fallback ?? '').trim();
    const row = file as ExecutionFile & {
        chequeNumber?: string;
        shariaDeedNumber?: string;
    };
    return String(
        row.docNumber || row.chequeNumber || row.shariaDeedNumber || fallback || '',
    ).trim();
}

function resolveInstrumentJudgmentDate(file: ExecutionFile | null | undefined, fallback = ''): string {
    if (!file) return String(fallback ?? '').trim().slice(0, 10);
    const row = file as ExecutionFile & {
        chequeIssueDate?: string;
        shariaIssueDate?: string;
    };
    return String(
        row.judgmentDate || row.chequeIssueDate || row.shariaIssueDate || fallback || '',
    )
        .trim()
        .slice(0, 10);
}

export function useDossierMeta(
    executionData: ExecutionFile | null | undefined,
    directorate: string,
    fileNumber: string,
    fileYear: string,
    docNumber: string,
    judgmentDate: string,
    classification: string,
    evictionPropertyNumber: string,
    evictionPropertyDistrict: string,
    evictionPropertyTypeField: string,
    evictionFullAddressField: string,
    evictionPremisesUseRaw: string | undefined,
    isEvictionExecutionModule: boolean,
    persistExecutionMerge: (patch: Record<string, unknown>) => boolean | void,
    showToast: (msg: string, type: 'success' | 'error' | 'warning' | 'info') => void,
) {
    const [showEditDossierMetaModal, setShowEditDossierMetaModal] = useState(false);
    const [dossierMetaDraft, setDossierMetaDraftState] = useState<Record<string, string> | null>(null);
    const dossierMetaDraftRef = useRef(dossierMetaDraft);
    dossierMetaDraftRef.current = dossierMetaDraft;

    const setDossierMetaDraft = useCallback(
        (
            update:
                | Record<string, string>
                | null
                | ((prev: Record<string, string> | null) => Record<string, string> | null),
        ) => {
            const next =
                typeof update === 'function' ? update(dossierMetaDraftRef.current) : update;
            dossierMetaDraftRef.current = next;
            setDossierMetaDraftState(next);
        },
        [],
    );

    const openEditDossierMeta = useCallback(() => {
        setDossierMetaDraft(
            normalizeDossierMetaFileParts(
                encodeDossierPartyNames(
                    {
            directorate: String(executionData?.directorate ?? directorate ?? ''),
            fileNumber: String(executionData?.fileNumber ?? fileNumber ?? ''),
            fileYear: String(executionData?.fileYear ?? fileYear ?? ''),
            docType: String(executionData?.docType ?? ''),
            claimType: String(executionData?.claimType ?? ''),
            docNumber: resolveInstrumentDocNumber(executionData, docNumber),
            judgmentDate: resolveInstrumentJudgmentDate(executionData, judgmentDate),
            // التصنيف غير قابل للتعديل من هذه الواجهة — يُحفظ كما هو
            classification: String(executionData?.classification ?? classification ?? ''),
            property_number: String(evictionPropertyNumber ?? ''),
            district: String(evictionPropertyDistrict ?? ''),
            property_type: String(evictionPropertyTypeField ?? ''),
            full_address: String(evictionFullAddressField ?? ''),
            eviction_premises_use:
                evictionPremisesUseRaw === 'residential'
                    ? 'residential'
                    : evictionPremisesUseRaw === 'commercial'
                      ? 'commercial'
                      : '',
            specificDeliveryItemName: String(
                (executionData as { specificDeliveryItemName?: string } | null | undefined)
                    ?.specificDeliveryItemName ?? ''
            ),
            specificDeliveryItemNature: String(
                (executionData as { specificDeliveryItemNature?: string } | null | undefined)
                    ?.specificDeliveryItemNature ?? ''
            ),
                },
                    executionData,
                ),
            ),
        );
        setShowEditDossierMetaModal(true);
    }, [
        classification,
        directorate,
        docNumber,
        evictionFullAddressField,
        evictionPremisesUseRaw,
        evictionPropertyDistrict,
        evictionPropertyNumber,
        evictionPropertyTypeField,
        executionData,
        fileNumber,
        fileYear,
        judgmentDate,
    ]);

    const saveDossierMetaDraft = useCallback((draftOverride?: Record<string, string>) => {
        if (draftOverride) {
            dossierMetaDraftRef.current = draftOverride;
            setDossierMetaDraftState(draftOverride);
        }
        const dossierMetaDraft = dossierMetaDraftRef.current;
        if (!dossierMetaDraft) return;
        const validation = validateDossierMetaDraft(dossierMetaDraft, {
            isEviction: isEvictionExecutionModule,
        });
        if (!validation.ok) {
            showToast(validation.message, 'warning');
            return;
        }
        const partyValidation = validateDossierPartyNames(dossierMetaDraft);
        if (!partyValidation.ok) {
            showToast(partyValidation.message, 'warning');
            return;
        }
        const ep = dossierMetaDraft.eviction_premises_use;
        const partyPatch = buildDossierPartyNamesPatch(executionData, dossierMetaDraft);
        const parsedFile = parseDossierFileRef(
            formatDossierFileRef(dossierMetaDraft.fileNumber, dossierMetaDraft.fileYear) ||
                dossierMetaDraft.fileNumber,
        );
        const resolvedFileNumber =
            parsedFile.fileNumber || String(dossierMetaDraft.fileNumber ?? '').trim();
        const resolvedFileYear =
            parsedFile.fileYear || String(dossierMetaDraft.fileYear ?? '').trim();
        const base = {
            directorate: dossierMetaDraft.directorate as ExecutionFile['directorate'],
            fileNumber: resolvedFileNumber,
            fileYear: resolvedFileYear,
            docType: dossierMetaDraft.docType,
            claimType: dossierMetaDraft.claimType,
            docNumber: dossierMetaDraft.docNumber,
            judgmentDate: dossierMetaDraft.judgmentDate,
            classification: String(
                executionData?.classification ?? dossierMetaDraft.classification ?? '',
            ),
        };
        const specificDeliveryPatch = fileHasSpecificDeliveryClaim({
            ...executionData,
            claimType: dossierMetaDraft.claimType,
        } as ExecutionFile)
            ? {
                  specificDeliveryItemName: String(
                      dossierMetaDraft.specificDeliveryItemName || ''
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

        let persisted: boolean | void;
        if (isEvictionExecutionModule) {
            persisted = persistExecutionMerge({
                ...base,
                property_number: dossierMetaDraft.property_number,
                district: dossierMetaDraft.district,
                property_type: dossierMetaDraft.property_type,
                full_address: dossierMetaDraft.full_address,
                eviction_premises_use:
                    ep === 'residential' || ep === 'commercial'
                        ? (ep as 'commercial' | 'residential')
                        : undefined,
                ...specificDeliveryPatch,
                ...partyPatch,
            });
        } else {
            persisted = persistExecutionMerge({ ...base, ...specificDeliveryPatch, ...partyPatch });
        }
        if (
            !toastAfterExecutionPersist(persisted, showToast, 'تم حفظ بيانات الإضبارة')
        ) {
            return;
        }
        setShowEditDossierMetaModal(false);
        setDossierMetaDraft(null);
    }, [executionData, isEvictionExecutionModule, persistExecutionMerge, setDossierMetaDraft, showToast]);

    return useMemo(
        () => ({
            showEditDossierMetaModal,
            dossierMetaDraft,
            setShowEditDossierMetaModal,
            setDossierMetaDraft,
            openEditDossierMeta,
            saveDossierMetaDraft,
        }),
        [
            dossierMetaDraft,
            openEditDossierMeta,
            saveDossierMetaDraft,
            showEditDossierMetaModal,
        ],
    );
}
