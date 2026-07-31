import type { DossierLifecycleStatus } from '@/app/types/execution';

export type PhoneBodyScopeRecord = Record<string, unknown>;

export type FallbackDossierMetaDraft = {
    directorate: string;
    fileNumber: string;
    fileYear: string;
    docType: string;
    claimType: string;
    docNumber: string;
    judgmentDate: string;
    classification: string;
    property_number: string;
    district: string;
    property_type: string;
    full_address: string;
    eviction_premises_use: '' | 'residential' | 'commercial';
    specificDeliveryItemName: string;
    specificDeliveryItemNature: string;
};

export type PhoneBodyScheduleBridge = (task: () => void) => void;
export type PhoneBodyReadScope = () => PhoneBodyScopeRecord;
export type PhoneBodyCommitBridge = (task: () => void) => void;

export type PhoneBodyModalFlagKey =
    | 'showAppointmentModal'
    | 'showNotesModal'
    | 'showDocumentsModal'
    | 'showExecutionTrashModal';

export type PhoneBodyModalSetterKey =
    | 'setShowAppointmentModal'
    | 'setShowNotesModal'
    | 'setShowDocumentsModal'
    | 'setShowExecutionTrashModal';

export type PhoneBodyEditPartyKind = 'creditor' | 'debtor';

export type PhoneBodyEditPartyFallbackTarget = {
    kind: PhoneBodyEditPartyKind;
    index: number;
    forceHeirs: boolean;
    partyId: string;
};

