import React from 'react';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import { RotateCcw } from '@/app/components/ui/icons/RotateCcw';
import { preloadActiveOrderFilePanel } from './DeferredActiveOrderFile';
import { UnifiedDossierCard } from './ArchivePortal/components/UnifiedDossierCard';
import { ArchiveDossierIdentityBlock } from './ArchivePortal/components/ArchiveDossierIdentityBlock';
import type { UrgentCase } from './Component_Urgent_Card.types';
import { buildUrgentCardPresentation } from './Component_Urgent_Card.presentation';

interface Props {
    case_data: UrgentCase;
    onCaseClick?: (caseId: string) => void;
    onTrash?: (caseId: string) => void;
    onRestore?: (caseId: string) => void;
    onPermanentDelete?: (caseId: string) => void;
    scope?: 'active' | 'archive' | 'trash';
}

const Component_Urgent_CardInner: React.FC<Props> = ({
    case_data,
    onCaseClick,
    onTrash,
    onRestore,
    onPermanentDelete,
    scope = 'active',
}) => {
    const { phaseLabel, metaRows, hearing, parties, statusBadgeClass } =
        buildUrgentCardPresentation(case_data);

    const footerIcons =
        scope === 'trash'
            ? [
                  {
                      id: 'restore',
                      label: 'استعادة',
                      icon: <RotateCcw size={16} />,
                      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
                          event.stopPropagation();
                          onRestore?.(case_data.id);
                      },
                      tone: 'default' as const,
                  },
                  {
                      id: 'delete',
                      label: 'حذف نهائي',
                      icon: <Trash2 size={16} />,
                      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
                          event.stopPropagation();
                          onPermanentDelete?.(case_data.id);
                      },
                      tone: 'danger' as const,
                  },
              ]
            : [
                  {
                      id: 'trash',
                      label: 'نقل إلى سلة المهملات',
                      icon: <Trash2 size={16} />,
                      onClick: (event: React.MouseEvent<HTMLButtonElement>) => {
                          event.stopPropagation();
                          onTrash?.(case_data.id);
                      },
                      tone: 'danger' as const,
                  },
              ];

    return (
        <div onPointerEnter={() => preloadActiveOrderFilePanel()}>
            <UnifiedDossierCard
                kind="urgent"
                statusBadge={{
                    label: phaseLabel || case_data.status,
                    className: statusBadgeClass,
                }}
                title={case_data.actionType}
                bodyExtra={
                    <ArchiveDossierIdentityBlock
                        hearing={hearing}
                        metaRows={metaRows}
                        parties={parties}
                        reserveHearingSlot={false}
                        metaLayout="grid"
                    />
                }
                onOpen={() => onCaseClick?.(case_data.id)}
                openLabel="فتح الطلب المستعجل"
                footerIcons={footerIcons}
                testId={`urgent-case-${case_data.id}`}
            />
        </div>
    );
};

export const Component_Urgent_Card = React.memo(Component_Urgent_CardInner);
