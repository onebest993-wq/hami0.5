import React, { useState } from 'react';
import { addCalendarDaysYmd } from '@/app/utils/employeeSummonsAssignment';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { EXEC_MODAL_BACKDROP_SAFE_PAD } from '@/app/components/lawyer/ExecutionDashboard/executionModalMobileShell';
import type { Asset, ModalSeizedAssetsManagerProps } from './seizedAssetsManager/seizedAssetsManagerTypes';
import { SeizedAssetsModalHeader } from './seizedAssetsManager/SeizedAssetsModalHeader';
import { SeizedAssetsAddForm } from './seizedAssetsManager/SeizedAssetsAddForm';
import { SeizedAssetsList } from './seizedAssetsManager/SeizedAssetsList';

export const ModalSeizedAssetsManager: React.FC<ModalSeizedAssetsManagerProps> = ({ 
    onClose, 
    executionId: _executionId,
    assets: propsAssets, 
    onUpdateAssets: propsOnUpdateAssets 
}) => {
    // Initialize with empty array if no assets provided
    const [localAssets, setLocalAssets] = useState<Asset[]>(propsAssets || []);
    const [showAddForm, setShowAddForm] = useState<boolean>(false);
    const [newAssetType, setNewAssetType] = useState<string>('حجز راتب موظف');
    const [formData, setFormData] = useState<any>({});
    const [editingAsset, setEditingAsset] = useState<string | null>(null);
    const [auctionAsset, setAuctionAsset] = useState<string | null>(null);
    const [auctionFormData, setAuctionFormData] = useState<any>({});

    const assets = propsAssets || localAssets;
    const onUpdateAssets = propsOnUpdateAssets || setLocalAssets;

    const handleAddAsset = () => {
        if (!formData || Object.keys(formData).length === 0) {
            SmartToast.error('يرجى إدخال التفاصيل المطلوبة');
            return;
        }

        const newAsset: Asset = {
            id: Date.now().toString(),
            type: newAssetType,
            details: formData,
            status: 'pending'
        };

        onUpdateAssets([...assets, newAsset]);
        setShowAddForm(false);
        setFormData({});
    };

    const updateAssetStatus = (assetId: string, newStatus: 'pending' | 'seized' | 'auction' | 'sold') => {
        const updated = assets.map(asset => 
            asset.id === assetId ? { ...asset, status: newStatus } : asset
        );
        onUpdateAssets(updated);
    };

    const saveExpertValuation = (assetId: string, value: number, date: string) => {
        const updated = assets.map(asset => 
            asset.id === assetId ? { ...asset, expertValue: value, expertDate: date } : asset
        );
        onUpdateAssets(updated);
        setEditingAsset(null);
    };

    const startAuction = (assetId: string) => {
        const asset = assets.find(a => a.id === assetId);
        if (!asset || asset.status !== 'seized' || !asset.expertValue || asset.expertValue <= 0) {
            SmartToast.warning('لا يمكن بدء المزايدة. يجب أن يكون الأصل محجوزاً ومقدّراً من الخبير.');
            return;
        }
        updateAssetStatus(assetId, 'auction');
        setAuctionAsset(assetId);
    };

    const completeAuction = (assetId: string) => {
        if (!auctionFormData.publicationDate || !auctionFormData.highestBid || !auctionFormData.buyerName) {
            SmartToast.error('يرجى إكمال جميع حقول المزايدة');
            return;
        }

        const updated = assets.map(asset => {
            if (asset.id === assetId) {
                const isMovable = asset.type.includes('مركبة') || asset.type.includes('منقولة');
                const pubYmd = String(auctionFormData.publicationDate || '').trim().slice(0, 10);
                const auctionYmd =
                    /^\d{4}-\d{2}-\d{2}$/.test(pubYmd)
                        ? addCalendarDaysYmd(pubYmd, isMovable ? 10 : 30)
                        : '';

                return {
                    ...asset,
                    status: 'sold' as const,
                    auctionData: {
                        ...auctionFormData,
                        auctionDate: auctionYmd || pubYmd,
                    },
                };
            }
            return asset;
        });

        onUpdateAssets(updated);
        setAuctionAsset(null);
        setAuctionFormData({});
        SmartToast.success('✅ تمت الإحالة القطعية بنجاح! يرجى مراجعة أداة "توزيع الحصيلة" لتوزيع المبلغ.');
    };

    return (
        <div className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_SAFE_PAD}`} onClick={onClose}>
            <div 
                className="bg-slate-900 border-2 border-amber-500/30 rounded-2xl p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto" 
                onClick={(e) => e.stopPropagation()}
            >
                <SeizedAssetsModalHeader onClose={onClose} />

                <SeizedAssetsAddForm
                    showAddForm={showAddForm}
                    onShowAddForm={() => setShowAddForm(true)}
                    newAssetType={newAssetType}
                    setNewAssetType={setNewAssetType}
                    formData={formData}
                    setFormData={setFormData}
                    onCancel={() => {
                        setShowAddForm(false);
                        setFormData({});
                    }}
                    onAdd={handleAddAsset}
                />

                <SeizedAssetsList
                    assets={assets}
                    showAddForm={showAddForm}
                    editingAsset={editingAsset}
                    setEditingAsset={setEditingAsset}
                    auctionAsset={auctionAsset}
                    auctionFormData={auctionFormData}
                    setAuctionFormData={setAuctionFormData}
                    updateAssetStatus={updateAssetStatus}
                    saveExpertValuation={saveExpertValuation}
                    startAuction={startAuction}
                    completeAuction={completeAuction}
                />

                <div className="mt-6 pt-6 border-t border-slate-700">
                    <button type="button"
                        onClick={onClose}
                        className="w-full py-3 px-6 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold transition-colors"
                    >
                        إغلاق
                    </button>
                </div>
            </div>
        </div>
    );
};
