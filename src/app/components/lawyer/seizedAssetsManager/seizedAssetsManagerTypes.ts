export interface SeizedAsset {
    id: string;
    type: string;
    details: any;
    status: 'pending' | 'seized' | 'auction' | 'sold';
    expertValue?: number;
    expertDate?: string;
    auctionData?: {
        publicationDate: string;
        auctionDate: string;
        highestBid: number;
        buyerName: string;
    };
}

export interface ModalSeizedAssetsManagerProps {
    onClose: () => void;
    executionId?: string;
    assets?: SeizedAsset[];
    onUpdateAssets?: (assets: SeizedAsset[]) => void;
}

/** @deprecated Prefer SeizedAsset — kept as local alias name in peels */
export type Asset = SeizedAsset;
