import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Briefcase } from '@/app/components/ui/icons/Briefcase';
import { Car } from '@/app/components/ui/icons/Car';
import { EyeOff } from '@/app/components/ui/icons/EyeOff';
import { Home } from '@/app/components/ui/icons/Home';
import { Pin } from '@/app/components/ui/icons/Pin';
import {
    BADGE_POPOVER_Z_INDEX,
    computeFixedPopoverLayout,
    refinePopoverLayoutWithMeasuredHeight,
    type FixedPopoverLayout,
} from './anchoredPopoverPosition';
import {
    PARTY_BADGE_ICON_SIZE,
    PARTY_BADGE_PILL_CLASS,
} from './partyBadgeShell';
import type {
    RealEstateSeizureAsset,
    SeizedAsset,
    StandaloneExecutionMark,
    ThirdPartySeizure,
    ThirdPartySeizureAsset,
} from '@/app/types/execution';
import {
    type Category,
    type CategoryKey,
    buildMarkLabel,
    buildMovableLabel,
    buildRealEstateLabel,
    buildThirdPartyLabel,
    buildThirdPartySeizureUiLabel,
    isActiveRealEstate,
    isActiveSeizedAsset,
    isActiveStandaloneMark,
    isActiveThirdParty,
    isActiveThirdPartySeizure,
    loadHidden,
    normalizeLine,
    saveHidden,
} from './debtorSeizureCategoryBadgeHelpers';

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
            className={`${PARTY_BADGE_PILL_CLASS} ${props.bgClass} ${props.borderClass} ${props.textClass} ${
                props.active ? 'ring-1 ring-white/10' : ''
            }`}
        >
            <Icon size={PARTY_BADGE_ICON_SIZE} className="shrink-0 opacity-85" />
            <span className="whitespace-nowrap">{props.text}</span>
        </button>
    );
}

