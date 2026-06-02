import React from 'react';
import { Archive, RotateCcw, Trash2 } from 'lucide-react';
import type { ArchiveEnrichedRow } from '../types';
import { lawsuitTrashDaysRemaining } from '@/app/utils/lawsuitTrash';
import { WorkspacePinButton } from '@/app/workspace/WorkspacePinButton';
import { buildLawsuitWorkspacePin } from '@/app/workspace/workspacePinBuilders';
import { resolveLawsuitJurisdiction } from '@/app/domain/lawsuit/lawsuitJurisdiction';
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

/**
 * يستخرج أوّل اسم لكلّ من المدعي والمدعى عليه من قائمة الأطراف.
 * يدعم الأدوار الإنكليزية والعربية و`side: left|right` معاً.
 */
function extractPartyNames(parties: unknown): { plaintiff: string; defendant: string } {
    const list = Array.isArray(parties) ? (parties as Array<Record<string, unknown>>) : [];
    const isPlaintiff = (p: Record<string, unknown>): boolean => {
        const role = String(p.role ?? '').trim().toLowerCase();
        const side = String((p as { side?: string }).side ?? '').trim().toLowerCase();
        if (role === 'plaintiff' || role === 'client' || role === 'creditor') return true;
        if (side === 'right') return true;
        if (role.includes('مدعي') || role === 'مدّعي' || role.includes('دائن')) return true;
        return false;
    };
    const isDefendant = (p: Record<string, unknown>): boolean => {
        const role = String(p.role ?? '').trim().toLowerCase();
        const side = String((p as { side?: string }).side ?? '').trim().toLowerCase();
        if (role === 'defendant' || role === 'opponent' || role === 'debtor') return true;
        if (side === 'left') return true;
        if (role.includes('مدعى') || role.includes('مدين') || role.includes('خصم')) return true;
        return false;
    };
    const nameOf = (p?: Record<string, unknown>): string =>
        String((p?.name as string | undefined) ?? (p?.fullName as string | undefined) ?? '').trim();
    const plaintiff = nameOf(list.find(isPlaintiff)) || nameOf(list[0]);
    const defendant = nameOf(list.find(isDefendant));
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

    /*
     * نوع البطاقة:
     *   - معاملة → 'transaction'
     *   - دعوى مدنية → 'civil' (افتراضي)
     *   - دعوى أحوال شخصية → 'personal' (يُستنتج من `resolveLawsuitJurisdiction`)
     */
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
    const docType =
        (file as { docType?: string }).docType ?? file.title ?? String(file.type ?? 'دعوى');
    const caseNumber = row.caseNo || row.caseNumber || '';
    const title = courtName || docType || 'دعوى';
    const subtitle = caseNumber || (courtName ? docType : '');

    const { plaintiff: plaintiffName, defendant: defendantName } = extractPartyNames(
        (file as { parties?: unknown }).parties,
    );

    /*
     * شارة الحالة الذكية تأتي من `file.smartStatus` (محسوبة في `ArchivePortal`):
     * تحافظ على ألوان المؤقتات (أخضر/كهرماني/أحمر) عبر className دامج لـ bgColor + borderColor + color.
     */
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
            label: 'إعادة للأضابير النشطة',
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

    const partiesLineForCivil = plaintiffName || defendantName ? (
        <p className="text-gray-400 text-sm truncate">
            المدعي: <span className="text-gray-200">{plaintiffName || '—'}</span>
            {defendantName ? (
                <>
                    {' · '}
                    المدعى عليه: <span className="text-gray-200">{defendantName}</span>
                </>
            ) : null}
        </p>
    ) : null;

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
            subtitle={subtitle}
            bodyExtra={partiesLineForCivil}
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
