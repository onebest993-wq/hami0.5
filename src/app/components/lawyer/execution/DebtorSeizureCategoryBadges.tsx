import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Briefcase, Car, Home, Pin } from 'lucide-react';
import type { LucideProps } from 'lucide-react';
import type {
    RealEstateSeizureAsset,
    SeizedAsset,
    StandaloneExecutionMark,
    ThirdPartySeizureAsset,
} from '@/app/types/execution';

type CategoryKey = 'realEstate' | 'movable' | 'thirdParty' | 'marks';

type Category = {
    key: CategoryKey;
    label: string;
    borderClass: string;
    bgClass: string;
    textClass: string;
    Icon: React.ComponentType<LucideProps>;
    items: string[];
};

function normalizeLine(v: unknown): string {
    return String(v ?? '').trim();
}

function buildRealEstateLabel(a: RealEstateSeizureAsset): string {
    const v = normalizeLine(a.propertyNoAndDistrict);
    return v || 'عقار';
}

function buildMovableLabel(a: SeizedAsset): string {
    const det = (a.details || {}) as Record<string, unknown>;
    const movableType = normalizeLine(det.movableAssetType);
    const vehicleDesc = normalizeLine(det.vehicleDescription);
    const plate = normalizeLine(det.vehiclePlate);
    const fallback = normalizeLine(a.description);
    const base = movableType || vehicleDesc || fallback || 'منقول';
    return plate ? `${base} — ${plate}` : base;
}

function buildThirdPartyLabel(a: ThirdPartySeizureAsset): string {
    const name = normalizeLine(a.thirdPartyName);
    const amt = typeof a.expectedAmountIqd === 'number' && a.expectedAmountIqd > 0 ? a.expectedAmountIqd : null;
    return amt ? `${name || 'لدى الغير'} — ${amt.toLocaleString('ar-IQ')} د.ع` : name || 'لدى الغير';
}

function buildMarkLabel(a: StandaloneExecutionMark): string {
    const kind = normalizeLine(a.markType);
    const target = normalizeLine(a.targetEntity);
    return target ? `${kind} — ${target}` : kind || 'تعميم';
}

function isActiveSeizedAsset(a: SeizedAsset): boolean {
    if (a.status !== 'seized') return false;
    if (a.seizure_record_locked) return false;
    return true;
}

function isActiveRealEstate(a: RealEstateSeizureAsset): boolean {
    if (a.record_locked) return false;
    if (a.status !== 'seized') return false;
    return true;
}

function isActiveThirdParty(a: ThirdPartySeizureAsset): boolean {
    if (a.record_locked) return false;
    if (a.status !== 'waiting') return false;
    return true;
}

function isActiveStandaloneMark(a: StandaloneExecutionMark): boolean {
    if (a.record_locked) return false;
    if (a.status !== 'active') return false;
    return true;
}

function BadgeButton(props: {
    active: boolean;
    onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
    buttonRef?: (element: HTMLButtonElement | null) => void;
    bgClass: string;
    borderClass: string;
    textClass: string;
    Icon: Category['Icon'];
    text: string;
}) {
    const { Icon } = props;
    return (
        <button
            ref={props.buttonRef}
            type="button"
            onClick={props.onClick}
            className={`group inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all ${props.bgClass} ${props.borderClass} ${props.textClass} hover:brightness-110 hover:shadow-[0_0_16px_rgba(0,0,0,0.25)] cursor-pointer ${
                props.active ? 'ring-1 ring-white/10' : ''
            }`}
        >
            <Icon size={14} className="opacity-90" />
            <span className="whitespace-nowrap">{props.text}</span>
        </button>
    );
}

