import React from 'react';
import type { SeizureAssetKind } from '@/app/domain/seizure/seizureWorkflowTypes';
import { formatNumberInput } from '@/app/utils/execution/amountInput';
import {
    buildExpertNameSlots,
    initialExpertPrice,
    type SeizureInlineEntity,
} from './seizureInlineSectionsShared';

/** Local draft fields synced from the active seizure entity row. */
export function useSeizureInlineEntityDraftState(
    row: SeizureInlineEntity,
    assetKind: SeizureAssetKind,
) {
    const [markLetter, setMarkLetter] = React.useState(String(row.seizureMarkLetterNumber || ''));
    const [markDate, setMarkDate] = React.useState(String(row.seizureMarkDate || ''));
    const [markEntity, setMarkEntity] = React.useState(String(row.seizureMarkEntity || ''));

    const [expertNames, setExpertNames] = React.useState(
        Array.isArray(row.expertNames) && row.expertNames.length ? row.expertNames.join('، ') : '',
    );
    const [expertNameSlots, setExpertNameSlots] = React.useState(() => buildExpertNameSlots(row));
    const [expertDate, setExpertDate] = React.useState(String(row.expertReportDateYmd || ''));
    const [expertPrice, setExpertPrice] = React.useState(() => initialExpertPrice(row, assetKind));

    const [auctionYmd, setAuctionYmd] = React.useState(
        String(row.auctionDateYmd || row.auction?.auctionDateYmd || ''),
    );

    const [newspaper, setNewspaper] = React.useState(String(row.newspaperName || ''));
    const [pubDate, setPubDate] = React.useState(String(row.publicationDateYmd || ''));

    const [auctionOutcome, setAuctionOutcome] = React.useState<'initial_award' | 'no_bidders'>(
        'initial_award',
    );
    const [buyerName, setBuyerName] = React.useState(String(row.initialAwardBuyerName || ''));
    const [awardAmount, setAwardAmount] = React.useState(
        row.initialAwardAmountIqd != null ? formatNumberInput(String(row.initialAwardAmountIqd)) : '',
    );

    const [reauctionNotes, setReauctionNotes] = React.useState(
        String(row.reauctionDefault?.notes || ''),
    );

    React.useEffect(() => {
        setMarkLetter(String(row.seizureMarkLetterNumber || ''));
        setMarkDate(String(row.seizureMarkDate || ''));
        setMarkEntity(String(row.seizureMarkEntity || ''));
        setExpertNameSlots(buildExpertNameSlots(row));
        setExpertNames(
            Array.isArray(row.expertNames) && row.expertNames.length
                ? row.expertNames.join('، ')
                : '',
        );
    }, [row]);

    return {
        markLetter,
        setMarkLetter,
        markDate,
        setMarkDate,
        markEntity,
        setMarkEntity,
        expertNames,
        setExpertNames,
        expertNameSlots,
        setExpertNameSlots,
        expertDate,
        setExpertDate,
        expertPrice,
        setExpertPrice,
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
    };
}
