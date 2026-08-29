import React, { startTransition } from 'react';
import {
    formatSubArticlesLabel,
    LAW_FILTER_GENERAL_KEYS,
    LAW_FILTERS,
} from '../lawFilters';
import {
    JUVENILE_LAW_FILTER_GENERAL_KEYS,
    JUVENILE_LAW_FILTERS,
} from '../juvenileLawFilters';
import {
    PENAL_LAW_FILTER_GENERAL_KEYS,
    PENAL_LAW_FILTERS,
} from '../penalLawFilters';
import type { LegalCodeType } from './legalCodesConstants';
import { LegalCodesHorizontalScrollRail } from './LegalCodesHorizontalScrollRail';

export type LegalCodesSearchFiltersSectionProps = {
    legalCodeSearch: string;
    onLegalCodeSearchChange: (value: string) => void;
    legalCodeTabOptions: ReadonlyArray<readonly [LegalCodeType, string]>;
    legalCodeTab: LegalCodeType;
    onLegalCodeTabChange: (tab: LegalCodeType) => void;
    penalGeneralFilter: string | null;
    penalSubFilter: string | null;
    onPenalGeneralFilterChange: (general: string | null) => void;
    onPenalSubFilterChange: (sub: string | null) => void;
    procedureGeneralFilter: string | null;
    procedureSubFilter: string | null;
    onProcedureGeneralFilterChange: (general: string | null) => void;
    onProcedureSubFilterChange: (sub: string | null) => void;
    juvenileGeneralFilter: string | null;
    juvenileSubFilter: string | null;
    onJuvenileGeneralFilterChange: (general: string | null) => void;
    onJuvenileSubFilterChange: (sub: string | null) => void;
};