export function DebtorSeizureCategoryBadges(props: {
    seizedAssets: SeizedAsset[];
    realEstateSeizureAssets: RealEstateSeizureAsset[];
    thirdPartySeizureAssets: ThirdPartySeizureAsset[];
    standaloneExecutionMarks: StandaloneExecutionMark[];
}) {
    const [openKey, setOpenKey] = useState<CategoryKey | null>(null);
    const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
    const popoverRef = useRef<HTMLDivElement | null>(null);
    const anchorRefs = useRef<Record<CategoryKey, HTMLButtonElement | null>>({
        realEstate: null,
        movable: null,
        thirdParty: null,
        marks: null,
    });

    const categories: Category[] = useMemo(() => {
        const realEstateItems = props.realEstateSeizureAssets
            .filter(isActiveRealEstate)
            .map(buildRealEstateLabel)
            .filter(Boolean);
        const movableItems = props.seizedAssets
            .filter(isActiveSeizedAsset)
            .filter((a) => {
                const det = (a.details || {}) as Record<string, unknown>;
                const kind = normalizeLine(det.seizureUiKind || a.type);
                return kind === 'vehicle' || kind === 'movable' || /منقول|مركبة/i.test(kind);
            })
            .map(buildMovableLabel)
            .filter(Boolean);
        const thirdPartyItems = props.thirdPartySeizureAssets
            .filter(isActiveThirdParty)
            .map(buildThirdPartyLabel)
            .filter(Boolean);
        const marksItems = props.standaloneExecutionMarks
            .filter(isActiveStandaloneMark)
            .map(buildMarkLabel)
            .filter(Boolean);
        return [
            {
                key: 'realEstate',
                label: `عقارات (${realEstateItems.length})`,
                bgClass: 'bg-indigo-900/30',
                borderClass: 'border-indigo-500/50',
                textClass: 'text-indigo-300',
                Icon: Home,
                items: realEstateItems,
            },
            {
                key: 'movable',
                label: `منقول (${movableItems.length})`,
                bgClass: 'bg-blue-900/30',
                borderClass: 'border-blue-500/50',
                textClass: 'text-blue-300',
                Icon: Car,
                items: movableItems,
            },
            {
                key: 'thirdParty',
                label: `لدى الغير (${thirdPartyItems.length})`,
                bgClass: 'bg-emerald-900/30',
                borderClass: 'border-emerald-500/50',
                textClass: 'text-emerald-300',
                Icon: Briefcase,
                items: thirdPartyItems,
            },
            {
                key: 'marks',
                label: `تعميم (${marksItems.length})`,
                bgClass: 'bg-amber-900/30',
                borderClass: 'border-amber-500/50',
                textClass: 'text-amber-300',
                Icon: Pin,
                items: marksItems,
            },
        ];
    }, [
        props.realEstateSeizureAssets,
        props.seizedAssets,
        props.standaloneExecutionMarks,
        props.thirdPartySeizureAssets,
    ]);

    const visibleCategories = categories.filter((c) => c.items.length > 0);
    const openCategory = openKey ? categories.find((c) => c.key === openKey) || null : null;

    useEffect(() => {
        if (!openKey) return;

        const onDown = (e: MouseEvent) => {
            const target = e.target as Node | null;
            if (!target) return;
            if (popoverRef.current && popoverRef.current.contains(target)) return;
            setOpenKey(null);
        };
        window.addEventListener('mousedown', onDown);
        return () => window.removeEventListener('mousedown', onDown);
    }, [openKey]);

    useEffect(() => {
        if (!openKey) return;

        const updateAnchorRect = () => {
            const anchor = anchorRefs.current[openKey];
            if (!anchor) return;
            setAnchorRect(anchor.getBoundingClientRect());
        };

        updateAnchorRect();
        window.addEventListener('resize', updateAnchorRect);
        window.addEventListener('scroll', updateAnchorRect, true);
        return () => {
            window.removeEventListener('resize', updateAnchorRect);
            window.removeEventListener('scroll', updateAnchorRect, true);
        };
    }, [openKey]);

    if (visibleCategories.length === 0) return null;

    return (
        <>
            <div className="flex flex-row flex-wrap items-center gap-2 mt-2" dir="rtl">
                {visibleCategories.map((c) => (
                    <BadgeButton
                        key={c.key}
                        buttonRef={(element) => {
                            anchorRefs.current[c.key] = element;
                        }}
                        active={openKey === c.key}
                        onClick={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setAnchorRect(rect);
                            setOpenKey((prev) => (prev === c.key ? null : c.key));
                        }}
                        bgClass={c.bgClass}
                        borderClass={c.borderClass}
                        textClass={c.textClass}
                        Icon={c.Icon}
                        text={c.label}
                    />
                ))}
            </div>

            {openCategory && anchorRect && typeof document !== 'undefined'
                ? createPortal(
                      <div
                          ref={popoverRef}
                          className={`fixed z-[220] w-[min(420px,calc(100vw-24px))] rounded-2xl border ${openCategory.borderClass} bg-[#0B1120]/95 p-3 shadow-2xl shadow-black/60 backdrop-blur-xl`}
                          style={{
                              top: Math.min(
                                  window.innerHeight - 16,
                                  Math.max(16, anchorRect.bottom + 10)
                              ),
                              left: Math.min(
                                  window.innerWidth - 16,
                                  Math.max(16, anchorRect.left)
                              ),
                          }}
                          dir="rtl"
                          role="dialog"
                          aria-label={openCategory.label}
                      >
                          <div className="mb-2 flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                  <p className={`truncate text-[11px] font-black ${openCategory.textClass}`}>
                                      {openCategory.label}
                                  </p>
                              </div>
                              <button
                                  type="button"
                                  onClick={() => setOpenKey(null)}
                                  className="rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold text-slate-200 hover:bg-white/10"
                              >
                                  إغلاق
                              </button>
                          </div>
                          <div className="max-h-[240px] overflow-auto rounded-xl border border-white/10 bg-black/20 p-2">
                              <ul className="space-y-1 text-right text-[11px] text-slate-100">
                                  {openCategory.items.map((line, idx) => (
                                      <li key={`${openCategory.key}_${idx}`} className="flex gap-2">
                                          <span className="text-slate-500 tabular-nums">{idx + 1}.</span>
                                          <span className="min-w-0 break-words">{line}</span>
                                      </li>
                                  ))}
                              </ul>
                          </div>
                      </div>,
                      document.body
                  )
                : null}
        </>
    );
}
