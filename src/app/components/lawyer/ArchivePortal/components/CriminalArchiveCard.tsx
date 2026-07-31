import React from 'react';
import { Trash2 } from 'lucide-react';
import { prefetchCriminalDashboard } from '@/app/utils/lazyComponentsIntent';
import { WorkspacePinButton } from '@/app/workspace/WorkspacePinButton';
import { buildCriminalWorkspacePin } from '@/app/workspace/workspacePinBuilders';
import { criminalCaseReference,
    criminalStageBadgeClass,
    criminalStageLabel,
} from '../criminalArchiveUtils';
import { CRIMINAL_DOSSIER_TEST_IDS } from '@/app/components/lawyer/criminal-system/criminalDossierTestIds';
import { UnifiedDossierCard } from './UnifiedDossierCard';
import { resolveCriminalArchiveHearingDisplay } from '../utils/criminalArchiveHearing';
import { ArchiveDossierIdentityBlock } from './ArchiveDossierIdentityBlock';

export type CriminalArchiveCardProps = {
    record: Record<string, unknown>;
    variant: 'grid' | 'compact';
    onOpen: () => void;
    onDelete?: () => void;
};

export const CriminalArchiveCard: React.FC<CriminalArchiveCardProps> = ({
    record,
    variant,
    onOpen,
    onDelete,
}) => {
    const ref = criminalCaseReference(record);
    const stage = String((record.basics as { stage?: string } | undefined)?.stage ?? '');
    const basics = (record.basics && typeof record.basics === 'object' ? record.basics : {}) as Record<
        string,
        unknown
    >;
    const legalArticle = String(basics.legalArticle ?? '').trim();
    const crimeType = String(basics.crimeType ?? '').trim();
    const complainantName = String(
        (record.complainants as { fullName?: string }[] | undefined)?.[0]?.fullName ?? '',
    ).trim();
    const defendants = Array.isArray(record.defendants) ? record.defendants : [];
    const primaryDefendantName = String(
        (defendants[0] as { fullName?: string } | undefined)?.fullName ?? '',
    ).trim();
    const complainantIsClient = Boolean(
        (record.complainants as { isOfficeClient?: boolean }[] | undefined)?.[0]?.isOfficeClient,
    );
    const defendantIsClient = Boolean(
        (defendants[0] as { isOfficeClient?: boolean } | undefined)?.isOfficeClient,
    );
    const isUnknown = Boolean(record.unknownDefendant);
    const pinPayload = buildCriminalWorkspacePin(record);
    const stageText = criminalStageLabel(stage, record) || '—';
    const hearingDisplay = resolveCriminalArchiveHearingDisplay(record);

    const metaRows = [
        ref.secondary &&
        ref.secondary !== '—' &&
        ref.secondary !== ref.primary
            ? { label: 'رقم الإضبارة', value: ref.secondary }
            : null,
        legalArticle ? { label: 'المادة', value: legalArticle } : null,
        crimeType ? { label: 'نوع الجريمة', value: crimeType } : null,
    ].filter((row): row is { label: string; value: string } => row !== null);

    const complainantParty =
        complainantName
            ? {
                  name: complainantName,
                  role: 'الشاكي',
                  isClient: complainantIsClient,
              }
            : null;

    const defendantParty = isUnknown
        ? { name: 'مجهول', role: 'المتهم', isClient: false }
        : primaryDefendantName
          ? {
                name: primaryDefendantName,
                role: 'المتهم',
                isClient: defendantIsClient,
            }
          : null;

    if (variant === 'compact') {
        return (
            <button
                type="button"
                data-testid={CRIMINAL_DOSSIER_TEST_IDS.caseCard(String(record.id))}
                onClick={onOpen}
                onPointerEnter={() => prefetchCriminalDashboard()}
                onFocus={() => prefetchCriminalDashboard()}
                className="w-full text-right rounded-xl border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all duration-300 p-3 flex items-start gap-3"
            >
                <span className="shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-gray-300">
                    جزائية
                </span>
                <span className="min-w-0 flex-1">
                    <span className="block text-[12px] font-bold text-white truncate">{ref.primary}</span>
                    <span className="block text-[10px] text-white/45 mt-0.5 truncate">
                        {ref.secondary}
                        {complainantName ? ` · ${complainantName}` : ''}
                    </span>
                </span>
                <span
                    className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-bold ${criminalStageBadgeClass(stage)}`}
                >
                    {stageText}
                </span>
            </button>
        );
    }

    return (
        <div onPointerEnter={() => prefetchCriminalDashboard()} onFocus={() => prefetchCriminalDashboard()}>
        <UnifiedDossierCard
            kind="criminal"
            statusBadge={{
                label: stageText,
                className: criminalStageBadgeClass(stage),
            }}
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
            title={ref.primary}
            bodyExtra={
                <ArchiveDossierIdentityBlock
                    hearing={hearingDisplay}
                    metaRows={metaRows}
                    parties={
                        complainantParty || defendantParty
                            ? {
                                  left: complainantParty,
                                  right: defendantParty,
                                  leftTone: 'plaintiff',
                                  rightTone: 'defendant',
                              }
                            : null
                    }
                />
            }
            onOpen={onOpen}
            openLabel="فتح الإضبارة"
            testId={CRIMINAL_DOSSIER_TEST_IDS.caseCard(String(record.id))}
            footerIcons={
                onDelete
                    ? [
                          {
                              id: 'delete',
                              label: 'نقل إلى سلة المهملات',
                              icon: <Trash2 size={16} />,
                              tone: 'danger',
                              onClick: () => onDelete(),
                              testId: 'criminal-card-delete',
                          },
                      ]
                    : []
            }
        />
        </div>
    );
};
