import React, { useState } from 'react';
import { getLocalTodayYmd } from '@/app/utils/localYmd';
import type { AbsentJudgmentNotificationModalProps } from '../../smartFile/modalFormTypes';
import { MoroccanGlassShell } from '../../smartFile/moroccanGlassShell';
import { SmartModalHeader, useSmartModalAccent } from '../../smartFile/smartModalChrome';
import { GhayabiPartyChoiceList } from './GhayabiPartyChoiceList';
import { CIVIL_LAWSUIT_TEST_IDS } from '../../smartFile/civilLawsuitTestIds';

function initialNoticePartyIds(parties: Array<{ partyId: string }>): string[] {
    return parties.length === 1 ? [parties[0]?.partyId ?? ''].filter(Boolean) : [];
}

export const AbsentJudgmentNotificationModal = ({
    isOpen,
    onClose,
    onConfirm,
    ghayabiParties = [],
}: AbsentJudgmentNotificationModalProps) => {
    const { T, required } = useSmartModalAccent();
    const [notificationDate, setNotificationDate] = useState(getLocalTodayYmd());
    const [partyIds, setPartyIds] = useState(() => initialNoticePartyIds(ghayabiParties));

    const ghayabiPartyIdsKey = ghayabiParties.map((row) => row.partyId).join(',');
    React.useEffect(() => {
        if (!isOpen) return;
        setNotificationDate(getLocalTodayYmd());
        setPartyIds(initialNoticePartyIds(ghayabiParties));
    }, [isOpen, ghayabiPartyIdsKey]);

    const needsPartyChoice = ghayabiParties.length > 0;
    const canSave = Boolean(notificationDate) && (!needsPartyChoice || partyIds.length > 0);
    const multiple = ghayabiParties.length > 0;

    const handleSubmit = () => {
        if (!canSave) return;
        onConfirm({
            notificationDate,
            partyIds,
            ...(partyIds[0] ? { partyId: partyIds[0] } : {}),
        });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <MoroccanGlassShell
            onOverlayClick={onClose}
            maxWidth="max-w-lg"
            overlayTestId={CIVIL_LAWSUIT_TEST_IDS.absentJudgmentNoticePicker}
        >
            <SmartModalHeader title="التبليغ بالحكم الغيابي" onClose={onClose} />
            <div className={T.body}>
                <GhayabiPartyChoiceList
                    parties={ghayabiParties}
                    values={partyIds}
                    onChange={(partyId) => {
                        setPartyIds((prev) =>
                            prev.includes(partyId)
                                ? prev.filter((id) => id !== partyId)
                                : [...prev, partyId],
                        );
                    }}
                    multiple={multiple}
                    showWhenSingle={ghayabiParties.length === 1}
                    getOptionTestId={CIVIL_LAWSUIT_TEST_IDS.absentJudgmentNoticeOption}
                    label={ghayabiParties.length > 1 ? 'المدعى عليهم الغائبون' : 'المدعى عليه الغائب'}
                    labelClassName={T.label}
                    required={needsPartyChoice}
                    requiredClassName={required}
                />
                <div>
                    <label className={T.label}>
                        تاريخ التبليغ <span className={required}>*</span>
                    </label>
                    <input
                        type="date"
                        value={notificationDate}
                        onChange={(e) => setNotificationDate(e.target.value)}
                        className={T.field}
                    />
                </div>
                <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSave}
                    className={`${T.btn} ${T.btnDisabled}`}
                >
                    حفظ التبليغ
                </button>
            </div>
        </MoroccanGlassShell>
    );
};
