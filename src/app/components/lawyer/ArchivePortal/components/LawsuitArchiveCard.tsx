import React from 'react';
import { Archive } from '@/app/components/ui/icons/Archive';
import { RotateCcw } from '@/app/components/ui/icons/RotateCcw';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import type { ArchiveEnrichedRow } from '../types';
import { lawsuitTrashDaysRemaining } from '@/app/utils/lawsuitTrash';
import { buildLawsuitWorkspacePin } from '@/app/workspace/lawsuitWorkspacePin';
import { WorkspacePinButton } from '@/app/workspace/WorkspacePinButton';
import { resolveLawsuitJurisdiction } from '@/app/domain/lawsuit/lawsuitJurisdiction';
import {
    normalizeLawsuitPartyRoleLabel,
    partitionLawsuitPartiesByRole,
} from '@/app/domain/lawsuit/lawsuitPartyRole';
import { resolveLawsuitArchiveHearingDisplay } from '../utils/lawsuitArchiveHearing';
import {
    ArchiveDossierIdentityBlock,
    type ArchivePartySnippet,
} from './ArchiveDossierIdentityBlock';
import { UnifiedDossierCard } from './UnifiedDossierCard';
import { LAWSUIT_VAULT_TEST_IDS } from '@/app/components/lawyer/smart-modal/smartFile/lawsuitVaultTestIds';
import { linkedDossierClusterRoleLabel } from '../groupLinkedLawsuitArchiveFiles';

type LawsuitCardVariant = 'active' | 'trash' | 'archived';

interface LawsuitArchiveCardProps {
    file: ArchiveEnrichedRow;
    variant: LawsuitCardVariant;
    onOpen: () => void;
    onMoveToTrash?: () => void;
    onArchive?: () => void;
    onRestoreFromTrash?: () => void;
    onRestoreFromArchive?: () => void;
    selected?: boolean;
    onToggleSelect?: () => void;
    testIdPrefix?: string;
    /** دور داخل عنقود مترابط في المخزن */
    clusterRole?: 'base' | 'independent' | 'linked';
}

function partyName(p?: Record<string, unknown>): string {
    if (!p) return '';
    return String(p.name ?? p.fullName ?? '').trim();
}

function toSnippet(
    p: Record<string, unknown> | undefined,
    fallbackRole: string,
): ArchivePartySnippet | null {
    const name = partyName(p);
    if (!name) return null;
    return {
        name,
        role: normalizeLawsuitPartyRoleLabel(String(p?.role ?? p?.status ?? ''), fallbackRole),
        isClient: p?.isClient === true,
    };
}

/** أوّل مستأنف/مدعي وأوّل مستأنف عليه/مدعى عليه — بلا تكرار نفس الطرف على العمودين */
function extractPrimaryParties(parties: unknown): {
    plaintiff: ArchivePartySnippet | null;
    defendant: ArchivePartySnippet | null;
} {
    const list = Array.isArray(parties) ? (parties as Array<Record<string, unknown>>) : [];
    const { plaintiffs, defendants } = partitionLawsuitPartiesByRole(list);

    const plaintiffParty = plaintiffs[0];
    const defendantParty =
        defendants.find((p) => String(p.id ?? '') !== String(plaintiffParty?.id ?? ''))
        ?? defendants[0];

    const plaintiff = toSnippet(plaintiffParty, 'المدعي');
    const defendant = toSnippet(
        defendantParty && plaintiffParty && String(defendantParty.id ?? '') === String(plaintiffParty.id ?? '')
            ? undefined
            : defendantParty,
        'المدعى عليه',
    );

    /*
     * إن وُجد طرف واحد فقط: لا تملأ العمود الثاني بنفس الشخص عبر fallback list[0].
     * إن وُجد طرفان بلا تصنيف: افصل بالترتيب (يمين/يسار أو [0]/[1]).
     */
    if (plaintiff && defendant) return { plaintiff, defendant };
    if (plaintiff && !defendant) return { plaintiff, defendant: null };
    if (!plaintiff && defendant) return { plaintiff: null, defendant };

    if (list.length >= 2) {
        const a = toSnippet(list[0], 'المدعي');
        const b = toSnippet(list[1], 'المدعى عليه');
        if (a && b && a.name === b.name && String(list[0]?.id) === String(list[1]?.id)) {
            return { plaintiff: a, defendant: null };
        }
        return { plaintiff: a, defendant: b };
    }
    return { plaintiff: toSnippet(list[0], 'المدعي'), defendant: null };
}

