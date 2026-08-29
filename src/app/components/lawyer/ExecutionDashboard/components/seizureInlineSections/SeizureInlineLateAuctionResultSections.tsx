import React from 'react';
import type { SeizedMovable, SeizedProperty } from '@/app/types/execution';
import { formatNumberInput } from '@/app/utils/execution/amountInput';
import { saveMovableAuctionResultInline } from '../../utils/movableSeizureInlinePersistence';
import { saveMovableReauctionDefaultInline } from '../../utils/movableSeizureInlinePersistence.late';
import { savePropertyAuctionResultInline } from '../../utils/propertySeizureInlinePersistence';
import { savePropertyReauctionDefaultInline } from '../../utils/propertySeizureInlinePersistence.reauction';
import { FIELD, InlineSectionShell } from './seizureInlineSectionsShared';
import type { MovableInlineSaveContext } from '../../utils/movableSeizureInlinePersistence';
import type { PropertyInlineSaveContext } from '../../utils/propertySeizureInlinePersistence';

type LateAuctionProps = {
    assetKind: 'movable' | 'property';
    entityId: string;
    embedded: boolean;
    focusKey: string | null | undefined;
    section: string | null | undefined;
    theme: { btnSave: string; awardSelected: string };
    status: string;
    needsPub: boolean;
    showAuctionResult: boolean;
    showReauctionDefault: boolean;
    reauctionDecision: unknown;
    reauctionDecisionId: string | null | undefined;
    auctionOutcome: string;
    setAuctionOutcome: (v: string) => void;
    buyerName: string;
    setBuyerName: (v: string) => void;
    awardAmount: string;
    setAwardAmount: (v: string) => void;
    reauctionNotes: string;
    setReauctionNotes: (v: string) => void;
    entitiesForSave: () => SeizedMovable[] | SeizedProperty[];
    saveCtx: MovableInlineSaveContext | PropertyInlineSaveContext;
};

export function SeizureInlineLateAuctionResultSections(p: LateAuctionProps) {
    const {
        assetKind,
        entityId,
        embedded,
        focusKey,
        section,
        theme,
        status,
        needsPub,
        showAuctionResult,
        showReauctionDefault,
        reauctionDecision,
        reauctionDecisionId,
        auctionOutcome,
        setAuctionOutcome,
        buyerName,
        setBuyerName,
        awardAmount,
        setAwardAmount,
        reauctionNotes,
        setReauctionNotes,
        entitiesForSave,
        saveCtx,
    } = p;

    return (
        <>
            {showAuctionResult &&
            (embedded
                ? status === 'published' && !needsPub
                : section === 'auction_result' ||
                  (status === 'published' && !needsPub) ||
                  Boolean(String(buyerName || awardAmount).trim())) ? (
                <InlineSectionShell
                    embedded={embedded}
                    sectionId="auction_result"
                    focusKey={focusKey}
                    title="تسجيل نتيجة جلسة المزايدة"
                    titleClassName="text-violet-200"
                    defaultExpanded={focusKey === 'auction_result' || section === 'auction_result'}
                >
                    <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={() => setAuctionOutcome('initial_award')}
                                className={`flex-1 rounded-xl border px-2 py-2 text-[10px] font-bold ${
                                    auctionOutcome === 'initial_award'
                                        ? theme.awardSelected
                                        : 'border-white/10 text-slate-400'
                                }`}
                            >
                                إحالة أولية
                            </button>
                            <button
                                type="button"
                                onClick={() => setAuctionOutcome('no_bidders')}
                                className={`flex-1 rounded-xl border px-2 py-2 text-[10px] font-bold ${
                                    auctionOutcome === 'no_bidders'
                                        ? 'border-rose-500/40 bg-rose-500/15 text-rose-100'
                                        : 'border-white/10 text-slate-400'
                                }`}
                            >
                                لا راغب
                            </button>
                        </div>
                        {auctionOutcome === 'initial_award' ? (
                            <>
                                <input
                                    className={FIELD}
                                    placeholder="اسم المشتري"
                                    value={buyerName}
                                    onChange={(e) => setBuyerName(e.target.value)}
                                />
                                <input
                                    className={`${FIELD} font-mono text-right`}
                                    dir="ltr"
                                    placeholder="مبلغ رسو المزاد"
                                    value={awardAmount}
                                    onChange={(e) => setAwardAmount(formatNumberInput(e.target.value))}
                                />
                            </>
                        ) : null}
                        <button
                            type="button"
                            className={theme.btnSave}
                            onClick={() => {
                                const list = entitiesForSave();
                                const payload = {
                                    outcome: auctionOutcome,
                                    buyerName,
                                    amountDisplay: awardAmount,
                                };
                                if (assetKind === 'movable') {
                                    saveMovableAuctionResultInline(
                                        list as SeizedMovable[],
                                        entityId,
                                        payload,
                                        saveCtx as MovableInlineSaveContext,
                                    );
                                } else {
                                    savePropertyAuctionResultInline(
                                        list as SeizedProperty[],
                                        entityId,
                                        payload,
                                        saveCtx as PropertyInlineSaveContext,
                                    );
                                }
                            }}
                        >
                            حفظ
                        </button>
                    </div>
                </InlineSectionShell>
            ) : null}

            {showReauctionDefault &&
            (embedded
                ? Boolean(reauctionDecision)
                : reauctionDecision || focusKey === 'reauction_default') ? (
                <InlineSectionShell
                    embedded={embedded}
                    sectionId="reauction_default"
                    focusKey={focusKey}
                    title="تسجيل النكول / إعادة المزايدة"
                    titleClassName="text-rose-200"
                    defaultExpanded={
                        focusKey === 'reauction_default' ||
                        section === 'reauction_default' ||
                        Boolean(reauctionDecision)
                    }
                >
                    <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                        <textarea
                            className={`${FIELD} min-h-[72px] resize-none`}
                            placeholder="سبب النكول / ملاحظات إعادة المزايدة"
                            value={reauctionNotes}
                            onChange={(e) => setReauctionNotes(e.target.value)}
                        />
                        <button
                            type="button"
                            className={theme.btnSave}
                            disabled={!reauctionDecisionId}
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!reauctionDecisionId) return;
                                const list = entitiesForSave();
                                if (assetKind === 'movable') {
                                    saveMovableReauctionDefaultInline(
                                        list as SeizedMovable[],
                                        entityId,
                                        reauctionDecisionId,
                                        reauctionNotes,
                                        saveCtx as MovableInlineSaveContext,
                                    );
                                } else {
                                    savePropertyReauctionDefaultInline(
                                        list as SeizedProperty[],
                                        entityId,
                                        reauctionDecisionId,
                                        reauctionNotes,
                                        saveCtx as PropertyInlineSaveContext,
                                    );
                                }
                            }}
                        >
                            حفظ
                        </button>
                    </div>
                </InlineSectionShell>
            ) : null}
        </>
    );
}
