import { useState } from 'react';
import {
    JOIN_CO_OBJECTOR_LABEL,
    type JoinableGhayabiObjector,
} from '@/app/domain/lawsuit/joinGhayabiObjector';
import { GhayabiPartyChoiceList } from '../../modals/appealObjection/GhayabiPartyChoiceList';
import {
    GLASS_MODAL_HEADER,
    MoroccanCloseButton,
    MoroccanGlassShell,
    MoroccanHeaderDivider,
} from '../../smartFile/moroccanGlassShell';
import { CIVIL_LAWSUIT_TEST_IDS } from '../../smartFile/civilLawsuitTestIds';
import { SMART_FILE_FOOTER_CHIP } from './smartFileFooterChip';

export function JoinCoObjectorFooterControl({
    candidates,
    onJoin,
}: {
    candidates: JoinableGhayabiObjector[];
    onJoin: (partyId: string) => void;
}) {
    const [open, setOpen] = useState(false);
    if (candidates.length === 0) return null;

    return (
        <>
            <button
                type="button"
                data-testid={CIVIL_LAWSUIT_TEST_IDS.joinCoObjector}
                onClick={() => setOpen(true)}
                className={SMART_FILE_FOOTER_CHIP}
            >
                {JOIN_CO_OBJECTOR_LABEL}
            </button>
            {open ? (
                <MoroccanGlassShell
                    onOverlayClick={() => setOpen(false)}
                    overlayTestId={CIVIL_LAWSUIT_TEST_IDS.joinCoObjectorPicker}
                    maxWidth="max-w-md"
                >
                    <div className={GLASS_MODAL_HEADER}>
                        <h3 className="font-bold text-[14px] text-white/95">{JOIN_CO_OBJECTOR_LABEL}</h3>
                        <MoroccanCloseButton onClick={() => setOpen(false)} />
                        <MoroccanHeaderDivider />
                    </div>
                    <div className="p-5 space-y-3">
                        <p className="text-xs text-white/50 leading-relaxed">
                            يُضم الغائب المؤهل إلى مرحلة الاعتراض القائمة دون فتح إضبارة جديدة.
                        </p>
                        <GhayabiPartyChoiceList
                            parties={candidates}
                            value=""
                            onChange={(partyId) => {
                                onJoin(partyId);
                                setOpen(false);
                            }}
                            showWhenSingle
                            getOptionTestId={CIVIL_LAWSUIT_TEST_IDS.joinCoObjectorOption}
                            label="الغائبون المؤهلون"
                            labelClassName="block text-[11px] font-bold text-white/50 mb-1.5"
                        />
                    </div>
                </MoroccanGlassShell>
            ) : null}
        </>
    );
}
