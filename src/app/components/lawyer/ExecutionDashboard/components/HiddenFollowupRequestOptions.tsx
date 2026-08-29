import React from 'react';
import { Building2 } from '@/app/components/ui/icons/Building2';
import { Gavel } from '@/app/components/ui/icons/Gavel';
import { Hammer } from '@/app/components/ui/icons/Hammer';
import { Package } from '@/app/components/ui/icons/Package';
import { Plane } from '@/app/components/ui/icons/Plane';
import { Scale } from '@/app/components/ui/icons/Scale';
import { Shield } from '@/app/components/ui/icons/Shield';
import { ShieldAlert } from '@/app/components/ui/icons/ShieldAlert';
import { UserX } from '@/app/components/ui/icons/UserX';
import { Wallet } from '@/app/components/ui/icons/Wallet';
import type { HamiIcon } from '@/app/components/ui/icons/hamiIcon';
import { HiddenGuarantorRequestOptions } from './HiddenGuarantorRequestOptions';
import { HiddenBreakInventoryRequestOptions } from './HiddenBreakInventoryRequestOptions';
import { HiddenPersonalCoerciveRequestOptions } from './HiddenPersonalCoerciveRequestOptions';
import {
    hasAnyHiddenFollowupContent,
    listHiddenGuarantorCatalog,
    listHiddenPersonalCoerciveCatalog,
    shouldShowHiddenBreakInventoryRequest,
    type HiddenFollowupVisibilityInput,
    type HiddenGuarantorContext,
    type HiddenGuarantorRequestKey,
    type HiddenPersonalCoerciveRequestKey,
} from './hiddenFollowupRequestsUtils';
import type { HiddenGuarantorRequestOptionsProps } from './HiddenGuarantorRequestOptions';
import type { HiddenPersonalCoerciveRequestOptionsProps } from './HiddenPersonalCoerciveRequestOptions';
import type { ExecutionDomainContext } from '@/app/utils/executionDomainIsolation';
import {
    HiddenFollowupBackButton,
    HiddenFollowupCatalogGrid,
    HiddenFollowupCatalogPickerButton,
    HiddenFollowupEmptyState,
} from './hiddenFollowup/shared';

export interface HiddenFollowupRequestOptionsProps {
    executionId: string;
    breakDecisions: Record<string, unknown>[];
    domainContext?: ExecutionDomainContext | null;
    flags: HiddenFollowupVisibilityInput;
    personal: Omit<
        HiddenPersonalCoerciveRequestOptionsProps,
        'flags' | 'embeddedSelectedKey' | 'executionId' | 'decisions'
    >;
    guarantor: Omit<
        HiddenGuarantorRequestOptionsProps,
        'flags' | 'guarantorCtx' | 'embeddedSelectedKey' | 'executionId'
    >;
    guarantorCtx: HiddenGuarantorContext;
}

type HiddenSelection =
    | { type: 'break' }
    | { type: 'personal'; key: HiddenPersonalCoerciveRequestKey }
    | { type: 'guarantor'; key: HiddenGuarantorRequestKey };

const PERSONAL_ICONS: Record<
    HiddenPersonalCoerciveRequestKey,
    HamiIcon
> = {
    forced_bring_in: UserX,
    travel_ban: Plane,
    arrest_warrant_investigation: ShieldAlert,
    executive_dossier_presentation: Scale,
    executive_detention_judge: Gavel,
};

const GUARANTOR_ICONS: Record<
    HiddenGuarantorRequestKey,
    HamiIcon
> = {
    guarantor_request: Shield,
    guarantor_seizure_salary: Wallet,
    guarantor_seizure_property: Building2,
    guarantor_seizure_movable: Package,
};

function selectionMatches(a: HiddenSelection, b: HiddenSelection): boolean {
    if (a.type !== b.type) return false;
    if (a.type === 'break') return true;
    if (a.type === 'personal' && b.type === 'personal') return a.key === b.key;
    if (a.type === 'guarantor' && b.type === 'guarantor') return a.key === b.key;
    return false;
}

