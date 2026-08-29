import React from 'react';
import type { SeizedMovable, SeizedProperty } from '@/app/types/execution';
import { saveMovableAuctionDateInline } from '../../utils/movableSeizureInlinePersistence.late';
import { saveMovablePublicationInline } from '../../utils/movableSeizureInlinePersistence';
import {
    savePropertyAuctionDateInline,
    savePropertyPublicationInline,
} from '../../utils/propertySeizureInlinePersistence';
import { FIELD, InlineSectionShell } from './seizureInlineSectionsShared';
import { SeizureInlineLateAuctionResultSections } from './SeizureInlineLateAuctionResultSections';
import type { MovableInlineSaveContext } from '../../utils/movableSeizureInlinePersistence';
import type { PropertyInlineSaveContext } from '../../utils/propertySeizureInlinePersistence';

type Theme = {
    btnSave: string;
    publicationTitle: string;
    awardSelected: string;
};

export type SeizureInlineLateSectionsProps = {
    assetKind: 'movable' | 'property';
    entityId: string;
    embedded: boolean;
    focusKey: string | null | undefined;
    section: string | null | undefined;
    theme: Theme;
    status: string;
    needsPub: boolean;
    showAuction: boolean;
    showPublication: boolean;
    showAuctionResult: boolean;
    showReauctionDefault: boolean;
    auctionDecision: unknown;
    auctionDecisionId: string | null | undefined;
    reauctionDecision: unknown;
    reauctionDecisionId: string | null | undefined;
    auctionYmd: string;
    setAuctionYmd: (v: string) => void;
    newspaper: string;
    setNewspaper: (v: string) => void;
    pubDate: string;
    setPubDate: (v: string) => void;
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

export function SeizureInlineLateSections(p: SeizureInlineLateSectionsProps) {
    const {
        assetKind,
        entityId,
        embedded,
        focusKey,
        section,
        theme,
        status,
        needsPub,
        showAuction,
        showPublication,
        showAuctionResult,
        showReauctionDefault,
        auctionDecision,
        auctionDecisionId,
        reauctionDecision,
        reauctionDecisionId,
        auctionYmd,
        setAuctionYmd,
        newspaper,
        setNewspaper,
        pubDate,
        setPubDate,
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
            {showAuction &&
            (embedded ? Boolean(auctionDecision) : auctionDecision || focusKey === 'auction') ? (
                <InlineSectionShell
                    embedded={embedded}
                    sectionId="auction"
                    focusKey={focusKey}
                    title="تسجيل موعد المزايدة"
                    titleClassName="text-[#E6C673]"
                    defaultExpanded={
                        focusKey === 'auction' || section === 'auction' || Boolean(auctionDecision)
                    }
                >
                    <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                        <input
                            type="date"
                            className={FIELD}
                            value={auctionYmd}
                            onChange={(e) => setAuctionYmd(e.target.value)}
                        />
                        <button
                            type="button"
                            className={theme.btnSave}
                            disabled={!auctionDecisionId}
                            onClick={() => {
                                if (!auctionDecisionId) return;
                                const list = entitiesForSave();
                                if (assetKind === 'movable') {
                                    saveMovableAuctionDateInline(
                                        list as SeizedMovable[],
                                        entityId,
                                        auctionDecisionId,
                                        auctionYmd,
                                        saveCtx as MovableInlineSaveContext,
                                    );
                                } else {
                                    savePropertyAuctionDateInline(
                                        list as SeizedProperty[],
                                        entityId,
                                        auctionDecisionId,
                                        auctionYmd,
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

            {showPublication &&
            (embedded
                ? status === 'published' && needsPub
                : section === 'publication' ||
                  (status === 'published' && needsPub) ||
                  Boolean(String(newspaper || pubDate).trim())) ? (
                <InlineSectionShell
                    embedded={embedded}
                    sectionId="publication"
                    focusKey={focusKey}
                    title="تسجيل بيانات النشر والإعلان"
                    titleClassName={theme.publicationTitle}
                    defaultExpanded={focusKey === 'publication' || section === 'publication'}
                >
                    <div className="space-y-2 rounded-2xl border border-white/10 bg-black/20 p-3">
                        <input
                            className={FIELD}
                            placeholder="اسم الصحيفة"
                            value={newspaper}
                            onChange={(e) => setNewspaper(e.target.value)}
                        />
                        <input
                            type="date"
                            className={FIELD}
                            value={pubDate}
                            onChange={(e) => setPubDate(e.target.value)}
                        />
                        <button
                            type="button"
                            className={theme.btnSave}
                            onClick={() => {
                                const list = entitiesForSave();
                                const payload = { newspaperName: newspaper, ymd: pubDate };
                                if (assetKind === 'movable') {
                                    saveMovablePublicationInline(
                                        list as SeizedMovable[],
                                        entityId,
                                        payload,
                                        saveCtx as MovableInlineSaveContext,
                                    );
                                } else {
                                    savePropertyPublicationInline(
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

            <SeizureInlineLateAuctionResultSections
                assetKind={assetKind}
                entityId={entityId}
                embedded={embedded}
                focusKey={focusKey}
                section={section}
                theme={theme}
                status={status}
                needsPub={needsPub}
                showAuctionResult={showAuctionResult}
                showReauctionDefault={showReauctionDefault}
                reauctionDecision={reauctionDecision}
                reauctionDecisionId={reauctionDecisionId}
                auctionOutcome={auctionOutcome}
                setAuctionOutcome={setAuctionOutcome}
                buyerName={buyerName}
                setBuyerName={setBuyerName}
                awardAmount={awardAmount}
                setAwardAmount={setAwardAmount}
                reauctionNotes={reauctionNotes}
                setReauctionNotes={setReauctionNotes}
                entitiesForSave={entitiesForSave}
                saveCtx={saveCtx}
            />
        </>
    );
}