export function DebtorSeizureCategoryBadges(props: {
    seizedAssets: SeizedAsset[];
    realEstateSeizureAssets: RealEstateSeizureAsset[];
    thirdPartySeizureAssets: ThirdPartySeizureAsset[];
    /** مسار حجز لدى الغير الجديد (thirdPartySeizures) */
    thirdPartySeizures?: ThirdPartySeizure[];
    standaloneExecutionMarks: StandaloneExecutionMark[];
    /** لربط الشارة بموافقة المنفذ + اكتمال التسجيل */
    decisionsExecutionId?: string;
    /** لحفظ إخفاء الشارات محلياً لكل إضبارة */
    executionId?: string;
    /** داخل صف موحّد مع الشارات التفاعلية — بدون غلاف منفصل */
    embeddedInRow?: boolean;
}) {
    const executionId = String(props.executionId ?? '').trim();
    const [openKey, setOpenKey] = useState<CategoryKey | null>(null);
    const [hiddenKeys, setHiddenKeys] = useState<CategoryKey[]>(() =>
        executionId ? loadHidden(executionId) : []
    );
    const [popoverLayout, setPopoverLayout] = useState<FixedPopoverLayout | null>(null);
    const popoverRef = useRef<HTMLDivElement | null>(null);
    const anchorRefs = useRef<Record<CategoryKey, HTMLButtonElement | null>>({
        realEstate: null,
        movable: null,
        thirdParty: null,
        marks: null,
    });

    const decId = props.decisionsExecutionId;

    const categories: Category[] = useMemo(() => {
        const realEstateItems = props.realEstateSeizureAssets
            .filter((a) => isActiveRealEstate(a, decId))
            .map(buildRealEstateLabel)
            .filter(Boolean);
        const movableItems = props.seizedAssets
            .filter((a) => isActiveSeizedAsset(a, decId))
            .filter((a) => {
                const det = (a.details || {}) as Record<string, unknown>;
                const kind = normalizeLine(det.seizureUiKind || a.type);
                return kind === 'vehicle' || kind === 'movable' || /منقول|مركبة/i.test(kind);
            })
            .map(buildMovableLabel)
            .filter(Boolean);
        const seenThirdPartyKeys = new Set<string>();
        const thirdPartyItems: string[] = [];
        for (const s of props.thirdPartySeizures ?? []) {
            if (!isActiveThirdPartySeizure(s, decId)) continue;
            const id = String(s?.id || '').trim();
            const did = String(s?.decisionRowId || '').trim();
            const key = did || id;
            if (!key || seenThirdPartyKeys.has(key)) continue;
            seenThirdPartyKeys.add(key);
            const label = buildThirdPartySeizureUiLabel(s);
            if (label) thirdPartyItems.push(label);
        }
        for (const a of props.thirdPartySeizureAssets) {
            if (!isActiveThirdParty(a, decId)) continue;
            const id = String(a?.id || '').trim();
            const did = String(a?.decisionRowId || '').trim();
            const key = did || id;
            if (key && seenThirdPartyKeys.has(key)) continue;
            if (key) seenThirdPartyKeys.add(key);
            const label = buildThirdPartyLabel(a);
            if (label) thirdPartyItems.push(label);
        }
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
        decId,
        props.realEstateSeizureAssets,
        props.seizedAssets,
        props.standaloneExecutionMarks,
        props.thirdPartySeizureAssets,
        props.thirdPartySeizures,
    ]);

    useEffect(() => {
        if (!executionId) {
            setHiddenKeys([]);
            return;
        }
        setHiddenKeys(loadHidden(executionId));
    }, [executionId]);

    const hideCategory = useCallback(
        (key: CategoryKey) => {
            setHiddenKeys((prev) => {
                const next = prev.includes(key) ? prev : [...prev, key];
                if (executionId) saveHidden(executionId, next);
                return next;
            });
            setOpenKey((prev) => (prev === key ? null : prev));
        },
        [executionId]
    );

    const visibleCategories = categories.filter((c) => c.items.length > 0 && !hiddenKeys.includes(c.key));
    const openCategory = openKey ? categories.find((c) => c.key === openKey) || null : null;

    const syncPopoverLayout = useCallback(() => {
        if (!openKey) {
            setPopoverLayout(null);
            return;
        }
        const anchor = anchorRefs.current[openKey];
        if (!anchor) return;
        const anchorRect = anchor.getBoundingClientRect();
        const itemCount = openCategory?.items.length ?? 0;
        const estimatedHeight = Math.min(280, 48 + itemCount * 24);
        const base = computeFixedPopoverLayout(anchorRect, {
            preferredWidth: Math.min(420, window.innerWidth - 24),
            estimatedHeight,
        });
        const el = popoverRef.current;
        if (el) {
            setPopoverLayout(
                refinePopoverLayoutWithMeasuredHeight(base, anchorRect, el.offsetHeight)
            );
        } else {
            setPopoverLayout(base);
        }
    }, [openCategory?.items.length, openKey]);

    useEffect(() => {
        if (!openKey) return;

        const onDown = (e: MouseEvent) => {
            const target = e.target as Node | null;
            if (!target) return;
            if (popoverRef.current && popoverRef.current.contains(target)) return;
            const anchor = openKey ? anchorRefs.current[openKey] : null;
            if (anchor && anchor.contains(target)) return;
            setOpenKey(null);
        };
        window.addEventListener('mousedown', onDown);
        return () => window.removeEventListener('mousedown', onDown);
    }, [openKey]);

    useLayoutEffect(() => {
        if (!openKey) return;
        syncPopoverLayout();
        const id = requestAnimationFrame(() => syncPopoverLayout());
        return () => cancelAnimationFrame(id);
    }, [openKey, syncPopoverLayout]);

    useEffect(() => {
        if (!openKey) return;
        const onScrollResize = () => syncPopoverLayout();
        window.addEventListener('resize', onScrollResize);
        window.addEventListener('scroll', onScrollResize, true);
        return () => {
            window.removeEventListener('resize', onScrollResize);
            window.removeEventListener('scroll', onScrollResize, true);
        };
    }, [openKey, syncPopoverLayout]);

    useEffect(() => {
        if (!openKey) setPopoverLayout(null);
    }, [openKey]);

    if (visibleCategories.length === 0) return null;

    const badgeButtons = visibleCategories.map((c) => (
        <BadgeButton
            key={c.key}
            buttonRef={(element) => {
                anchorRefs.current[c.key] = element;
            }}
            active={openKey === c.key}
            onClick={(e) => {
                e.stopPropagation();
                setOpenKey((prev) => (prev === c.key ? null : c.key));
            }}
            bgClass={c.bgClass}
            borderClass={c.borderClass}
            textClass={c.textClass}
            Icon={c.Icon}
            text={c.label}
        />
    ));

    return (
        <>
            {props.embeddedInRow ? (
                badgeButtons
            ) : (
                <div className="flex flex-row flex-wrap items-center gap-2 mt-2" dir="rtl">
                    {badgeButtons}
                </div>
            )}

            {openCategory && popoverLayout && typeof document !== 'undefined'
                ? createPortal(
                      <div
                          ref={popoverRef}
                          className="fixed rounded-xl border border-white/10 bg-[#0B1120]/82 p-2 shadow-lg shadow-black/25 backdrop-blur-sm"
                          style={{
                              zIndex: BADGE_POPOVER_Z_INDEX,
                              top: popoverLayout.top,
                              left: popoverLayout.left,
                              width: popoverLayout.width,
                              maxHeight: popoverLayout.maxHeight,
                          }}
                          dir="rtl"
                          role="dialog"
                          aria-label={openCategory.label}
                      >
                          <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
                              <p className={`min-w-0 truncate text-[10px] font-bold ${openCategory.textClass}`}>
                                  {openCategory.label}
                              </p>
                              <div className="flex shrink-0 items-center gap-0.5">
                                  <button
                                      type="button"
                                      onClick={() => hideCategory(openCategory.key)}
                                      className="inline-flex flex-row-reverse items-center gap-1 rounded-md px-1.5 py-0.5 text-[9px] text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
                                      aria-label="إخفاء الشارة من البطاقة"
                                      title="إخفاء الشارة من البطاقة"
                                  >
                                      <EyeOff size={10} strokeWidth={2.25} />
                                      <span>إخفاء</span>
                                  </button>
                                  <button
                                      type="button"
                                      onClick={() => setOpenKey(null)}
                                      className="rounded-md px-1.5 py-0.5 text-[10px] text-slate-500 transition-colors hover:bg-white/5 hover:text-slate-300"
                                      aria-label="إغلاق"
                                  >
                                      ✕
                                  </button>
                              </div>
                          </div>
                          <ul
                              className="space-y-1 overflow-auto px-0.5 text-right text-[10px] leading-relaxed text-slate-300"
                              style={{ maxHeight: Math.max(64, popoverLayout.maxHeight - 36) }}
                          >
                              {openCategory.items.map((line, idx) => (
                                  <li
                                      key={`${openCategory.key}_${idx}`}
                                      className="flex gap-1.5 rounded-md px-1 py-0.5 hover:bg-white/[0.03]"
                                  >
                                      <span className="shrink-0 tabular-nums text-slate-500">{idx + 1}.</span>
                                      <span className="min-w-0 break-words">{line}</span>
                                  </li>
                              ))}
                          </ul>
                      </div>,
                      document.body
                  )
                : null}
        </>
    );
}