function readRecord(value: unknown): Record<string, unknown> | null {
    return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function readBooleanFlag(scope: PhoneBodyScopeRecord, key: string): boolean {
    return scope[key] === true;
}

function readModalSetter(
    scope: PhoneBodyScopeRecord,
    key: PhoneBodyModalSetterKey,
): ((show: boolean) => void) | null {
    return typeof scope[key] === 'function' ? (scope[key] as (show: boolean) => void) : null;
}

function readFunction<T extends (...args: never[]) => unknown>(
    scope: PhoneBodyScopeRecord,
    key: string,
): T | null {
    return typeof scope[key] === 'function' ? (scope[key] as T) : null;
}

export function buildFallbackDossierMetaDraftFromScope(
    scope: PhoneBodyScopeRecord,
): FallbackDossierMetaDraft {
    const executionData = readRecord(scope.executionData) ?? {};
    const rawEvictionPremisesUse =
        typeof executionData.eviction_premises_use === 'string'
            ? executionData.eviction_premises_use
            : scope.evictionPremisesUseRaw;

    return {
        directorate: String(executionData.directorate ?? scope.directorate ?? ''),
        fileNumber: String(executionData.fileNumber ?? scope.fileNumber ?? ''),
        fileYear: String(executionData.fileYear ?? scope.fileYear ?? ''),
        docType: String(executionData.docType ?? ''),
        claimType: String(executionData.claimType ?? ''),
        docNumber: String(executionData.docNumber ?? executionData.chequeNumber ?? scope.docNumber ?? ''),
        judgmentDate: String(
            executionData.judgmentDate ??
                executionData.chequeIssueDate ??
                executionData.shariaIssueDate ??
                scope.judgmentDate ??
                '',
        ).slice(0, 10),
        classification: String(executionData.classification ?? scope.classification ?? ''),
        property_number: String(executionData.property_number ?? scope.evictionPropertyNumber ?? ''),
        district: String(executionData.district ?? scope.evictionPropertyDistrict ?? ''),
        property_type: String(executionData.property_type ?? scope.evictionPropertyTypeField ?? ''),
        full_address: String(executionData.full_address ?? scope.evictionFullAddressField ?? ''),
        eviction_premises_use:
            rawEvictionPremisesUse === 'residential'
                ? 'residential'
                : rawEvictionPremisesUse === 'commercial'
                  ? 'commercial'
                  : '',
        specificDeliveryItemName: String(executionData.specificDeliveryItemName ?? ''),
        specificDeliveryItemNature: String(executionData.specificDeliveryItemNature ?? ''),
    };
}

export function applyPhoneBodyDossierLifecycleFallback(params: {
    status: DossierLifecycleStatus;
    reason: string;
    date: string;
    apply?: ((status: DossierLifecycleStatus, reason: string, date: string) => boolean) | null;
    pick: (status: DossierLifecycleStatus) => void;
    confirm: (reason?: string, date?: string) => void;
}): boolean {
    const { status, reason, date, apply, pick, confirm } = params;
    if (typeof apply === 'function') {
        return Boolean(apply(status, reason, date));
    }
    if (status === 'active') {
        pick(status);
        return true;
    }
    pick(status);
    confirm(reason, date);
    return true;
}

export function bridgeOpenEditDossierMeta(params: {
    readLatestScope: PhoneBodyReadScope;
    scheduleBridge: PhoneBodyScheduleBridge;
    buildFallbackDraft: (scope: PhoneBodyScopeRecord) => FallbackDossierMetaDraft;
}): boolean {
    const { readLatestScope, scheduleBridge, buildFallbackDraft } = params;
    const latestScope = readLatestScope();
    const openEditDossierMeta = readFunction<() => void>(latestScope, 'openEditDossierMeta');
    const setShowEditDossierMetaModal = readFunction<(show: boolean) => void>(
        latestScope,
        'setShowEditDossierMetaModal',
    );
    const setDossierMetaDraft = readFunction<(draft: FallbackDossierMetaDraft) => void>(
        latestScope,
        'setDossierMetaDraft',
    );

    if (openEditDossierMeta) {
        openEditDossierMeta();
        scheduleBridge(() => {
            const refreshedScope = readLatestScope();
            if (
                readBooleanFlag(refreshedScope, 'showEditDossierMetaModal') &&
                refreshedScope.dossierMetaDraft != null
            ) {
                return;
            }
            const draftSetter =
                readFunction<(draft: FallbackDossierMetaDraft) => void>(
                    refreshedScope,
                    'setDossierMetaDraft',
                ) ?? setDossierMetaDraft;
            if (refreshedScope.dossierMetaDraft == null && draftSetter) {
                draftSetter(buildFallbackDraft(refreshedScope));
            }
            const modalSetter =
                readFunction<(show: boolean) => void>(
                    refreshedScope,
                    'setShowEditDossierMetaModal',
                ) ?? setShowEditDossierMetaModal;
            modalSetter?.(true);
        });
        return true;
    }

    // مسار احتياطي: إن غاب openEditDossierMeta من scope القديم لكن setters موجودة
    if (setShowEditDossierMetaModal && setDossierMetaDraft) {
        setDossierMetaDraft(buildFallbackDraft(latestScope));
        setShowEditDossierMetaModal(true);
        return true;
    }

    return false;
}

export function bridgeOpenParentDossierMetaEdit(params: {
    readLatestScope: PhoneBodyReadScope;
    scheduleBridge: PhoneBodyScheduleBridge;
}): boolean {
    const { readLatestScope, scheduleBridge } = params;
    const latestScope = readLatestScope();
    const openParentDossierMetaEdit = readFunction<() => void>(latestScope, 'openParentDossierMetaEdit');
    if (!openParentDossierMetaEdit) {
        return false;
    }

    openParentDossierMetaEdit();
    scheduleBridge(() => {
        const refreshedScope = readLatestScope();
        if (readBooleanFlag(refreshedScope, 'showEditDossierMetaModal')) {
            return;
        }
        const setShowEditDossierMetaModal = readFunction<(show: boolean) => void>(
            refreshedScope,
            'setShowEditDossierMetaModal',
        );
        setShowEditDossierMetaModal?.(true);
    });
    return true;
}

export function bridgeOpenEditParty(params: {
    kind: PhoneBodyEditPartyKind;
    index: number;
    opts?: { forceHeirs?: boolean; party?: unknown };
    readLatestScope: PhoneBodyReadScope;
    scheduleBridge: PhoneBodyScheduleBridge;
}): boolean {
    const { kind, index, opts, readLatestScope, scheduleBridge } = params;
    const latestScope = readLatestScope();
    const openEditParty = readFunction<
        (kind: PhoneBodyEditPartyKind, index: number, opts?: { forceHeirs?: boolean; party?: unknown }) => void
    >(latestScope, 'openEditParty');
    if (!openEditParty) {
        return false;
    }

    openEditParty(kind, index, opts);
    scheduleBridge(() => {
        const refreshedScope = readLatestScope();
        if (refreshedScope.editPartyTarget != null) {
            return;
        }
        const setEditPartyTarget = readFunction<
            (target: PhoneBodyEditPartyFallbackTarget) => void
        >(refreshedScope, 'setEditPartyTarget');
        const partyRecord = readRecord(opts?.party);
        const fallbackPartyId =
            typeof partyRecord?.id === 'string' || typeof partyRecord?.id === 'number'
                ? String(partyRecord.id)
                : null;
        if (setEditPartyTarget && fallbackPartyId) {
            setEditPartyTarget({
                kind,
                index,
                forceHeirs: Boolean(opts?.forceHeirs),
                partyId: fallbackPartyId,
            });
        }
    });
    return true;
}

export function openPhoneBodyModalWithBridge(params: {
    readLatestScope: PhoneBodyReadScope;
    scheduleBridge: PhoneBodyScheduleBridge;
    commitBridge: PhoneBodyCommitBridge;
    modalFlagKey: PhoneBodyModalFlagKey;
    modalSetterKey: PhoneBodyModalSetterKey;
    fallbackSetter: (show: boolean) => void;
    directSetter?: ((show: boolean) => void) | null;
}): void {
    const {
        readLatestScope,
        scheduleBridge,
        commitBridge,
        modalFlagKey,
        modalSetterKey,
        fallbackSetter,
        directSetter,
    } = params;
    const latestScope = readLatestScope();
    const latestSetter = readModalSetter(latestScope, modalSetterKey);
    const setter = latestSetter ?? directSetter ?? fallbackSetter;

    commitBridge(() => {
        fallbackSetter(true);
        if (setter !== fallbackSetter) {
            setter(true);
        }
    });

    scheduleBridge(() => {
        const refreshedScope = readLatestScope();
        if (readBooleanFlag(refreshedScope, modalFlagKey)) {
            return;
        }
        const refreshedSetter = readModalSetter(refreshedScope, modalSetterKey);
        (refreshedSetter ?? directSetter ?? fallbackSetter)(true);
    });
}