export function LegalCodesSearchFiltersSection({
    legalCodeSearch,
    onLegalCodeSearchChange,
    legalCodeTabOptions,
    legalCodeTab,
    onLegalCodeTabChange,
    penalGeneralFilter,
    penalSubFilter,
    onPenalGeneralFilterChange,
    onPenalSubFilterChange,
    procedureGeneralFilter,
    procedureSubFilter,
    onProcedureGeneralFilterChange,
    onProcedureSubFilterChange,
    juvenileGeneralFilter,
    juvenileSubFilter,
    onJuvenileGeneralFilterChange,
    onJuvenileSubFilterChange,
}: LegalCodesSearchFiltersSectionProps) {
    const filterChipIdle =
        'shrink-0 inline-flex items-center whitespace-nowrap rounded-full border border-transparent bg-white/[0.03] px-2.5 py-1 text-[10px] font-medium text-white/50 backdrop-blur-sm transition hover:border-white/10 hover:bg-white/[0.06] hover:text-white/75';
    const filterChipActive =
        'shrink-0 inline-flex items-center whitespace-nowrap rounded-full border border-[#E6C673]/20 bg-[#E6C673]/[0.08] px-2.5 py-1 text-[10px] font-semibold text-[#E6C673] backdrop-blur-sm';
    const glassNavShell =
        'relative min-w-0 w-full rounded-2xl border border-white/[0.07] bg-gradient-to-b from-white/[0.045] to-white/[0.015] backdrop-blur-sm shadow-[0_8px_28px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.06)] px-1';
    const lawTabActive =
        'rounded-xl border border-[#E6C673]/22 bg-[#E6C673]/10 px-4 py-2 text-sm font-bold text-[#E6C673] backdrop-blur-sm transition';
    const lawTabIdle =
        'rounded-xl border border-transparent px-4 py-2 text-sm font-medium text-white/50 transition hover:border-white/[0.1] hover:bg-white/[0.04] hover:text-white/75';

    return (
        <>
            <div className="rounded-2xl border border-slate-700 bg-slate-900/60 p-3">
                <div className="flex items-center gap-2">
                    <input
                        type="text"
                        value={legalCodeSearch}
                        onChange={(e) => onLegalCodeSearchChange(e.target.value)}
                        placeholder="بحث برقم المادة أو كلمة مفتاحية..."
                        className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-[#E6C673]/60"
                    />
                </div>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
                {legalCodeTabOptions.map(([tab, label]) => (
                    <button
                        key={tab}
                        type="button"
                        onClick={() => startTransition(() => onLegalCodeTabChange(tab))}
                        className={legalCodeTab === tab ? lawTabActive : lawTabIdle}
                    >
                        {label}
                    </button>
                ))}
            </div>
            {legalCodeTab === 'penal' ? (
                <div className={`${glassNavShell} space-y-1`}>
                    <LegalCodesHorizontalScrollRail>
                        <button
                            type="button"
                            onClick={() => {
                                onPenalGeneralFilterChange(null);
                                onPenalSubFilterChange(null);
                            }}
                            className={!penalGeneralFilter ? filterChipActive : filterChipIdle}
                        >
                            الكل
                        </button>
                        {PENAL_LAW_FILTER_GENERAL_KEYS.map((generalKey) => {
                            const isActive = penalGeneralFilter === generalKey;
                            return (
                                <button
                                    key={generalKey}
                                    type="button"
                                    onClick={() => {
                                        onPenalGeneralFilterChange(generalKey);
                                        onPenalSubFilterChange(null);
                                    }}
                                    className={isActive ? filterChipActive : filterChipIdle}
                                >
                                    <span className="font-bold">{generalKey}</span>
                                </button>
                            );
                        })}
                    </LegalCodesHorizontalScrollRail>
                    {penalGeneralFilter &&
                    Object.keys(PENAL_LAW_FILTERS[penalGeneralFilter]?.sub ?? {}).length > 0 ? (
                        <div className="border-t border-white/[0.05] pt-1">
                            <LegalCodesHorizontalScrollRail>
                                <button
                                    type="button"
                                    onClick={() => onPenalSubFilterChange(null)}
                                    className={!penalSubFilter ? filterChipActive : filterChipIdle}
                                >
                                    <span className="font-bold">كل القسم</span>
                                    <span className="mr-1 font-medium tabular-nums opacity-70">
                                        {PENAL_LAW_FILTERS[penalGeneralFilter].range[0]}–
                                        {PENAL_LAW_FILTERS[penalGeneralFilter].range[1]}
                                    </span>
                                </button>
                                {Object.entries(PENAL_LAW_FILTERS[penalGeneralFilter].sub).map(
                                    ([subKey, subNums]) => {
                                        const isActive = penalSubFilter === subKey;
                                        return (
                                            <button
                                                key={subKey}
                                                type="button"
                                                onClick={() => onPenalSubFilterChange(subKey)}
                                                className={isActive ? filterChipActive : filterChipIdle}
                                            >
                                                <span className="font-bold">{subKey}</span>
                                                <span className="mx-0.5 font-medium tabular-nums opacity-70">
                                                    ·{formatSubArticlesLabel(subNums)}
                                                </span>
                                            </button>
                                        );
                                    },
                                )}
                            </LegalCodesHorizontalScrollRail>
                        </div>
                    ) : null}
                </div>
            ) : legalCodeTab === 'procedure' ? (
                <div className={`${glassNavShell} space-y-1`}>
                    <LegalCodesHorizontalScrollRail>
                        <button
                            type="button"
                            onClick={() => {
                                onProcedureGeneralFilterChange(null);
                                onProcedureSubFilterChange(null);
                            }}
                            className={!procedureGeneralFilter ? filterChipActive : filterChipIdle}
                        >
                            الكل
                        </button>
                        {LAW_FILTER_GENERAL_KEYS.map((generalKey) => {
                            const entry = LAW_FILTERS[generalKey];
                            const isActive = procedureGeneralFilter === generalKey;
                            return (
                                <button
                                    key={generalKey}
                                    type="button"
                                    onClick={() => {
                                        onProcedureGeneralFilterChange(generalKey);
                                        onProcedureSubFilterChange(null);
                                    }}
                                    className={isActive ? filterChipActive : filterChipIdle}
                                >
                                    <span className="font-bold">{generalKey}</span>
                                    <span className="mr-1 font-medium tabular-nums opacity-70">
                                        {entry.range[0]}–{entry.range[1]}
                                    </span>
                                </button>
                            );
                        })}
                    </LegalCodesHorizontalScrollRail>
                    {procedureGeneralFilter &&
                    Object.keys(LAW_FILTERS[procedureGeneralFilter]?.sub ?? {}).length > 0 ? (
                        <div className="border-t border-white/[0.05] pt-1">
                            <LegalCodesHorizontalScrollRail>
                                <button
                                    type="button"
                                    onClick={() => onProcedureSubFilterChange(null)}
                                    className={!procedureSubFilter ? filterChipActive : filterChipIdle}
                                >
                                    <span className="font-bold">كل القسم</span>
                                    <span className="mr-1 font-medium tabular-nums opacity-70">
                                        {LAW_FILTERS[procedureGeneralFilter].range[0]}–
                                        {LAW_FILTERS[procedureGeneralFilter].range[1]}
                                    </span>
                                </button>
                                {Object.entries(LAW_FILTERS[procedureGeneralFilter].sub).map(
                                    ([subKey, subNums]) => {
                                        const isActive = procedureSubFilter === subKey;
                                        return (
                                            <button
                                                key={subKey}
                                                type="button"
                                                onClick={() => onProcedureSubFilterChange(subKey)}
                                                className={isActive ? filterChipActive : filterChipIdle}
                                            >
                                                <span className="font-bold">{subKey}</span>
                                                <span className="mx-0.5 font-medium tabular-nums opacity-70">
                                                    ·{formatSubArticlesLabel(subNums)}
                                                </span>
                                            </button>
                                        );
                                    },
                                )}
                            </LegalCodesHorizontalScrollRail>
                        </div>
                    ) : null}
                </div>
            ) : legalCodeTab === 'juvenile' ? (
                <div className={`${glassNavShell} space-y-1`}>
                    <LegalCodesHorizontalScrollRail>
                        <button
                            type="button"
                            onClick={() => {
                                onJuvenileGeneralFilterChange(null);
                                onJuvenileSubFilterChange(null);
                            }}
                            className={!juvenileGeneralFilter ? filterChipActive : filterChipIdle}
                        >
                            الكل
                        </button>
                        {JUVENILE_LAW_FILTER_GENERAL_KEYS.map((generalKey) => {
                            const entry = JUVENILE_LAW_FILTERS[generalKey];
                            const isActive = juvenileGeneralFilter === generalKey;
                            return (
                                <button
                                    key={generalKey}
                                    type="button"
                                    onClick={() => {
                                        onJuvenileGeneralFilterChange(generalKey);
                                        onJuvenileSubFilterChange(null);
                                    }}
                                    className={isActive ? filterChipActive : filterChipIdle}
                                >
                                    <span className="font-bold">{generalKey}</span>
                                    <span className="mr-1 font-medium tabular-nums opacity-70">
                                        {entry.range[0]}–{entry.range[1]}
                                    </span>
                                </button>
                            );
                        })}
                    </LegalCodesHorizontalScrollRail>
                    {juvenileGeneralFilter &&
                    Object.keys(JUVENILE_LAW_FILTERS[juvenileGeneralFilter]?.sub ?? {}).length > 0 ? (
                        <div className="border-t border-white/[0.05] pt-1">
                            <LegalCodesHorizontalScrollRail>
                                {Object.entries(JUVENILE_LAW_FILTERS[juvenileGeneralFilter].sub).map(
                                    ([subKey, subNums]) => {
                                        const isActive = juvenileSubFilter === subKey;
                                        return (
                                            <button
                                                key={subKey}
                                                type="button"
                                                onClick={() => onJuvenileSubFilterChange(subKey)}
                                                className={isActive ? filterChipActive : filterChipIdle}
                                            >
                                                <span className="font-bold">{subKey}</span>
                                                <span className="mx-0.5 font-medium tabular-nums opacity-70">
                                                    ·{formatSubArticlesLabel(subNums)}
                                                </span>
                                            </button>
                                        );
                                    },
                                )}
                            </LegalCodesHorizontalScrollRail>
                        </div>
                    ) : null}
                </div>
            ) : null}
        </>
    );
}
