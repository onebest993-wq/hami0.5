import React, { useState } from 'react';
import {
    ArrowRightLeft,
    Edit2,
    X,
} from '@/app/components/ui/lucideIcons';
import { getLegalRole, type Party } from '../../LawyerShared';
import {
    classifyPartySideBucket,
    dedupePartiesList,
    partitionPartiesForHeader,
} from '../smartFile/partyRoleClassification';
import type { EditCaseInfoModalProps } from '../smartFile/modalFormTypes';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { getLegalRoleTitle } from '../smartFile/legalRoleTitle';


export const EditCaseInfoModal = ({ isOpen, onClose, formData, onSave }: EditCaseInfoModalProps) => {
    const [caseNo, setCaseNo] = useState('');
    const [court, setCourt] = useState('');
    const [judge, setJudge] = useState('');
    const [stageName, setStageName] = useState(''); // This acts as baseStage
    const [extraordinaryType, setExtraordinaryType] = useState(''); // New State for Appeal Type
    const [caseType, setCaseType] = useState('');
    const [hasCrossAppeal, setHasCrossAppeal] = useState(false);
    
    // 🎯 CRITICAL: First Instance Data Preservation for Appeal Stage
    const [firstInstanceCaseNumber, setFirstInstanceCaseNumber] = useState('');
    const [firstInstanceCourt, setFirstInstanceCourt] = useState('');
    
    // 🆕 APPEAL DATA
    const [appealCaseNumber, setAppealCaseNumber] = useState('');
    const [appealCourtName, setAppealCourtName] = useState('');
    
    // 🆕 THIRD PARTIES DATA
    const [thirdParties, setThirdParties] = useState<any[]>([]);
    
    // 🆕 Represented Party
    const [representedParty, setRepresentedParty] = useState<string | null>(null);

    const [plaintiffs, setPlaintiffs] = useState<any[]>([]);
    const [defendants, setDefendants] = useState<any[]>([]);
    const [preservedExtraParties, setPreservedExtraParties] = useState<Party[]>([]);

    // 🛡️ AUTO-CALCULATE LEGAL ROLE (based on stage name)
    // calculateLegalRole removed in favor of getLegalRole from LawyerShared

    // Load once when the modal opens — do not depend on formData identity
    // (parent passes a fresh object each render and would wipe in-progress edits).
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

        const allParties = (formData.parties || []).map((p: any) => ({
            ...p,
            lawyers: p.lawyers ? p.lawyers.map((l: any) => ({ ...l })) : [],
        }));

        const { plaintiffs: pList, defendants: dList, interpleaders } = partitionPartiesForHeader(
            allParties as Party[],
        );
        setPreservedExtraParties(interpleaders);

        let nextPlaintiffs = pList;
        let nextDefendants = dList;

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
    
    const handleAddParty = (type: 'plaintiff' | 'defendant') => {
        const activeStage = extraordinaryType || stageName;
        const currentList = type === 'plaintiff' ? plaintiffs : defendants;
        // 🚀 AUTO-INHERIT ROLE: If group has members, new member inherits the first member's role
        const inheritedRole = currentList.length > 0 ? currentList[0].role : (type === 'plaintiff' ? 'مدعي' : 'مدعى عليه');

        const newParty = { 
            name: '', 
            address: '', 
            phone: '',
            lawyerName: '',
            lawyerPhone: '',
            lawyers: [{ name: '', phone: '' }],
            // 🆕 New Lawyer Structure
            lawyer: { name: '', phone: '', isMyOffice: false }, 
            role: inheritedRole,
            legalRole: getLegalRole(activeStage, type === 'plaintiff' ? 1 : 2, 1)
        };
        if (type === 'plaintiff') setPlaintiffs([...plaintiffs, newParty]);
        else setDefendants([...defendants, newParty]);
    };

    const handleRemoveParty = (type: 'plaintiff' | 'defendant', index: number) => {
        if (type === 'plaintiff') {
            if (plaintiffs.length <= 1) return; // Prevent deleting last one
            setPlaintiffs(plaintiffs.filter((_, i) => i !== index));
        } else {
            if (defendants.length <= 1) return; // Prevent deleting last one
            setDefendants(defendants.filter((_, i) => i !== index));
        }
    };

    const handleUpdateParty = (type: 'plaintiff' | 'defendant', index: number, field: string, value: any) => {
        const list = type === 'plaintiff' ? plaintiffs : defendants;
        const setter = type === 'plaintiff' ? setPlaintiffs : setDefendants;
        
        // 🛡️ IMMUTABLE UPDATE PATTERN
        let newList = list.map((item, i) => {
            if (i !== index) return item;
            
            const newItem = { ...item };
            
            // Handle Legacy Lawyer Fields
            if (field === 'lawyerName' || field === 'lawyerPhone') {
                 const currentLawyer = newItem.lawyers?.[0] || { name: '', phone: '' };
                 const newLawyer = { ...currentLawyer };
                 
                 if (field === 'lawyerName') newLawyer.name = value;
                 if (field === 'lawyerPhone') newLawyer.phone = value;
                 
                 newItem.lawyers = [newLawyer];
                 newItem[field] = value; 
                 
                 // Sync with new structure
                 if (!newItem.lawyer) newItem.lawyer = { name: '', phone: '', isMyOffice: false };
                 if (field === 'lawyerName') newItem.lawyer.name = value;
                 if (field === 'lawyerPhone') newItem.lawyer.phone = value;
            } 
            // Handle New Lawyer Structure
            else if (field.startsWith('lawyer.')) {
                if (!newItem.lawyer) newItem.lawyer = { name: '', phone: '', isMyOffice: false };
                
                const key = field.split('.')[1]; // name, phone, or isMyOffice
                
                // 🛑 Conflict of Interest Check
                if (key === 'isMyOffice' && value === true) {
                    // Check if opposing side has "My Office" checked
                    const opposingList = type === 'plaintiff' ? defendants : plaintiffs;
                    const hasConflict = opposingList.some(p => p.lawyer?.isMyOffice || p.isClient);
                    
                    if (hasConflict) {
                        SmartToast.error("⚠️ تعارض مصالح: لا يمكن تمثيل الطرفين في نفس الدعوى!");
                        return item; // Abort update
                    }
                    
                    // Auto-mark as client
                    newItem.isClient = true;
                    
                    // 🛡️ Set Represented Party
                    setRepresentedParty(type === 'plaintiff' ? 'المدعي' : 'المدعى عليه');
                } else if (key === 'isMyOffice' && value === false) {
                     // If unchecking, and this was the only client, should we set representedParty to null?
                     // Let's check if there are any other clients for this side.
                     // But for now, just unset isClient.
                     newItem.isClient = false;
                     // We don't unset representedParty here because another party on the same side might still be client.
                     // But if we want perfect sync, we can re-evaluate on save.
                }
                
                newItem.lawyer = { ...newItem.lawyer, [key]: value };
                
                // Sync legacy fields
                if (key === 'name') {
                    newItem.lawyerName = value;
                    if (!newItem.lawyers || newItem.lawyers.length === 0) newItem.lawyers = [{}];
                    newItem.lawyers[0].name = value;
                }
                if (key === 'phone') {
                    newItem.lawyerPhone = value;
                    if (!newItem.lawyers || newItem.lawyers.length === 0) newItem.lawyers = [{}];
                    newItem.lawyers[0].phone = value;
                }
            }
            else {
                 newItem[field] = value;
            }
            return newItem;
        });
        
        // Legal roles are locked — ignore role edits from any leftover callers
        if (field === 'role' || field === 'legalRole') {
            return;
        }

        setter(newList);
    };

    const handleSubmit = () => {
        const activeStage = extraordinaryType || stageName;

        const normalizeSideForSave = (list: typeof plaintiffs, side: 1 | 2) => {
            const named = list.filter((p) => String(p.name ?? '').trim());
            const source = named.length > 0 ? named : list.slice(0, 1);
            const count = named.length > 0 ? named.length : source.length;
            const role = getLegalRole(activeStage, side, count, extraordinaryType || undefined);
            return source.map((p) => ({
                ...p,
                role,
                legalRole: role,
                side: side === 1 ? ('right' as const) : ('left' as const),
                ...(p.lawyer?.isMyOffice === false
                    ? { isClient: false, lawyer: { ...p.lawyer, isMyOffice: false } }
                    : {}),
            }));
        };

        const updatedPlaintiffs = normalizeSideForSave(plaintiffs, 1);
        const updatedDefendants = normalizeSideForSave(defendants, 2);

        const allParties = dedupePartiesList([
            ...updatedPlaintiffs,
            ...updatedDefendants,
            ...preservedExtraParties,
        ] as Party[]);

        const clientParty = allParties.find((p) => p.isClient || p.lawyer?.isMyOffice);
        const resolvedRepresentedParty = clientParty
            ? (() => {
                  const bucket = classifyPartySideBucket(clientParty);
                  if (bucket === 'plaintiff') return 'المدعي';
                  if (bucket === 'defendant') return 'المدعى عليه';
                  return representedParty;
              })()
            : null;

        const saveData: any = {
            caseNo,
            court,
            judge,
            stageName,
            extraordinaryType,
            type: caseType,
            parties: allParties,
            thirdParties: thirdParties,
            hasCrossAppeal: hasCrossAppeal,
            representedParty: resolvedRepresentedParty,
            appealCaseNumber,
            appealCourtName
        };

        // If in appeal stage, preserve First Instance data
        if (stageName?.includes('استئناف')) {
            saveData.firstInstanceCaseNumber = firstInstanceCaseNumber;
            saveData.firstInstanceCourt = firstInstanceCourt;
        }

        onSave(saveData);
        onClose();
    };

    if (!isOpen) return null;

    const glassField =
        'w-full rounded-xl border border-white/10 bg-white/[0.05] backdrop-blur-sm px-3 py-2.5 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-[#E6C673]/45 focus:ring-1 focus:ring-[#E6C673]/15';
    const glassLabel = 'mb-1.5 block text-[10px] font-bold text-white/45';

    return (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/70 backdrop-blur-md p-4 font-['Tajawal']">
            <div
                className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide rounded-2xl border border-white/12 shadow-[0_24px_60px_rgba(0,0,0,0.45)]"
                style={{
                    background:
                        'radial-gradient(circle at top, rgba(230,198,115,0.1), transparent 40%), linear-gradient(180deg, rgba(14,20,34,0.94), rgba(8,12,22,0.97))',
                    backdropFilter: 'blur(20px)',
                }}
            >
                <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-white/[0.04] px-4 py-3.5 backdrop-blur-xl">
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
                
                <div className="p-5 sm:p-6 space-y-6">
                    <div className="space-y-4 border-b border-white/[0.06] pb-5">
                        <h4 className="text-[#E6C673] text-sm font-bold">بيانات الدعوى</h4>

                        {stageName?.includes('استئناف') && (
                            <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3">
                                <h5 className="text-xs font-bold text-white/50">بيانات مرحلة البداءة (محفوظة)</h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className={glassLabel}>رقم دعوى البداءة</label>
                                        <input 
                                            type="text" 
                                            value={firstInstanceCaseNumber} 
                                            readOnly
                                            className={`${glassField} opacity-70 cursor-default`}
                                            dir="ltr"
                                        />
                                    </div>
                                    <div>
                                        <label className={glassLabel}>محكمة البداءة</label>
                                        <input 
                                            type="text" 
                                            value={firstInstanceCourt} 
                                            readOnly
                                            className={`${glassField} opacity-70 cursor-default`}
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className={glassLabel}>
                                    {stageName?.includes('استئناف') ? 'رقم دعوى الاستئناف' : 'رقم الدعوى'}
                                </label>
                                <input 
                                    type="text" 
                                    value={caseNo} 
                                    onChange={e => setCaseNo(e.target.value)} 
                                    className={`${glassField} text-right`}
                                    dir="ltr" 
                                />
                            </div>
                            <div>
                                <label className={glassLabel}>
                                    {stageName?.includes('استئناف') ? 'محكمة الاستئناف' : 'المحكمة المختصة'}
                                </label>
                                <input 
                                    type="text" 
                                    value={court} 
                                    onChange={e => setCourt(e.target.value)} 
                                    className={glassField}
                                />
                            </div>
                            <div>
                                <label className={glassLabel}>نوع الدعوى</label>
                                <input type="text" value={caseType} onChange={e => setCaseType(e.target.value)} className={glassField} />
                            </div>
                            <div>
                                <label className={glassLabel}>اسم القاضي</label>
                                <input type="text" value={judge} onChange={e => setJudge(e.target.value)} className={glassField} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-5">
                        <h4 className="text-[#E6C673] text-sm font-bold">أطراف الدعوى</h4>
                        
                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                            {plaintiffs.length > 0 && (
                                <div className="flex justify-center w-full mb-4">
                                  <span className="text-xl font-extrabold text-[#E6C673] tracking-wide">
                                    {getLegalRoleTitle(plaintiffs[0].role, plaintiffs.length)}
                                  </span>
                                </div>
                            )}
                            
                            <div className="space-y-5">
                                {plaintiffs.map((party, index) => (
                                    <div key={index} className="relative space-y-3 pt-4 border-t border-white/5 first:border-0 first:pt-0">
                                        {index > 0 && (
                                            <button type="button" onClick={() => handleRemoveParty('plaintiff', index)} className="absolute left-0 top-0 text-red-400 hover:text-red-300 p-1">
                                                <X size={14} />
                                            </button>
                                        )}
                                        
                                        <div>
                                            <label className={glassLabel}>الاسم الكامل {plaintiffs.length > 1 ? `(${index + 1})` : ''}</label>
                                            <input 
                                                type="text" 
                                                value={party.name || ''} 
                                                onChange={e => handleUpdateParty('plaintiff', index, 'name', e.target.value)} 
                                                className={glassField}
                                            />
                                        </div>
                                        <div>
                                            <label className={glassLabel}>العنوان</label>
                                            <input 
                                                type="text" 
                                                value={party.address || ''} 
                                                onChange={e => handleUpdateParty('plaintiff', index, 'address', e.target.value)} 
                                                className={glassField}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
                            {defendants.length > 0 && (
                                <div className="flex justify-center w-full mb-4">
                                  <span className="text-xl font-extrabold text-rose-300/90 tracking-wide">
                                    {getLegalRoleTitle(defendants[0].role, defendants.length)} 
                                  </span>
                                </div>
                            )}
                            
                            <div className="space-y-5">
                                {defendants.map((party, index) => (
                                    <div key={index} className="relative space-y-3 pt-4 border-t border-white/5 first:border-0 first:pt-0">
                                        {index > 0 && (
                                            <button type="button" onClick={() => handleRemoveParty('defendant', index)} className="absolute left-0 top-0 text-red-400 hover:text-red-300 p-1">
                                                <X size={14} />
                                            </button>
                                        )}

                                        <div>
                                            <label className={glassLabel}>الاسم الكامل {defendants.length > 1 ? `(${index + 1})` : ''}</label>
                                            <input 
                                                type="text" 
                                                value={party.name || ''} 
                                                onChange={e => handleUpdateParty('defendant', index, 'name', e.target.value)} 
                                                className={glassField}
                                            />
                                        </div>
                                        <div>
                                            <label className={glassLabel}>العنوان</label>
                                            <input 
                                                type="text" 
                                                value={party.address || ''} 
                                                onChange={e => handleUpdateParty('defendant', index, 'address', e.target.value)} 
                                                className={glassField}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    {stageName?.includes('استئناف') && (
                        <div className="rounded-xl border border-indigo-400/25 bg-indigo-500/[0.08] p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                                        <ArrowRightLeft size={18} className="text-indigo-300" />
                                    </div>
                                    <div>
                                        <h4 className="text-white text-sm font-bold">استئناف متقابل</h4>
                                        <p className="text-white/40 text-xs">هل يوجد استئناف متقابل من الخصم؟</p>
                                    </div>
                                </div>
                                <button type="button"
                                    onClick={() => setHasCrossAppeal(!hasCrossAppeal)}
                                    className={`relative w-14 h-7 rounded-full transition-all duration-300 ${
                                        hasCrossAppeal ? 'bg-indigo-500' : 'bg-white/10'
                                    }`}
                                >
                                    <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-lg transition-all duration-300 ${
                                        hasCrossAppeal ? 'right-1' : 'left-1'
                                    }`}
                                    />
                                </button>
                            </div>
                            {hasCrossAppeal && (
                                <p className="text-xs text-indigo-200/80 leading-relaxed rounded-lg border border-indigo-400/20 bg-indigo-950/30 px-3 py-2">
                                    سيظهر شريط يوضح وجود استئناف متقابل مقدم من الخصم.
                                </p>
                            )}
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={handleSubmit}
                        className="w-full rounded-xl border border-[#E6C673]/40 bg-[linear-gradient(155deg,rgba(230,198,115,0.35),rgba(11,16,33,0.55)_48%,rgba(201,162,39,0.22))] py-3.5 text-sm font-bold text-[#F8F1DE] shadow-[inset_0_1px_0_rgba(255,249,230,0.2),0_10px_28px_rgba(0,0,0,0.3)] backdrop-blur-md transition-all hover:border-[#E6C673]/55"
                    >
                        حفظ التغييرات
                    </button>
                </div>
            </div>
        </div>
    );
};

