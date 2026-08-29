import React, { useEffect, useState } from 'react';
import { ChevronDown } from '@/app/components/ui/icons/ChevronDown';
import { GitMerge } from '@/app/components/ui/icons/GitMerge';
import { MapPin } from '@/app/components/ui/icons/MapPin';
import { Pencil } from '@/app/components/ui/icons/Pencil';
import { Scissors } from '@/app/components/ui/icons/Scissors';
import { Trash2 } from '@/app/components/ui/icons/Trash2';
import { Unlock } from '@/app/components/ui/icons/Unlock';
import { Zap } from '@/app/components/ui/icons/Zap';
import type { PhysicalLocation } from './criminalStore';
import { useColleagueConsultation } from '@/app/components/lawyer/caseShare/ColleagueConsultationContext';
import { ColleagueConsultationHeaderButton } from '@/app/components/lawyer/caseShare/ColleagueConsultationHeaderButton';
import { CRIMINAL_DOSSIER_TEST_IDS } from './criminalDossierTestIds';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/app/components/ui/dropdown-menu';
import {
    glassHeaderButtonClass,
    unifiedHeaderButtonBase,
} from './criminalDashboardHeaderChrome';

const PHYSICAL_LOCATION_PRESETS: ReadonlyArray<{ value: PhysicalLocation; label: string }> = [
    { value: 'prosecution', label: 'لدى الادعاء العام' },
    { value: 'judge_desk', label: 'على مكتب القاضي' },
    { value: 'investigator_room', label: 'في غرفة المحقق' },
    { value: 'police_station', label: 'في مركز الشرطة' },
    { value: 'archive', label: 'في الأرشيف' },
    { value: 'custom', label: 'مكان مخصص...' },
];

function locationLabel(loc: PhysicalLocation, custom: string): string {
    if (loc === 'judge_desk') return 'على مكتب القاضي';
    if (loc === 'investigator_room') return 'في غرفة المحقق';
    if (loc === 'prosecution') return 'لدى الادعاء العام';
    if (loc === 'police_station') return 'في مركز الشرطة';
    if (loc === 'archive') return 'في الأرشيف';
    return custom.trim() ? custom.trim() : 'مكان مخصص';
}

export type CriminalDashboardHeaderToolbarProps = {
    hasAdminMenu: boolean;
    showMergeCases: boolean;
    mergeCasesDisabled: boolean;
    onOpenMergeCases: () => void;
    showReopenClosedCase: boolean;
    onOpenReopenClosedCase: () => void;
    canShowSeverance: boolean;
    onOpenSeverance?: () => void;
    showEditHeaderInfo: boolean;
    onEditHeaderInfo?: () => void;
    isInvestigationStage: boolean;
    physicalLocation: PhysicalLocation;
    physicalLocationCustomName?: string;
    onUpdatePhysicalLocation: (location: PhysicalLocation, customName?: string) => void;
    onOpenTrash?: () => void;
    trashCount: number;
};

/**
 * شريط أدوات ترويسة الإضبارة — إجراءات إدارية، تعديل، موقع مادي، سلة، استشارة زميل.
 * مستخرَج حرفياً من CriminalDashboardHeader (صفر تغيير بصري).
 */
