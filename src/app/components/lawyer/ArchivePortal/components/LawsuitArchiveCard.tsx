import React from 'react';
import { Archive, RotateCcw, Trash2 } from 'lucide-react';
import type { ArchiveEnrichedRow } from '../types';
import { lawsuitTrashDaysRemaining } from '@/app/utils/lawsuitTrash';
import { WorkspacePinButton } from '@/app/workspace/WorkspacePinButton';
import { buildLawsuitWorkspacePin } from '@/app/workspace/workspacePinBuilders';
import { resolveLawsuitJurisdiction } from '@/app/domain/lawsuit/lawsuitJurisdiction';
import { resolveLawsuitArchiveHearingDisplay } from '../utils/lawsuitArchiveHearing';
import {
    ArchiveDossierIdentityBlock,
    type ArchivePartySnippet,
} from './ArchiveDossierIdentityBlock';
import {
    UnifiedDossierCard,
    type DossierKind,
    type UnifiedDossierFooterIcon,
} from './UnifiedDossierCard';

export type LawsuitCardVariant = 'active' | 'trash' | 'archived';

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
}

function normalizeRoleLabel(raw: string, fallback: string): string {
    const role = raw.trim();
    if (!role) return fallback;
    const lower = role.toLowerCase();
    if (lower === 'plaintiff' || lower === 'client' || lower === 'creditor') return 'المدعي';
    if (lower === 'defendant' || lower === 'opponent' || lower === 'debtor') return 'المدعى عليه';
    return role;
}

function isPlaintiffParty(p: Record<string, unknown>): boolean {
    const role = String(p.role ?? p.status ?? '').trim().toLowerCase();
    const side = String(p.side ?? '').trim().toLowerCase();
    if (role === 'plaintiff' || role === 'client' || role === 'creditor') return true;
    if (side === 'right') return true;
    if (role.includes('مدعي') && !role.includes('مدعى')) return true;
    if (role.includes('دائن')) return true;
    return false;
}

function isDefendantParty(p: Record<string, unknown>): boolean {
    const role = String(p.role ?? p.status ?? '').trim().toLowerCase();
    const side = String(p.side ?? '').trim().toLowerCase();
    if (role === 'defendant' || role === 'opponent' || role === 'debtor') return true;
    if (side === 'left') return true;
    if (role.includes('مدعى') || role.includes('مدين') || role.includes('خصم')) return true;
    return false;
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
        role: normalizeRoleLabel(String(p?.role ?? p?.status ?? ''), fallbackRole),
        isClient: p?.isClient === true,
    };
}

/** أوّل مدعي وأوّل مدعى عليه مع المركز القانوني وعلامة الموكل */
function extractPrimaryParties(parties: unknown): {
    plaintiff: ArchivePartySnippet | null;
    defendant: ArchivePartySnippet | null;
} {
    const list = Array.isArray(parties) ? (parties as Array<Record<string, unknown>>) : [];
    const plaintiff =
        toSnippet(list.find(isPlaintiffParty), 'المدعي') || toSnippet(list[0], 'المدعي');
    const defendant = toSnippet(list.find(isDefendantParty), 'المدعى عليه');
    return { plaintiff, defendant };
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
        className: `${status.bgColor} ${status.borderColor} ${status.color}`,
    };

    const footerIcons: UnifiedDossierFooterIcon[] = [];
    if (variant === 'active') {
        if (onArchive) {
            footerIcons.push({
                id: 'archive',
                label: 'أرشفة الإضبارة',
                icon: <Archive size={16} />,
                tone: 'warning',
                onClick: () => onArchive(),
                testId: testIdPrefix ? `${testIdPrefix}-archive` : undefined,
            });
        }
        if (onMoveToTrash) {
            footerIcons.push({
                id: 'trash',
                label: 'نقل إلى سلة المهملات',
                icon: <Trash2 size={16} />,
                tone: 'danger',
                onClick: () => onMoveToTrash(),
                testId: testIdPrefix ? `${testIdPrefix}-trash` : undefined,
            });
        }
    } else if (variant === 'trash' && onRestoreFromTrash) {
        footerIcons.push({
            id: 'restore',
            label: 'استرجاع من السلة',
            icon: <RotateCcw size={16} />,
            tone: 'success',
            onClick: () => onRestoreFromTrash(),
        });
    } else if (variant === 'archived' && onRestoreFromArchive) {
        footerIcons.push({
            id: 'restore-archive',
            label: 'إعادة للإضابير النشطة',
            icon: <RotateCcw size={16} />,
            tone: 'success',
            onClick: () => onRestoreFromArchive(),
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
                onClick={(event) => {
                    event.stopPropagation();
                    onToggleSelect();
                }}
                className="absolute top-3 right-3 z-30 w-6 h-6 rounded-md border border-white/25 bg-black/40 flex items-center justify-center"
            >
                {selected ? <span className="text-[#d4af37] text-xs font-bold">✓</span> : null}
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
            statusBadge={statusBadge}
            pinNode={
                pinPayload ? (
                    <div
                        onClick={(event) => event.stopPropagation()}
                        onKeyDown={(event) => event.stopPropagation()}
                        role="presentation"
                    >
                        <WorkspacePinButton item={pinPayload} />
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
