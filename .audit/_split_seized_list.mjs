import fs from 'fs';

const lines = fs
  .readFileSync('src/app/components/lawyer/Modal_Seized_Assets_Manager.tsx', 'utf8')
  .split(/\r?\n/);

// Empty state + list: lines 355-656 (1-based) => 354-655
const body = lines.slice(354, 656).join('\n');

const out = `import React from 'react';
import { Lock } from '@/app/components/ui/icons/Lock';
import { TrendingUp } from '@/app/components/ui/icons/TrendingUp';
import { CheckCircle } from '@/app/components/ui/icons/CheckCircle';
import { Gavel } from '@/app/components/ui/icons/Gavel';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { EXEC_MODAL_TOUCH_TARGET } from '@/app/components/lawyer/ExecutionDashboard/executionModalMobileShell';
import type { SeizedAsset } from './seizedAssetsManagerTypes';
import { getSeizedAssetColor, getSeizedAssetIcon } from './seizedAssetsTypeCatalog';

export function SeizedAssetsList({
    assets,
    showAddForm,
    editingAsset,
    setEditingAsset,
    auctionAsset,
    auctionFormData,
    setAuctionFormData,
    updateAssetStatus,
    saveExpertValuation,
    startAuction,
    completeAuction,
}: {
    assets: SeizedAsset[];
    showAddForm: boolean;
    editingAsset: string | null;
    setEditingAsset: (id: string | null) => void;
    auctionAsset: string | null;
    auctionFormData: any;
    setAuctionFormData: (v: any) => void;
    updateAssetStatus: (assetId: string, newStatus: SeizedAsset['status']) => void;
    saveExpertValuation: (assetId: string, value: number, date: string) => void;
    startAuction: (assetId: string) => void;
    completeAuction: (assetId: string) => void;
}) {
    return (
        <>
${body
  .replace(/getAssetIcon/g, 'getSeizedAssetIcon')
  .replace(/getAssetColor/g, 'getSeizedAssetColor')}
        </>
    );
}
`;

fs.writeFileSync(
  'src/app/components/lawyer/seizedAssetsManager/SeizedAssetsList.tsx',
  out,
);
console.log('list lines', out.split(/\n/).length);