export function CriminalDashboardHeaderToolbar({
    hasAdminMenu,
    showMergeCases,
    mergeCasesDisabled,
    onOpenMergeCases,
    showReopenClosedCase,
    onOpenReopenClosedCase,
    canShowSeverance,
    onOpenSeverance,
    showEditHeaderInfo,
    onEditHeaderInfo,
    isInvestigationStage,
    physicalLocation,
    physicalLocationCustomName,
    onUpdatePhysicalLocation,
    onOpenTrash,
    trashCount,
}: CriminalDashboardHeaderToolbarProps) {
    const consultation = useColleagueConsultation();
    const [locationLocal, setLocationLocal] = useState<PhysicalLocation>(physicalLocation);
    const [customNameLocal, setCustomNameLocal] = useState<string>(String(physicalLocationCustomName ?? ''));

    useEffect(() => {
        setLocationLocal(physicalLocation);
        setCustomNameLocal(String(physicalLocationCustomName ?? ''));
    }, [physicalLocation, physicalLocationCustomName]);

    const applyPhysicalLocation = (loc: PhysicalLocation, customName?: string) => {
        setLocationLocal(loc);
        if (loc !== 'custom') {
            setCustomNameLocal('');
            onUpdatePhysicalLocation(loc);
            return;
        }
        const name = String(customName ?? customNameLocal).trim();
        setCustomNameLocal(name);
        onUpdatePhysicalLocation('custom', name);
    };

    const adminButtonClass = glassHeaderButtonClass;
    const locationButtonClass = glassHeaderButtonClass;

    return (
        <>
            {consultation ? (
                <ColleagueConsultationHeaderButton
                    className={`${glassHeaderButtonClass} border-[#E6C673]/30 text-[#E6C673] hover:bg-[#E6C673]/10`}
                    iconSize={16}
                />
            ) : null}
            {hasAdminMenu ? (
                <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            className={adminButtonClass}
                            title="إجراءات إدارية على الإضبارة"
                        >
                            <Zap className="h-4 w-4 shrink-0 opacity-90" />
                            <span>إجراءات الإضبارة</span>
                            <ChevronDown className="h-4 w-4 shrink-0 opacity-80" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        sideOffset={8}
                        collisionPadding={16}
                        className="z-[300] min-w-[18rem] border border-white/10 bg-slate-900/95 backdrop-blur-sm text-white font-['Tajawal'] shadow-lg shadow-black/25 p-1"
                    >
                        {showMergeCases ? (
                            <DropdownMenuItem
                                disabled={mergeCasesDisabled}
                                onSelect={(e) => {
                                    e.preventDefault();
                                    if (mergeCasesDisabled) return;
                                    window.setTimeout(() => onOpenMergeCases(), 0);
                                }}
                                title={
                                    mergeCasesDisabled
                                        ? 'لا توجد إضابير أخرى بنفس المرحلة الإجرائية لضمها'
                                        : undefined
                                }
                                className="gap-2 text-sm font-bold focus:bg-white/10 focus:text-white data-[disabled]:opacity-50 data-[disabled]:cursor-not-allowed"
                            >
                                <GitMerge className="h-4 w-4 text-fuchsia-300" />
                                <span className="flex flex-col gap-0.5 items-start">
                                    <span>ضم إضبارة مرتبطة</span>
                                    {mergeCasesDisabled ? (
                                        <span className="text-[10px] font-bold text-white/45 whitespace-normal break-words">
                                            لا توجد إضابير بنفس المرحلة الإجرائية متاحة للضم
                                        </span>
                                    ) : null}
                                </span>
                            </DropdownMenuItem>
                        ) : null}
                        {showReopenClosedCase ? (
                            <DropdownMenuItem
                                onSelect={(e) => {
                                    e.preventDefault();
                                    window.setTimeout(() => onOpenReopenClosedCase(), 0);
                                }}
                                className="cursor-pointer gap-2 text-sm font-bold focus:bg-white/10 focus:text-white"
                            >
                                <Unlock className="h-4 w-4 text-amber-300" />
                                إعادة فتح الدعوى
                            </DropdownMenuItem>
                        ) : null}
                        {canShowSeverance ? (
                            <DropdownMenuItem
                                onSelect={(e) => {
                                    e.preventDefault();
                                    window.setTimeout(() => onOpenSeverance?.(), 0);
                                }}
                                className="cursor-pointer gap-2 text-sm font-bold focus:bg-white/10 focus:text-white"
                            >
                                <Scissors className="h-4 w-4 text-sky-300" />
                                تفريق الإضبارة
                            </DropdownMenuItem>
                        ) : null}
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : null}

            {showEditHeaderInfo && onEditHeaderInfo ? (
                <button
                    type="button"
                    onClick={onEditHeaderInfo}
                    title="تعديل اسم المحكمة والمادة وأرقام الإضبارة"
                    aria-label="تعديل الترويسة"
                    className={`${unifiedHeaderButtonBase} !h-10 !w-10 !px-0 bg-[#E6C673]/12 border border-[#E6C673]/45 text-[#E6C673] hover:bg-[#E6C673]/22`}
                >
                    <Pencil className="h-4 w-4 shrink-0 opacity-90" aria-hidden />
                </button>
            ) : null}

            {isInvestigationStage ? (
                <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                        <button
                            type="button"
                            title="موقع الإضبارة المادي — اضغط لتغيير الموضع"
                            className={locationButtonClass}
                        >
                            <MapPin className="h-4 w-4 shrink-0 opacity-90" />
                            <span className="truncate max-w-[9rem]">
                                {locationLabel(
                                    physicalLocation,
                                    String(physicalLocationCustomName ?? ''),
                                )}
                            </span>
                            <ChevronDown className="h-4 w-4 shrink-0 opacity-80" />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        sideOffset={8}
                        collisionPadding={16}
                        className="z-[300] min-w-[14rem] border border-white/10 bg-slate-900/95 backdrop-blur-sm text-white font-['Tajawal'] shadow-lg shadow-black/25 p-1"
                    >
                        <div className="px-2 py-1.5 text-[10px] font-black text-white/45">
                            موقع الإضبارة
                        </div>
                        {PHYSICAL_LOCATION_PRESETS.map((opt) => (
                            <DropdownMenuItem
                                key={opt.value}
                                onSelect={() => applyPhysicalLocation(opt.value)}
                                className={`cursor-pointer text-sm font-bold focus:bg-white/10 focus:text-white ${
                                    locationLocal === opt.value ? 'bg-white/10 text-white' : ''
                                }`}
                            >
                                {opt.label}
                            </DropdownMenuItem>
                        ))}
                        <div
                            className="border-t border-white/10 p-2 space-y-1.5"
                            onPointerDown={(e) => e.stopPropagation()}
                            onKeyDown={(e) => e.stopPropagation()}
                        >
                            <div className="text-[10px] font-black text-white/45">
                                تسمية مكان مخصص
                            </div>
                            <input
                                value={customNameLocal}
                                onChange={(e) => setCustomNameLocal(e.target.value)}
                                onBlur={() => {
                                    if (locationLocal === 'custom' || customNameLocal.trim()) {
                                        applyPhysicalLocation('custom', customNameLocal);
                                    }
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        applyPhysicalLocation('custom', customNameLocal);
                                    }
                                }}
                                placeholder="اكتب المكان..."
                                className="rounded-lg border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs font-bold text-white placeholder:text-white/35 focus:outline-none focus:ring-1 focus:ring-white/25"
                            />
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
            ) : null}

            {onOpenTrash ? (
                <button
                    type="button"
                    onClick={onOpenTrash}
                    title="فتح سلة المهملات"
                    data-testid={CRIMINAL_DOSSIER_TEST_IDS.headerTrash}
                    aria-label="فتح سلة المهملات"
                    className={`${glassHeaderButtonClass} !h-10 !w-10 !px-0 relative text-white/80 hover:text-[#E6C673]`}
                >
                    {trashCount > 0 ? (
                        <span
                            className="pointer-events-none absolute -top-1.5 left-1/2 z-10 flex h-4 min-w-4 -translate-x-1/2 items-center justify-center rounded-full bg-[#E6C673] px-1 text-[9px] font-black leading-none text-[#0B1021]"
                            aria-hidden
                        >
                            {trashCount > 99 ? '99+' : trashCount}
                        </span>
                    ) : null}
                    <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
                </button>
            ) : null}
        </>
    );
}
