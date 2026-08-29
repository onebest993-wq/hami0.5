import React, { memo, useEffect, useMemo, useState } from 'react';
import type { ElementType } from 'react';
import { type ExecutionFile } from '@/app/types/execution';
import {
    fileHasSpecificDeliveryClaim,
    resolveDossierHeaderFields,
    type DossierHeaderResolved,
} from '@/app/utils/executionDossierHeaderFields';
import { Link } from '@/app/components/ui/icons/Link';
import { EXECUTION_DOSSIER_SUMMARY_TOGGLE } from '@/app/components/lawyer/ExecutionDashboard/executionDossierVisualLite';
import { DashboardHeaderStatusBanners } from './DashboardHeaderStatusBanners';
import { DashboardHeaderExpandedDetails } from './DashboardHeaderExpandedDetails';
import { DashboardHeaderLinkedDossiers } from './DashboardHeaderLinkedDossiers';
import { DashboardHeaderSubFileNumberEditor } from './DashboardHeaderSubFileNumberEditor';

interface StatuteStatus {
    daysRemaining: number;
    yearsRemaining: number;
    isCritical: boolean;
    isExpired: boolean;
}

interface DashboardHeaderSectionProps {
    statuteStatus: StatuteStatus | null;
    isAlimonyClaim: boolean;
    executionPaused: boolean;
    handleResumeExecution: () => void;
    stayOfExecutionActive: boolean;
    executionData: ExecutionFile;
    handleLiftStayOfExecution: () => void;
    XCircle: ElementType;
    isHeaderExpanded: boolean;
    toggleHeaderExpanded: () => void;
    headerFields: DossierHeaderResolved;
    openEditDossierMeta: () => void;
    Pencil: ElementType;
    isEvictionExecutionModule: boolean;
    classificationDisplay: string;
    showJudgmentMeta: boolean;
    docNumber?: string;
    judgmentDateDisplay: string;
    claimTypeArabicDisplay: string;
    evictionPropertyNumber: string;
    evictionPropertyDistrict: string;
    evictionPropertyTypeField: string;
    evictionFullAddressField: string;
    isSubFile?: boolean;
    hasActiveInaba?: boolean;
    delegationPurpose?: string;
    linkToken?: string;
    onCopyLinkToken?: () => void;
    linkedDossiers?: ExecutionFile['linkedDossiers'];
    onOpenLinkedDossier?: (dossier: NonNullable<ExecutionFile['linkedDossiers']>[number]) => void;
    onRemoveLinkedDossier?: (linkedId: string) => void;
    onRequestTransferFileNumberChange?: () => void;
    onSaveSubFileNumber?: (fileNumber: string, fileYear: string) => void;
    expandedDossierFromParent?: {
        headerFields: DossierHeaderResolved;
        classificationDisplay: string;
        claimTypeArabicDisplay: string;
        showJudgmentMeta: boolean;
        judgmentDateDisplay: string;
        docNumber?: string;
        evictionPropertyNumber: string;
        evictionPropertyDistrict: string;
        evictionPropertyTypeField: string;
        evictionFullAddressField: string;
        isEvictionExecutionModule: boolean;
        openEditDossierMeta: () => void;
        showSpecificDeliveryMeta?: boolean;
    };
}

