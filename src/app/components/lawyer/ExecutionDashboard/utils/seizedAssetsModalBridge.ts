import type { SeizedAsset } from '@/app/types/execution';

export type ModalSeizedAssetRow = {
    id: string;
    type: string;
    details: Record<string, unknown>;
    status: 'pending' | 'seized' | 'auction' | 'sold';
    expertValue?: number;
    expertDate?: string;
    auctionData?: {
        publicationDate: string;
        auctionDate: string;
        highestBid: number;
        buyerName: string;
    };
};

function mapSeizedStatusToModal(status: string): ModalSeizedAssetRow['status'] {
    if (status === 'auctioned' || status === 'auction') return 'auction';
    if (status === 'seized' || status === 'pending' || status === 'sold') return status;
    return 'pending';
}

function mapModalStatusToSeized(
    status: ModalSeizedAssetRow['status'],
    previous?: SeizedAsset,
): SeizedAsset['status'] {
    if (status === 'auction') return 'auctioned';
    if (previous?.status === 'released') return 'released';
    return status;
}

export function seizedAssetsToModalAssets(assets: SeizedAsset[]): ModalSeizedAssetRow[] {
    return assets.map((asset) => ({
        id: asset.id,
        type: String(asset.type ?? ''),
        details:
            asset.details && typeof asset.details === 'object'
                ? { ...asset.details }
                : asset.description
                  ? { description: asset.description }
                  : {},
        status: mapSeizedStatusToModal(String(asset.status ?? 'pending')),
        expertValue:
            typeof asset.estimatedValue === 'number' && Number.isFinite(asset.estimatedValue)
                ? asset.estimatedValue
                : undefined,
        expertDate: asset.seizureDate,
    }));
}

export function modalAssetsToSeizedAssets(
    modalAssets: ModalSeizedAssetRow[],
    previous: SeizedAsset[],
): SeizedAsset[] {
    const previousById = new Map(previous.map((row) => [row.id, row]));

    return modalAssets.map((row) => {
        const prev = previousById.get(row.id);
        const details =
            row.details && typeof row.details === 'object'
                ? (row.details as Record<string, string>)
                : undefined;
        const description =
            typeof details?.description === 'string'
                ? details.description
                : prev?.description;

        return {
            ...(prev ?? {}),
            id: row.id,
            type: row.type,
            details,
            description,
            status: mapModalStatusToSeized(row.status, prev),
            estimatedValue:
                typeof row.expertValue === 'number' && Number.isFinite(row.expertValue)
                    ? row.expertValue
                    : prev?.estimatedValue,
            seizureDate: row.expertDate ?? prev?.seizureDate,
            notes: prev?.notes,
            note: prev?.note,
            seizure_record_locked: prev?.seizure_record_locked,
            auction_date_ymd: row.auctionData?.auctionDate ?? prev?.auction_date_ymd ?? null,
            sale_price_iqd:
                row.status === 'sold' && row.auctionData?.highestBid
                    ? String(row.auctionData.highestBid)
                    : (prev?.sale_price_iqd ?? null),
            released_at_ymd: prev?.released_at_ymd ?? null,
            seizure_awaiting_sale_price: prev?.seizure_awaiting_sale_price,
            seizure_sale_price_draft: prev?.seizure_sale_price_draft,
        };
    });
}
