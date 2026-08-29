import React, { useState } from 'react';
import { Edit2 } from '@/app/components/ui/icons/Edit2';
import { X } from '@/app/components/ui/icons/X';
import type { Party } from '../../LawyerShared';
import { partitionPartiesForHeader } from '../smartFile/partyRoleClassification';
import type { EditCaseInfoModalProps } from '../smartFile/modalFormTypes';
import {
    buildEditCaseSaveData,
    updateEditCasePartyField,
    type EditCaseParty,
} from './editCaseInfoHelpers';
import {
    EditCaseInfoCaseFields,
    EditCaseInfoCrossAppealToggle,
    EditCaseInfoPartiesSection,
} from './EditCaseInfoSections';

export const EditCaseInfoModal = ({ isOpen, onClose, formData, onSave }: EditCaseInfoModalProps) => {
    const [caseNo, setCaseNo] = useState('');
    const [court, setCourt] = useState('');
    const [judge, setJudge] = useState('');
    const [stageName, setStageName] = useState('');
    const [extraordinaryType, setExtraordinaryType] = useState('');
    const [caseType, setCaseType] = useState('');
    const [hasCrossAppeal, setHasCrossAppeal] = useState(false);
    const [firstInstanceCaseNumber, setFirstInstanceCaseNumber] = useState('');
    const [firstInstanceCourt, setFirstInstanceCourt] = useState('');
    const [appealCaseNumber, setAppealCaseNumber] = useState('');
    const [appealCourtName, setAppealCourtName] = useState('');
    const [thirdParties, setThirdParties] = useState<unknown[]>([]);
    const [representedParty, setRepresentedParty] = useState<string | null>(null);
    const [plaintiffs, setPlaintiffs] = useState<EditCaseParty[]>([]);
    const [defendants, setDefendants] = useState<EditCaseParty[]>([]);
    const [preservedExtraParties, setPreservedExtraParties] = useState<Party[]>([]);

    React.useEffect(() => {
        if (!isOpen || !formData) return;

        setCaseNo(formData.caseNo || '');
        setCourt(formData.court || '');
        setJudge(formData.judge || '');
        setStageName(formData.stageName || 'البداءة');
        setExtraordinaryType(formData.extraordinaryType || '');
        setCaseType(formData.docType || formData.type || '');
        setHasCrossAppeal(formData.hasCrossAppeal || false);

        setFirstInstanceCaseNumber(formData.firstInstanceCaseNumber || '');
        setFirstInstanceCourt(formData.firstInstanceCourt || '');

        setAppealCaseNumber(formData.appealCaseNumber || '');
        setAppealCourtName(formData.appealCourtName || '');

        setThirdParties(formData.thirdParties || []);

        setRepresentedParty(formData.representedParty || null);

        const allParties = (formData.parties || []).map((p: EditCaseParty) => ({
            ...p,
            lawyers: p.lawyers ? p.lawyers.map((l) => ({ ...l })) : [],
        }));

        const { plaintiffs: pList, defendants: dList, interpleaders } = partitionPartiesForHeader(
            allParties as Party[],
        );
        setPreservedExtraParties(interpleaders);

        let nextPlaintiffs = pList as EditCaseParty[];
        let nextDefendants = dList as EditCaseParty[];

        if (nextPlaintiffs.length === 0 && nextDefendants.length === 0) {
            if (allParties.length > 0) nextPlaintiffs = [allParties[0]];
            if (allParties.length > 1) nextDefendants = allParties.slice(1);
        }

        if (nextPlaintiffs.length === 0) nextPlaintiffs = [{ name: '', role: 'plaintiff' }];
        if (nextDefendants.length === 0) nextDefendants = [{ name: '', role: 'defendant' }];

        setPlaintiffs(nextPlaintiffs);
        setDefendants(nextDefendants);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- sync only on open
    }, [isOpen]);

    const handleRemoveParty = (type: 'plaintiff' | 'defendant', index: number) => {
        if (type === 'plaintiff') {
            if (plaintiffs.length <= 1) return;
            setPlaintiffs(plaintiffs.filter((_, i) => i !== index));
        } else {
            if (defendants.length <= 1) return;
            setDefendants(defendants.filter((_, i) => i !== index));
        }
    };

    const handleUpdateParty = (type: 'plaintiff' | 'defendant', index: number, field: string, value: unknown) => {
        const list = type === 'plaintiff' ? plaintiffs : defendants;
        const setter = type === 'plaintiff' ? setPlaintiffs : setDefendants;
        const opposingList = type === 'plaintiff' ? defendants : plaintiffs;
        const next = updateEditCasePartyField(list, index, field, value, type, opposingList, setRepresentedParty);
        if (next) setter(next);
    };

    const handleSubmit = () => {
        const saveData = buildEditCaseSaveData({
            caseNo,
            court,
            judge,
            stageName,
            extraordinaryType,
            caseType,
            hasCrossAppeal,
            firstInstanceCaseNumber,
            firstInstanceCourt,
            appealCaseNumber,
            appealCourtName,
            thirdParties,
            representedParty,
            plaintiffs,
            defendants,
            preservedExtraParties,
        });
        onSave(saveData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 font-['Tajawal']">
            <div
                className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide rounded-2xl border border-white/12 shadow-[0_8px_22px_rgba(0,0,0,0.22)]"
                style={{
                    background:
                        'radial-gradient(circle at top, rgba(230,198,115,0.1), transparent 40%), linear-gradient(180deg, rgba(14,20,34,0.94), rgba(8,12,22,0.97))',
                    backdropFilter: 'blur(20px)',
                }}
            >
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-white/[0.04] px-4 py-3.5 backdrop-blur-sm">
                    <h3 className="font-bold text-[#E6C673] flex items-center gap-2 text-sm">
                        <Edit2 size={16} /> تعديل بيانات الدعوى
                    </h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white transition-colors"
                        aria-label="إغلاق"
                    >
                        <X size={18} />
                    </button>
                </div>

                <div className="p-4 sm:p-5 space-y-4">
                    <EditCaseInfoCaseFields
                        stageName={stageName}
                        caseNo={caseNo}
                        setCaseNo={setCaseNo}
                        court={court}
                        setCourt={setCourt}
                        caseType={caseType}
                        setCaseType={setCaseType}
                        judge={judge}
                        setJudge={setJudge}
                        firstInstanceCaseNumber={firstInstanceCaseNumber}
                        firstInstanceCourt={firstInstanceCourt}
                    />

                    <EditCaseInfoPartiesSection
                        plaintiffs={plaintiffs}
                        defendants={defendants}
                        handleRemoveParty={handleRemoveParty}
                        handleUpdateParty={handleUpdateParty}
                    />

                    <EditCaseInfoCrossAppealToggle
                        stageName={stageName}
                        hasCrossAppeal={hasCrossAppeal}
                        setHasCrossAppeal={setHasCrossAppeal}
                    />

                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="w-full rounded-xl border border-[#E6C673]/40 bg-[linear-gradient(155deg,rgba(230,198,115,0.35),rgba(11,16,33,0.55)_48%,rgba(201,162,39,0.22))] py-3.5 text-sm font-bold text-[#F8F1DE] shadow-[inset_0_1px_0_rgba(255,249,230,0.2),0_10px_28px_rgba(0,0,0,0.3)] backdrop-blur-sm transition-all hover:border-[#E6C673]/55"
                    >
                        حفظ التغييرات
                    </button>
                </div>
            </div>
        </div>
    );
};
