// @ts-nocheck
import React, { useState } from 'react';
import {
    ArrowRightLeft,
    Edit2,
    Plus,
    Scale,
    Search,
    Trash2,
    Users,
    X,
} from 'lucide-react';
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

    React.useEffect(() => {
        if (isOpen && formData) {
            setCaseNo(formData.caseNo || '');
            setCourt(formData.court || '');
            setJudge(formData.judge || '');
            setStageName(formData.stageName || 'البداءة');
            setExtraordinaryType(formData.extraordinaryType || '');
            setCaseType(formData.docType || formData.type || '');
            setHasCrossAppeal(formData.hasCrossAppeal || false);
            
            // 🎯 Load preserved First Instance data
            setFirstInstanceCaseNumber(formData.firstInstanceCaseNumber || '');
            setFirstInstanceCourt(formData.firstInstanceCourt || '');
            
            // 🆕 Load Appeal Data
            setAppealCaseNumber(formData.appealCaseNumber || '');
            setAppealCourtName(formData.appealCourtName || '');
            
            // 🆕 Load Third Parties
            setThirdParties(formData.thirdParties || []);
            
            // 🆕 Load Represented Party
            setRepresentedParty(formData.representedParty || null);
            
            // 🛡️ DEEP COPY PARTIES to ensure Local State is disconnected from Parent State
            const allParties = (formData.parties || []).map((p: any) => ({ 
                ...p,
                lawyers: p.lawyers ? p.lawyers.map((l: any) => ({ ...l })) : []
            }));
            
            const { plaintiffs: pList, defendants: dList, interpleaders } = partitionPartiesForHeader(
                allParties as Party[],
            );
            setPreservedExtraParties(interpleaders);

            let nextPlaintiffs = pList;
            let nextDefendants = dList;

            // Fallback for legacy data (index based)
            if (nextPlaintiffs.length === 0 && nextDefendants.length === 0) {
                if (allParties.length > 0) nextPlaintiffs = [allParties[0]];
                if (allParties.length > 1) nextDefendants = allParties.slice(1);
            }

            // Ensure at least one empty field if empty
            if (nextPlaintiffs.length === 0) nextPlaintiffs = [{ name: '', role: 'plaintiff' }];
            if (nextDefendants.length === 0) nextDefendants = [{ name: '', role: 'defendant' }];

            setPlaintiffs(nextPlaintiffs);
            setDefendants(nextDefendants);
        }
    }, [isOpen, formData]);
    
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
        
        // 🚀 AUTO-SYNC LOGIC: If updating role of first party, update EVERYONE in the group
        if (index === 0 && field === 'role') {
            newList = newList.map(p => ({ ...p, role: value }));
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

    return (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-['Tajawal']">
            <div className="bg-[#1A1E2E] border border-white/10 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto scrollbar-hide shadow-2xl">
                <div className="bg-[#0F172A] border-b border-white/10 p-4 text-[#E6C673] flex justify-between items-center sticky top-0 z-10">
                    <h3 className="font-bold flex items-center gap-2">
                        <Edit2 size={18}/> تعديل بيانات الدعوى الأساسية
                    </h3>
                    <button type="button" onClick={onClose} className="hover:bg-white/10 rounded-full p-1 text-white/50 hover:text-white transition-colors"><X size={18} /></button>
                </div>
                
                <div className="p-6 space-y-6">
                    {/* Section 1: Case Identity */}
                    <div className="space-y-4 border-b border-white/5 pb-6">
                        <h4 className="text-[#E6C673] text-sm font-bold flex items-center gap-2">
                            <Scale size={16} /> هوية الدعوى
                        </h4>
                        
                        {/* Stage Selector */}
                        <div>
                            <label className="block text-xs font-bold text-white/60 mb-1.5">المرحلة القانونية الحالية</label>
                            <select 
                                value={stageName} 
                                onChange={e => {
                                    const newStage = e.target.value;
                                    // 🎯 CRITICAL: When switching TO appeal, preserve current data as First Instance
                                    if (newStage.includes('استئناف') && !stageName.includes('استئناف')) {
                                        // Save current data as First Instance before switching
                                        if (!firstInstanceCaseNumber && caseNo) setFirstInstanceCaseNumber(caseNo);
                                        if (!firstInstanceCourt && court) setFirstInstanceCourt(court);
                                    }
                                    setStageName(newStage);
                                }}
                                className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-blue-500"
                            >
                                <option value="البداءة">البداءة</option>
                                <option value="الاستئناف">الاستئناف</option>
                                <option value="التمييز">التمييز</option>
                                <option value="اعتراض غيابي">اعتراض غيابي</option>
                                <option value="اعتراض الغير">اعتراض الغير</option>
                                <option value="إعادة المحاكمة">إعادة المحاكمة</option>
                                <option value="تصحيح القرار التمييزي">تصحيح القرار التمييزي</option>
                            </select>
                        </div>

                        {/* 🎯 First Instance Data - Shown when in Appeal stage */}
                        {stageName?.includes('استئناف') && (
                            <div className="bg-slate-800/30 border border-slate-600/30 rounded-lg p-4 space-y-3">
                                <h5 className="text-xs font-bold text-slate-400 flex items-center gap-2">
                                    📋 بيانات مرحلة البداءة (محفوظة)
                                </h5>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-white/40 mb-1.5">رقم دعوى البداءة</label>
                                        <input 
                                            type="text" 
                                            value={firstInstanceCaseNumber} 
                                            onChange={e => setFirstInstanceCaseNumber(e.target.value)} 
                                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-blue-500" 
                                            placeholder="رقم القضية في محكمة البداءة"
                                            dir="ltr"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-white/40 mb-1.5">محكمة البداءة</label>
                                        <input 
                                            type="text" 
                                            value={firstInstanceCourt} 
                                            onChange={e => setFirstInstanceCourt(e.target.value)} 
                                            className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-blue-500" 
                                            placeholder="اسم محكمة البداءة"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-white/60 mb-1.5">
                                    {stageName?.includes('استئناف') ? 'رقم دعوى الاستئناف' : 'رقم الدعوى'}
                                </label>
                                <input 
                                    type="text" 
                                    value={caseNo} 
                                    onChange={e => setCaseNo(e.target.value)} 
                                    className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-blue-500 text-right" 
                                    dir="ltr" 
                                    placeholder={stageName?.includes('استئناف') ? "رقم الاستئناف (مثال: 45/س/2026)" : "مثال: 15/ب/2024"}
                                />
                                <p className="text-white/30 text-[10px] mt-1 text-right">يدعم الأرقام والحروف</p>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-white/60 mb-1.5">
                                    {stageName?.includes('استئناف') ? 'محكمة الاستئناف' : 'المحكمة المختصة'}
                                </label>
                                <input 
                                    type="text" 
                                    value={court} 
                                    onChange={e => setCourt(e.target.value)} 
                                    className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-blue-500" 
                                    placeholder={stageName?.includes('استئناف') ? "اسم محكمة الاستئناف" : "اسم المحكمة المختصة"}
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-white/60 mb-1.5">نوع الدعوى</label>
                                <input type="text" value={caseType} onChange={e => setCaseType(e.target.value)} className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-blue-500" placeholder="مثال: دين، أجر مثل..." />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-white/60 mb-1.5">اسم القاضي (اختياري)</label>
                                <input type="text" value={judge} onChange={e => setJudge(e.target.value)} className="w-full bg-[#0F172A] border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-blue-500" />
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Parties */}
                    <div className="space-y-6">
                        <h4 className="text-[#E6C673] text-sm font-bold flex items-center gap-2">
                            <Users size={16} /> أطراف الدعوى
                        </h4>
                        
                        {/* Party 1 List (Plaintiffs) */}
                        <div className="bg-transparent rounded-xl p-5 border border-slate-500/30">
                            
                            {/* Legal Role Label - DYNAMIC GRAMMAR */}
                            {plaintiffs.length > 0 && (
                                <div className="flex justify-center w-full mb-6 mt-4">
                                  <span className="text-3xl font-extrabold text-[#E6C673] drop-shadow-md tracking-wider">
                                    {getLegalRoleTitle(plaintiffs[0].role, plaintiffs.length)}
                                  </span>
                                </div>
                            )}
                            
                            <div className="space-y-6">
                                {plaintiffs.map((party, index) => (
                                    <div key={index} className="relative space-y-3 pt-4 border-t border-white/5 first:border-0 first:pt-0">
                                        {index > 0 && (
                                            <button type="button" onClick={() => handleRemoveParty('plaintiff', index)} className="absolute left-0 top-0 text-red-400 hover:text-red-300 p-1">
                                                <X size={14} />
                                            </button>
                                        )}
                                        
                                        {/* Editable Role Dropdown */}
                                        {index === 0 && (
                                            <div className="mb-4">
                                                <label className="block text-xs font-bold text-amber-400 mb-1">المركز القانوني (الصفة)</label>
                                                <input 
                                                    type="text" 
                                                    value={party.role || ''} 
                                                    onChange={(e) => handleUpdateParty('plaintiff', index, 'role', e.target.value)} 
                                                    placeholder="اكتب الصفة (مثال: مدعي، مستأنف، مميز...)" 
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-bold text-sm focus:border-amber-500 outline-none"
                                                />
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-xs text-white/40 mb-1.5">الاسم الكامل {plaintiffs.length > 1 ? `(${index + 1})` : ''}</label>
                                            <input 
                                                type="text" 
                                                value={party.name || ''} 
                                                onChange={e => handleUpdateParty('plaintiff', index, 'name', e.target.value)} 
                                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-[#E6C673]/50 focus:ring-1 focus:ring-[#E6C673]/30 transition-all" 
                                                placeholder="أدخل الاسم الكامل" 
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs text-white/40 mb-1.5">رقم الهاتف</label>
                                                <input 
                                                    type="text" 
                                                    value={party.phone || ''} 
                                                    onChange={e => handleUpdateParty('plaintiff', index, 'phone', e.target.value)} 
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-[#E6C673]/50" 
                                                    placeholder="رقم الهاتف" 
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-white/40 mb-1.5">العنوان</label>
                                                <input 
                                                    type="text" 
                                                    value={party.address || ''} 
                                                    onChange={e => handleUpdateParty('plaintiff', index, 'address', e.target.value)} 
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-[#E6C673]/50" 
                                                    placeholder="العنوان" 
                                                />
                                            </div>
                                        </div>
                                        
                                        {/* Unified Toggles */}
                                        <div className="flex items-center justify-between w-full bg-slate-800/50 p-3 rounded-lg border border-slate-700 mt-2">
                                            {/* Toggle 1: Has Lawyer */}
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={!!(party.lawyer?.name || party.lawyerName)} 
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            if (!party.lawyer?.name) handleUpdateParty('plaintiff', index, 'lawyer.name', ' ');
                                                        } else {
                                                            handleUpdateParty('plaintiff', index, 'lawyer.name', '');
                                                            handleUpdateParty('plaintiff', index, 'lawyer.phone', '');
                                                            handleUpdateParty('plaintiff', index, 'lawyer.isMyOffice', false);
                                                        }
                                                    }} 
                                                    className="form-checkbox text-indigo-500 rounded bg-slate-900 border-slate-600 focus:ring-indigo-500 w-4 h-4" 
                                                />
                                                <span className="text-sm font-bold text-slate-300">لديه وكيل (محامي)</span>
                                            </label>

                                            {/* Toggle 2: Is My Client */}
                                            {!!(party.lawyer?.name || party.lawyerName) && (
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={party.lawyer?.isMyOffice || false} 
                                                        onChange={(e) => handleUpdateParty('plaintiff', index, 'lawyer.isMyOffice', e.target.checked)} 
                                                        className="form-checkbox text-emerald-500 rounded bg-slate-900 border-slate-600 focus:ring-emerald-500 w-4 h-4" 
                                                    />
                                                    <span className="text-sm font-bold text-emerald-400">هذا موكلي</span>
                                                </label>
                                            )}
                                        </div>

                                        {!!(party.lawyer?.name || party.lawyerName) && (
                                            <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-200 mt-2">
                                                <input 
                                                    type="text" 
                                                    value={party.lawyer?.name || party.lawyerName || ''} 
                                                    onChange={e => handleUpdateParty('plaintiff', index, 'lawyer.name', e.target.value)} 
                                                    className="bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-[#E6C673]/50 transition-all placeholder:text-white/20" 
                                                    placeholder="اسم المحامي / الزميل" 
                                                />
                                                <input 
                                                    type="text" 
                                                    value={party.lawyer?.phone || party.lawyerPhone || ''} 
                                                    onChange={e => handleUpdateParty('plaintiff', index, 'lawyer.phone', e.target.value)} 
                                                    className="bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-[#E6C673]/50 transition-all placeholder:text-white/20" 
                                                    placeholder="رقم الهاتف" 
                                                    dir="ltr" 
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                            
                            <button type="button" 
                                onClick={() => handleAddParty('plaintiff')}
                                className="w-full mt-4 py-2 border border-dashed border-white/20 rounded-lg text-white/50 text-xs hover:text-white hover:border-white/40 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={14} /> إضافة طرف آخر (مدعي)
                            </button>
                        </div>

                        {/* Party 2 List (Defendants) */}
                        <div className="bg-transparent rounded-xl p-5 border border-slate-500/30">
                            
                            {/* Legal Role Label - DYNAMIC GRAMMAR */}
                            {defendants.length > 0 && (
                                <div className="flex justify-center w-full mb-6 mt-4">
                                  <span className="text-3xl font-extrabold text-amber-400 drop-shadow-md tracking-wider">
                                    {getLegalRoleTitle(defendants[0].role, defendants.length)} 
                                  </span>
                                </div>
                            )}
                            
                            <div className="space-y-6">
                                {defendants.map((party, index) => (
                                    <div key={index} className="relative space-y-3 pt-4 border-t border-white/5 first:border-0 first:pt-0">
                                        {index > 0 && (
                                            <button type="button" onClick={() => handleRemoveParty('defendant', index)} className="absolute left-0 top-0 text-red-400 hover:text-red-300 p-1">
                                                <X size={14} />
                                            </button>
                                        )}

                                        {/* Editable Role Dropdown */}
                                        {index === 0 && (
                                            <div className="mb-4">
                                                <label className="block text-xs font-bold text-amber-400 mb-1">المركز القانوني (الصفة)</label>
                                                <input 
                                                    type="text" 
                                                    value={party.role || ''} 
                                                    onChange={(e) => handleUpdateParty('defendant', index, 'role', e.target.value)} 
                                                    placeholder="اكتب الصفة (مثال: مدعى عليه، مستأنف عليه، مميز عليه...)" 
                                                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-white font-bold text-sm focus:border-amber-500 outline-none"
                                                />
                                            </div>
                                        )}

                                        <div>
                                            <label className="block text-xs text-white/40 mb-1.5">الاسم الكامل {defendants.length > 1 ? `(${index + 1})` : ''}</label>
                                            <input 
                                                type="text" 
                                                value={party.name || ''} 
                                                onChange={e => handleUpdateParty('defendant', index, 'name', e.target.value)} 
                                                className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white outline-none focus:border-[#E6C673]/50 focus:ring-1 focus:ring-[#E6C673]/30 transition-all" 
                                                placeholder="أدخل الاسم الكامل" 
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="block text-xs text-white/40 mb-1.5">رقم الهاتف</label>
                                                <input 
                                                    type="text" 
                                                    value={party.phone || ''} 
                                                    onChange={e => handleUpdateParty('defendant', index, 'phone', e.target.value)} 
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-[#E6C673]/50" 
                                                    placeholder="رقم الهاتف" 
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-white/40 mb-1.5">العنوان</label>
                                                <input 
                                                    type="text" 
                                                    value={party.address || ''} 
                                                    onChange={e => handleUpdateParty('defendant', index, 'address', e.target.value)} 
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-[#E6C673]/50" 
                                                    placeholder="العنوان" 
                                                />
                                            </div>
                                        </div>
                                        
                                        {/* Unified Toggles */}
                                        <div className="flex items-center justify-between w-full bg-slate-800/50 p-3 rounded-lg border border-slate-700 mt-2">
                                            {/* Toggle 1: Has Lawyer */}
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input 
                                                    type="checkbox" 
                                                    checked={!!(party.lawyer?.name || party.lawyerName)} 
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            if (!party.lawyer?.name) handleUpdateParty('defendant', index, 'lawyer.name', ' '); 
                                                        } else {
                                                            handleUpdateParty('defendant', index, 'lawyer.name', '');
                                                            handleUpdateParty('defendant', index, 'lawyer.phone', '');
                                                            handleUpdateParty('defendant', index, 'lawyer.isMyOffice', false);
                                                        }
                                                    }} 
                                                    className="form-checkbox text-indigo-500 rounded bg-slate-900 border-slate-600 focus:ring-indigo-500 w-4 h-4" 
                                                />
                                                <span className="text-sm font-bold text-slate-300">لديه وكيل (محامي)</span>
                                            </label>

                                            {/* Toggle 2: Is My Client */}
                                            {!!(party.lawyer?.name || party.lawyerName) && (
                                                <label className="flex items-center gap-2 cursor-pointer">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={party.lawyer?.isMyOffice || false} 
                                                        onChange={(e) => handleUpdateParty('defendant', index, 'lawyer.isMyOffice', e.target.checked)} 
                                                        className="form-checkbox text-emerald-500 rounded bg-slate-900 border-slate-600 focus:ring-emerald-500 w-4 h-4" 
                                                    />
                                                    <span className="text-sm font-bold text-emerald-400">هذا موكلي</span>
                                                </label>
                                            )}
                                        </div>

                                        {!!(party.lawyer?.name || party.lawyerName) && (
                                            <div className="grid grid-cols-2 gap-3 animate-in fade-in slide-in-from-top-2 duration-200 mt-2">
                                                <input 
                                                    type="text" 
                                                    value={party.lawyer?.name || party.lawyerName || ''} 
                                                    onChange={e => handleUpdateParty('defendant', index, 'lawyer.name', e.target.value)} 
                                                    className="bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-[#E6C673]/50 transition-all placeholder:text-white/20" 
                                                    placeholder="اسم المحامي / الزميل" 
                                                />
                                                <input 
                                                    type="text" 
                                                    value={party.lawyer?.phone || party.lawyerPhone || ''} 
                                                    onChange={e => handleUpdateParty('defendant', index, 'lawyer.phone', e.target.value)} 
                                                    className="bg-white/5 border border-white/10 rounded-lg p-2 text-xs text-white outline-none focus:border-[#E6C673]/50 transition-all placeholder:text-white/20" 
                                                    placeholder="رقم الهاتف" 
                                                    dir="ltr" 
                                                />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            <button type="button" 
                                onClick={() => handleAddParty('defendant')}
                                className="w-full mt-4 py-2 border border-dashed border-white/20 rounded-lg text-white/50 text-xs hover:text-white hover:border-white/40 transition-all flex items-center justify-center gap-2"
                            >
                                <Plus size={14} /> إضافة طرف آخر (مدعى عليه)
                            </button>
                        </div>
                    </div>

                    {/* CRITICAL LEGAL LOGIC: Cross-Appeal Toggle - Only visible in Appeal Stage */}
                    {stageName?.includes('استئناف') && (
                        <div className="bg-indigo-900/20 border border-indigo-500/30 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
                                        <ArrowRightLeft size={18} className="text-indigo-400" />
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
                                    }`} />
                                </button>
                            </div>
                            {hasCrossAppeal && (
                                <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-lg p-3 flex items-start gap-2 text-xs text-indigo-200 animate-in fade-in zoom-in-95 duration-200">
                                    <span className="text-indigo-400">ℹ️</span>
                                    <p className="leading-relaxed">
                                        تم تفعيل خاصية الاستئناف المتقابل. سيظهر شريط خاص في واجهة القضية يوضح وجود استئناف متقابل مقدم من الخصم.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    <button type="button" onClick={handleSubmit} className="w-full bg-gradient-to-r from-[#E6C673] to-[#D4AF37] text-black py-4 rounded-xl font-bold text-sm hover:opacity-90 transition-all shadow-lg shadow-[#E6C673]/20">
                        💾 حفظ التغييرات
                    </button>
                </div>
            </div>
        </div>
    );
};