export const LawsuitArchiveCard: React.FC<LawsuitArchiveCardProps> = ({
    file,
    variant,
    onOpen,
    onMoveToTrash,
    onArchive,
    onRestoreFromTrash,
    onRestoreFromArchive,
    selected,
    onToggleSelect,
    testIdPrefix,
    clusterRole,
}) => {
    const status = file.smartStatus;
    const row = file;
    const daysLeft =
        variant === 'trash'
            ? lawsuitTrashDaysRemaining({
                  status: 'deleted',
                  deletedAt: (file as { deletedAt?: number }).deletedAt,
              })
            : 0;

    const pinPayload = buildLawsuitWorkspacePin({ ...file, type: 'lawsuit' });
    const isTransaction = (file as { type?: string }).type === 'transaction';

    const kind: DossierKind = isTransaction
        ? 'transaction'
        : resolveLawsuitJurisdiction(file as Parameters<typeof resolveLawsuitJurisdiction>[0]) ===
            'personal'
          ? 'personal'
          : 'civil';

    const courtName =
        'court' in file && file.court
            ? typeof file.court === 'string'
                ? file.court
                : file.court.name
            : '';
    const caseType = String(
        (file as { docType?: string }).docType ?? file.title ?? '',
    ).trim();
    const caseNumber = String(row.caseNo || row.caseNumber || '').trim();
    const stage = String((file as { currentStage?: string }).currentStage ?? '').trim();
    const hearingDisplay = resolveLawsuitArchiveHearingDisplay(file as Record<string, unknown>);

    const title = caseNumber || courtName || caseType || 'دعوى';

    const { plaintiff, defendant } = extractPrimaryParties(
        (file as { parties?: unknown }).parties,
    );

    const statusBadge = {
        label: status.label,
        title: status.title,
        className: `${status.bgColor} ${status.borderColor} ${status.color}`,
    };

    const fileKey = String(file.id ?? '').trim();
    const actionTestId = (suffix: string) =>
        testIdPrefix && fileKey ? `${testIdPrefix}-${fileKey}-${suffix}` : undefined;

    const footerIcons: UnifiedDossierFooterIcon[] = [];
    if (variant === 'active') {
        if (onArchive) {
            footerIcons.push({
                id: 'archive',
                label: 'أرشفة الإضبارة',
                icon: <Archive size={16} />,
                tone: 'warning',
                onClick: () => onArchive(),
                testId: actionTestId('archive'),
            });
        }
        if (onMoveToTrash) {
            footerIcons.push({
                id: 'trash',
                label: 'نقل إلى سلة المهملات',
                icon: <Trash2 size={16} />,
                tone: 'danger',
                onClick: () => onMoveToTrash(),
                testId: actionTestId('trash'),
            });
        }
    } else if (variant === 'trash' && onRestoreFromTrash) {
        footerIcons.push({
            id: 'restore',
            label: 'استرجاع من السلة',
            icon: <RotateCcw size={16} />,
            tone: 'success',
            onClick: () => onRestoreFromTrash(),
            testId: actionTestId('restore'),
        });
    } else if (variant === 'archived' && onRestoreFromArchive) {
        footerIcons.push({
            id: 'restore-archive',
            label: 'إعادة للإضابير النشطة',
            icon: <RotateCcw size={16} />,
            tone: 'success',
            onClick: () => onRestoreFromArchive(),
            testId: actionTestId('restore-archive'),
        });
    }

    const wrapperClassName = `${variant === 'trash' ? 'ring-1 ring-rose-500/25' : ''} ${
        variant === 'archived' ? 'opacity-90' : ''
    }`.trim();

    const overlayBadge =
        variant === 'trash' && onToggleSelect ? (
            <button
                type="button"
                role="checkbox"
                aria-checked={selected}
                aria-label={selected ? 'إلغاء تحديد الإضبارة' : 'تحديد الإضبارة للحذف النهائي'}
                title={selected ? 'إلغاء التحديد' : 'تحديد للحذف النهائي'}
                data-testid={actionTestId('select')}
                onClick={(event) => {
                    event.stopPropagation();
                    onToggleSelect();
                }}
                className={`flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border touch-manipulation ${
                    selected
                        ? 'border-[#E6C673]/50 bg-[#E6C673]/16 text-[#E6C673]'
                        : 'border-white/20 bg-white/[0.05] text-white/55 hover:border-white/35 hover:text-white/80'
                }`}
            >
                {selected ? (
                    <span className="text-xs font-black" aria-hidden>
                        ✓
                    </span>
                ) : (
                    <span
                        className="h-3.5 w-3.5 rounded-[3px] border border-current opacity-80"
                        aria-hidden
                    />
                )}
            </button>
        ) : null;

    const footerNote =
        variant === 'trash' && daysLeft > 0 ? (
            <p className="text-rose-300/90 text-[10px] font-bold">
                يُحذف نهائياً بعد {daysLeft} يوماً
            </p>
        ) : variant === 'archived' ? (
            <p className="text-amber-200/80 text-[10px] font-bold">مؤرشفة — للمراجعة فقط</p>
        ) : null;

    const metaRows = [
        courtName && title !== courtName ? { label: 'المحكمة', value: courtName } : null,
        caseType && title !== caseType ? { label: 'نوع الدعوى', value: caseType } : null,
        stage ? { label: 'المرحلة', value: stage } : null,
    ].filter((row): row is { label: string; value: string } => row !== null);

    const identityBlock = (
        <ArchiveDossierIdentityBlock
            hearing={hearingDisplay}
            metaRows={metaRows}
            parties={
                plaintiff || defendant
                    ? {
                          left: plaintiff,
                          right: defendant,
                          leftTone: 'plaintiff',
                          rightTone: 'defendant',
                      }
                    : null
            }
        />
    );

    return (
        <UnifiedDossierCard
            kind={kind}
            relationBadge={
                clusterRole
                    ? {
                          label: linkedDossierClusterRoleLabel(clusterRole),
                          testId: fileKey
                              ? `${LAWSUIT_VAULT_TEST_IDS.linkedDossierRole}-${fileKey}`
                              : undefined,
                          className:
                              clusterRole === 'base'
                                  ? 'border-[#E6C673]/45 bg-[#E6C673]/14 text-[#F3E4B8]'
                                  : clusterRole === 'independent'
                                    ? 'border-indigo-400/40 bg-indigo-500/12 text-indigo-100'
                                    : 'border-white/15 bg-white/[0.06] text-white/70',
                      }
                    : undefined
            }
            statusBadge={statusBadge}
            pinNode={
                pinPayload ? (
                    <div
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                        role="presentation"
                    >
                        <WorkspacePinButton
                            item={pinPayload}
                            variant="ghost"
                            size={16}
                            className="!min-w-[44px] !min-h-[44px] !w-11 !h-11"
                        />
                    </div>
                ) : undefined
            }
            title={title}
            bodyExtra={identityBlock}
            footerNote={footerNote}
            onOpen={onOpen}
            openLabel="فتح الإضبارة"
            footerIcons={footerIcons}
            overlayBadge={overlayBadge}
            wrapperClassName={wrapperClassName}
            testId={testIdPrefix ? `${testIdPrefix}-${file.id}` : undefined}
        />
    );
};