export const DashboardHeaderSection = memo(function DashboardHeaderSection({
    statuteStatus,
    isAlimonyClaim,
    executionPaused,
    handleResumeExecution,
    stayOfExecutionActive,
    executionData,
    handleLiftStayOfExecution,
    XCircle,
    isHeaderExpanded,
    toggleHeaderExpanded,
    headerFields,
    openEditDossierMeta,
    Pencil,
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
    isSubFile,
    hasActiveInaba,
    delegationPurpose,
    linkToken,
    onCopyLinkToken,
    linkedDossiers,
    onOpenLinkedDossier,
    onRemoveLinkedDossier,
    onRequestTransferFileNumberChange,
    onSaveSubFileNumber,
    expandedDossierFromParent,
}: DashboardHeaderSectionProps) {
    const resolvedFromExecution = useMemo(
        () => resolveDossierHeaderFields(executionData),
        [executionData],
    );
    const effectiveHeaderFields = useMemo((): DossierHeaderResolved => {
        const hasIncoming =
            Boolean(headerFields.directorate?.trim()) ||
            Boolean(headerFields.fileNumber?.trim()) ||
            Boolean(headerFields.fileYear?.trim()) ||
            Boolean(headerFields.fileRefDisplay?.trim() && headerFields.fileRefDisplay !== '—');
        if (hasIncoming) return headerFields;
        return resolvedFromExecution;
    }, [headerFields, resolvedFromExecution]);

    const [localHeaderExpanded, setLocalHeaderExpanded] = useState(isHeaderExpanded);
    useEffect(() => {
        setLocalHeaderExpanded(isHeaderExpanded);
    }, [isHeaderExpanded]);
    const headerExpanded = localHeaderExpanded;

    const showSpecificDeliveryMeta = fileHasSpecificDeliveryClaim(executionData);
    const expanded = expandedDossierFromParent ?? {
        headerFields: effectiveHeaderFields,
        classificationDisplay,
        claimTypeArabicDisplay,
        showJudgmentMeta,
        judgmentDateDisplay,
        docNumber,
        evictionPropertyNumber,
        evictionPropertyDistrict,
        evictionPropertyTypeField,
        evictionFullAddressField,
        isEvictionExecutionModule,
        openEditDossierMeta,
        showSpecificDeliveryMeta,
    };
    const showTransferFileNumberChange =
        Boolean(executionData?.transferPendingFileNumberChange) && typeof onRequestTransferFileNumberChange === 'function';
    const [subFileNumberEditorOpen, setSubFileNumberEditorOpen] = useState(false);
    const [subFileNumberDraft, setSubFileNumberDraft] = useState('');
    const [subFileYearDraft, setSubFileYearDraft] = useState('');

    useEffect(() => {
        if (!isSubFile) {
            setSubFileNumberEditorOpen(false);
            return;
        }
        setSubFileNumberDraft(headerFields.fileNumber || '');
        setSubFileYearDraft(headerFields.fileYear || '');
    }, [isSubFile, effectiveHeaderFields.fileNumber, effectiveHeaderFields.fileYear]);

    const subFileRefFilled = Boolean(
        String(effectiveHeaderFields.fileNumber || '').trim() ||
            String(effectiveHeaderFields.fileYear || '').trim()
    );
    const subFileRefDisplay = subFileRefFilled
        ? `${effectiveHeaderFields.fileNumber || '—'} / ${effectiveHeaderFields.fileYear || '—'}`
        : '';

    const handleSaveSubFileNumber = (e?: React.MouseEvent) => {
        e?.stopPropagation();
        e?.preventDefault();
        const num = subFileNumberDraft.trim();
        const year = subFileYearDraft.trim();
        if (!num && !year) return;
        onSaveSubFileNumber?.(num, year);
        setSubFileNumberEditorOpen(false);
    };

    return (
        <>
            <DashboardHeaderStatusBanners
                statuteStatus={statuteStatus}
                isAlimonyClaim={isAlimonyClaim}
                executionPaused={executionPaused}
                handleResumeExecution={handleResumeExecution}
                stayOfExecutionActive={stayOfExecutionActive}
                executionData={executionData}
                handleLiftStayOfExecution={handleLiftStayOfExecution}
                XCircle={XCircle}
            />

            <div className="mx-3 mt-1.5 mb-1.5">
                <div
                    className={`${EXECUTION_DOSSIER_SUMMARY_TOGGLE} ${
                        headerExpanded ? 'rounded-t-lg rounded-b-none' : 'rounded-lg'
                    }`}
                    role="button"
                    tabIndex={0}
                    onClick={() => setLocalHeaderExpanded((open) => !open)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setLocalHeaderExpanded((open) => !open);
                        }
                    }}
                    aria-expanded={headerExpanded}
                    aria-label={headerExpanded ? 'طيّ تفاصيل الإضبارة' : 'توسيع تفاصيل الإضبارة'}
                    title={headerExpanded ? 'طيّ التفاصيل' : 'توسيع التفاصيل'}
                    data-testid="execution-dossier-header-toggle"
                >
                    <div
                        className="relative z-10 flex min-h-[44px] w-full items-center gap-2 cursor-pointer"
                        dir="rtl"
                    >
                        <div className="flex min-w-0 flex-1 flex-wrap items-center justify-center gap-x-2 gap-y-0 overflow-hidden text-center leading-none">
                            <span className="shrink-0 text-[13px] font-bold leading-tight text-amber-50">
                                {effectiveHeaderFields.directorate || '—'}
                            </span>
                            <span className="shrink-0 text-amber-700/65" aria-hidden>
                                ·
                            </span>
                            <span className="inline-flex shrink-0 flex-col items-center gap-0 leading-none">
                                {isSubFile ? (
                                    <DashboardHeaderSubFileNumberEditor
                                        subFileRefFilled={subFileRefFilled}
                                        subFileRefDisplay={subFileRefDisplay}
                                        subFileNumberEditorOpen={subFileNumberEditorOpen}
                                        setSubFileNumberEditorOpen={setSubFileNumberEditorOpen}
                                        subFileNumberDraft={subFileNumberDraft}
                                        setSubFileNumberDraft={setSubFileNumberDraft}
                                        subFileYearDraft={subFileYearDraft}
                                        setSubFileYearDraft={setSubFileYearDraft}
                                        onSave={handleSaveSubFileNumber}
                                    />
                                ) : (
                                    <>
                                        {showTransferFileNumberChange ? (
                                            <button
                                                type="button"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onRequestTransferFileNumberChange?.();
                                                }}
                                                className="pointer-events-auto mb-0.5 text-[10px] font-bold leading-none text-amber-200/85 hover:text-amber-100 transition-colors"
                                            >
                                                هل تريد تغيير الرقم؟
                                            </button>
                                        ) : null}
                                        <span className="shrink-0 tabular-nums text-[13px] font-bold leading-none text-amber-200/95">
                                            {effectiveHeaderFields.fileRefDisplay}
                                        </span>
                                    </>
                                )}
                            </span>
                            {linkToken ? (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onCopyLinkToken?.();
                                    }}
                                    className="pointer-events-auto inline-flex shrink-0 items-center gap-0.5 rounded-md border border-amber-500/20 bg-amber-950/30 px-1.5 py-0.5 text-[10px] text-amber-300/80 hover:bg-amber-950/50 hover:text-amber-200 transition-colors"
                                    title="نسخ رمز المشاركة"
                                >
                                    <Link size={12} />
                                </button>
                            ) : null}
                        </div>
                    </div>

                    <DashboardHeaderLinkedDossiers
                        linkedDossiers={linkedDossiers}
                        onOpenLinkedDossier={onOpenLinkedDossier}
                        onRemoveLinkedDossier={onRemoveLinkedDossier}
                        XCircle={XCircle}
                    />
                </div>

                <DashboardHeaderExpandedDetails
                    headerExpanded={headerExpanded}
                    isSubFile={isSubFile}
                    delegationPurpose={delegationPurpose}
                    expanded={expanded}
                    Pencil={Pencil}
                />
            </div>
        </>
    );
});
