import { describe, expect, it } from 'vitest';
import type { SeizedAsset } from '@/app/types/execution';
import {
    modalAssetsToSeizedAssets,
    seizedAssetsToModalAssets,
} from '../seizedAssetsModalBridge';

describe('seizedAssetsModalBridge', () => {
    it('maps auctioned status to modal auction and back', () => {
        const rows: SeizedAsset[] = [
            {
                id: 'a1',
                type: 'حجز مركبة',
                status: 'auctioned',
                estimatedValue: 12_000_000,
                seizureDate: '2026-06-01',
            },
        ];

        const modal = seizedAssetsToModalAssets(rows);
        expect(modal[0]?.status).toBe('auction');

        const restored = modalAssetsToSeizedAssets(
            [{ ...modal[0]!, status: 'sold', auctionData: undefined }],
            rows,
        );
        expect(restored[0]?.status).toBe('sold');
        expect(restored[0]?.estimatedValue).toBe(12_000_000);
    });

    it('preserves released rows when modal maps unknown statuses to pending', () => {
        const rows: SeizedAsset[] = [
            {
                id: 'r1',
                type: 'حجز راتب موظف',
                status: 'released',
                released_at_ymd: '2026-06-10',
            },
        ];

        const modal = seizedAssetsToModalAssets(rows);
        expect(modal[0]?.status).toBe('pending');

        const restored = modalAssetsToSeizedAssets(modal, rows);
        expect(restored[0]?.status).toBe('released');
        expect(restored[0]?.released_at_ymd).toBe('2026-06-10');
    });
});