export const HiddenFollowupRequestOptions: React.FC<HiddenFollowupRequestOptionsProps> = ({
    executionId: executionIdProp,
    breakDecisions,
    domainContext = null,
    flags,
    personal,
    guarantor,
    guarantorCtx,
}) => {
    const [selection, setSelection] = React.useState<HiddenSelection | null>(null);

    const personalCatalog = React.useMemo(
        () => listHiddenPersonalCoerciveCatalog(flags, domainContext),
        [flags, domainContext]
    );
    const guarantorCatalog = React.useMemo(
        () => listHiddenGuarantorCatalog(flags, guarantorCtx, domainContext),
        [flags, guarantorCtx, domainContext]
    );
    const showBreak = shouldShowHiddenBreakInventoryRequest(flags, domainContext);

    const pickerButtons = React.useMemo(() => {
        const items: Array<{
            id: string;
            label: string;
            Icon: HamiIcon;
            selection: HiddenSelection;
        }> = [];

        if (showBreak) {
            items.push({
                id: 'break',
                label: 'كسر الأقفال',
                Icon: Hammer,
                selection: { type: 'break' },
            });
        }
        for (const item of personalCatalog) {
            items.push({
                id: `pc-${item.key}`,
                label: item.shortLabel,
                Icon: PERSONAL_ICONS[item.key],
                selection: { type: 'personal', key: item.key },
            });
        }
        for (const item of guarantorCatalog) {
            items.push({
                id: `gu-${item.key}`,
                label: item.shortLabel,
                Icon: GUARANTOR_ICONS[item.key],
                selection: { type: 'guarantor', key: item.key },
            });
        }
        return items;
    }, [guarantorCatalog, personalCatalog, showBreak]);

    const activeButton = React.useMemo(
        () =>
            selection
                ? pickerButtons.find((btn) => selectionMatches(btn.selection, selection))
                : null,
        [pickerButtons, selection]
    );

    const hasContent = hasAnyHiddenFollowupContent(flags, guarantorCtx, domainContext);
    const executionId = String(executionIdProp || '').trim();

    if (!hasContent) {
        return (
            <HiddenFollowupEmptyState message="لا توجد طلبات مخفية في هذا المسار حالياً — كل الإجراءات ظاهرة في تبويباتها المعتادة." />
        );
    }

    if (!selection) {
        return (
            <div className="space-y-2">
                <p className="text-[9px] font-bold text-emerald-300/80">
                    اختر نوع الطلب — تظهر تفاصيله بعد الضغط
                </p>
                <HiddenFollowupCatalogGrid>
                    {pickerButtons.map(({ id, label, Icon, selection: nextSelection }) => (
                        <HiddenFollowupCatalogPickerButton
                            key={id}
                            label={label}
                            Icon={Icon}
                            onClick={() => setSelection(nextSelection)}
                        />
                    ))}
                </HiddenFollowupCatalogGrid>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            <HiddenFollowupBackButton
                onClick={() => setSelection(null)}
                label="رجوع إلى قائمة الطلبات"
                withChevron
            />

            {activeButton ? (
                <p className="text-[11px] font-bold text-emerald-100/95">{activeButton.label}</p>
            ) : null}

            {selection.type === 'break' ? (
                <HiddenBreakInventoryRequestOptions
                    flags={flags}
                    executionId={executionId}
                    decisions={breakDecisions}
                    coerciveUiLocked={personal.coerciveUiLocked}
                    isHistoricalMode={personal.isHistoricalMode}
                    showToast={personal.showToast}
                    onOpenDecisions={personal.onOpenDecisions}
                    embedded
                />
            ) : null}

            {selection.type === 'personal' ? (
                <HiddenPersonalCoerciveRequestOptions
                    executionId={executionId}
                    flags={flags}
                    domainContext={domainContext}
                    embeddedSelectedKey={selection.key}
                    decisions={breakDecisions}
                    {...personal}
                />
            ) : null}

            {selection.type === 'guarantor' ? (
                <HiddenGuarantorRequestOptions
                    executionId={executionId}
                    flags={flags}
                    guarantorCtx={guarantorCtx}
                    domainContext={domainContext}
                    embeddedSelectedKey={selection.key}
                    {...guarantor}
                />
            ) : null}
        </div>
    );
};
