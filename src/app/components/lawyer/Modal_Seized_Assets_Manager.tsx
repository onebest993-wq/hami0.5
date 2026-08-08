// @ts-nocheck
import React, { useState } from 'react';
import { addCalendarDaysYmd } from '@/app/utils/employeeSummonsAssignment';
import { X, Plus, Lock, TrendingUp, CheckCircle, Gavel, DollarSign, Car, Home, CreditCard, Package } from '@/app/components/ui/lucideIcons';
import { SmartToast } from '@/app/components/ui/SmartToast';
import {
    EXEC_MODAL_BACKDROP_SAFE_PAD,
    EXEC_MODAL_CLOSE_BTN_CLASS,
    EXEC_MODAL_HEADER_SAFE_TOP,
    EXEC_MODAL_TOUCH_TARGET,
} from '@/app/components/lawyer/ExecutionDashboard/executionModalMobileShell';

interface Asset {
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

interface ModalSeizedAssetsManagerProps {
    onClose: () => void;
    executionId?: string;
    assets?: Asset[];
    onUpdateAssets?: (assets: Asset[]) => void;
}

export const ModalSeizedAssetsManager: React.FC<ModalSeizedAssetsManagerProps> = ({ 
    onClose, 
    executionId,
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

    // Use local assets or props assets
    const assets = propsAssets || localAssets;
    const onUpdateAssets = propsOnUpdateAssets || setLocalAssets;

    // Asset type options
    const assetTypes = [
        { value: 'حجز راتب موظف', icon: DollarSign, color: 'emerald' },
        { value: 'حجز مركبة', icon: Car, color: 'blue' },
        { value: 'حجز عقار', icon: Home, color: 'amber' },
        { value: 'حجز حساب مصرفي', icon: CreditCard, color: 'purple' },
        { value: 'أموال منقولة/قاصة', icon: Package, color: 'indigo' },
    ];

    const getAssetIcon = (type: string) => {
        const match = assetTypes.find(at => at.value === type);
        return match ? match.icon : Lock;
    };

    const getAssetColor = (type: string) => {
        const match = assetTypes.find(at => at.value === type);
        return match ? match.color : 'gray';
    };

    // Handle adding new asset
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

    // Update asset status
    const updateAssetStatus = (assetId: string, newStatus: 'pending' | 'seized' | 'auction' | 'sold') => {
        const updated = assets.map(asset => 
            asset.id === assetId ? { ...asset, status: newStatus } : asset
        );
        onUpdateAssets(updated);
    };

    // Save expert valuation
    const saveExpertValuation = (assetId: string, value: number, date: string) => {
        const updated = assets.map(asset => 
            asset.id === assetId ? { ...asset, expertValue: value, expertDate: date } : asset
        );
        onUpdateAssets(updated);
        setEditingAsset(null);
    };

    // Start auction
    const startAuction = (assetId: string) => {
        const asset = assets.find(a => a.id === assetId);
        if (!asset || asset.status !== 'seized' || !asset.expertValue || asset.expertValue <= 0) {
            SmartToast.warning('لا يمكن بدء المزايدة. يجب أن يكون الأصل محجوزاً ومقدّراً من الخبير.');
            return;
        }
        updateAssetStatus(assetId, 'auction');
        setAuctionAsset(assetId);
    };

    // Complete auction
    const completeAuction = (assetId: string) => {
        if (!auctionFormData.publicationDate || !auctionFormData.highestBid || !auctionFormData.buyerName) {
            SmartToast.error('يرجى إكمال جميع حقول المزايدة');
            return;
        }

        const updated = assets.map(asset => {
            if (asset.id === assetId) {
                // Calculate auction date (تقويم محلي من تاريخ النشر YYYY-MM-DD)
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

    // Render dynamic form fields based on asset type
    const renderFormFields = () => {
        switch (newAssetType) {
            case 'حجز راتب موظف':
                return (
                    <>
                        <div>
                            <label className="block text-slate-400 text-sm mb-2">الوزارة / الدائرة</label>
                            <input
                                type="text"
                                value={formData.ministry || ''}
                                onChange={(e) => setFormData({ ...formData, ministry: e.target.value })}
                                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                                placeholder="مثال: وزارة الصحة"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-sm mb-2">مقدار الاستقطاع</label>
                            <select
                                value={formData.deductionRate || '1/5'}
                                onChange={(e) => setFormData({ ...formData, deductionRate: e.target.value })}
                                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white focus:border-emerald-500 focus:outline-none"
                            >
                                <option value="1/5">خُمس الراتب (1/5)</option>
                                <option value="1/4">ربع الراتب (1/4)</option>
                            </select>
                        </div>
                    </>
                );
            case 'حجز مركبة':
                return (
                    <>
                        <div>
                            <label className="block text-slate-400 text-sm mb-2">مديرية المرور المخاطبة</label>
                            <input
                                type="text"
                                value={formData.trafficDept || ''}
                                onChange={(e) => setFormData({ ...formData, trafficDept: e.target.value })}
                                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none"
                                placeholder="مثال: مرور بغداد الرصافة"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-sm mb-2">رقم اللوحة وصنفها</label>
                            <input
                                type="text"
                                value={formData.plateNumber || ''}
                                onChange={(e) => setFormData({ ...formData, plateNumber: e.target.value })}
                                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white focus:border-blue-500 focus:outline-none"
                                placeholder="مثال: 12345 - بغداد نقل خاص"
                            />
                        </div>
                    </>
                );
            case 'حجز عقار':
                return (
                    <>
                        <div>
                            <label className="block text-slate-400 text-sm mb-2">دائرة التسجيل العقاري</label>
                            <input
                                type="text"
                                value={formData.registryOffice || ''}
                                onChange={(e) => setFormData({ ...formData, registryOffice: e.target.value })}
                                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white focus:border-amber-500 focus:outline-none"
                                placeholder="مثال: تسجيل عقار الكرخ"
                            />
                        </div>
                        <div>
                            <label className="block text-slate-400 text-sm mb-2">رقم العقار والمقاطعة</label>
                            <input
                                type="text"
                                value={formData.propertyNumber || ''}
                                onChange={(e) => setFormData({ ...formData, propertyNumber: e.target.value })}
                                className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white focus:border-amber-500 focus:outline-none"
                                placeholder="مثال: 5/123 الكرادة"
                            />
                        </div>
                    </>
                );
            case 'حجز حساب مصرفي':
                return (
                    <div>
                        <label className="block text-slate-400 text-sm mb-2">اسم المصرف والفرع</label>
                        <input
                            type="text"
                            value={formData.bankName || ''}
                            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                            className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white focus:border-purple-500 focus:outline-none"
                            placeholder="مثال: الرافدين - فرع المنصور"
                        />
                    </div>
                );
            case 'أموال منقولة/قاصة':
                return (
                    <div>
                        <label className="block text-slate-400 text-sm mb-2">وصف الأموال المنقولة</label>
                        <textarea
                            value={formData.description || ''}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-2.5 text-white focus:border-indigo-500 focus:outline-none min-h-[80px]"
                            placeholder="مثال: أثاث منزلي، معدات مكتبية، إلخ..."
                        />
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className={`fixed inset-0 bg-black/80 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 ${EXEC_MODAL_BACKDROP_SAFE_PAD}`} onClick={onClose}>
            <div 
                className="bg-slate-900 border-2 border-amber-500/30 rounded-2xl p-6 w-full max-w-5xl max-h-[90vh] overflow-y-auto" 
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`flex justify-between items-center border-b border-slate-700 pb-4 mb-6 ${EXEC_MODAL_HEADER_SAFE_TOP}`}>
                    <h2 className="text-2xl font-bold text-amber-400 flex items-center gap-3">
                        <Lock size={28} />
                        🔒 إدارة الأموال المحجوزة والمزايدات العلنية
                    </h2>
                    <button type="button" onClick={onClose} className={EXEC_MODAL_CLOSE_BTN_CLASS}>
                        <X size={20} className="text-slate-400" />
                    </button>
                </div>

                {/* Add Asset Button */}
                {!showAddForm && (
                    <button type="button"
                        onClick={() => setShowAddForm(true)}
                        className="w-full mb-6 py-4 px-6 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-3"
                    >
                        <Plus size={24} />
                        + إضافة طلب حجز أموال جديد
                    </button>
                )}

                {/* Add Asset Form */}
                {showAddForm && (
                    <div className="bg-slate-800/50 border border-amber-500/30 rounded-xl p-6 mb-6">
                        <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                            <Plus size={20} className="text-amber-500" />
                            إضافة طلب حجز جديد
                        </h3>

                        <div className="space-y-4">
                            {/* Asset Type Selector */}
                            <div>
                                <label className="block text-slate-400 text-sm mb-2">نوع المال المطلوب حجزه</label>
                                <select
                                    value={newAssetType}
                                    onChange={(e) => {
                                        setNewAssetType(e.target.value);
                                        setFormData({});
                                    }}
                                    className="w-full bg-slate-800/50 border border-slate-600/50 rounded-lg px-4 py-3 text-white focus:border-amber-500 focus:outline-none"
                                >
                                    {assetTypes.map(type => (
                                        <option key={type.value} value={type.value}>{type.value}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Dynamic Form Fields */}
                            {renderFormFields()}

                            {/* Action Buttons */}
                            <div className="flex gap-3 pt-4">
                                <button type="button"
                                    onClick={() => {
                                        setShowAddForm(false);
                                        setFormData({});
                                    }}
                                    className={`${EXEC_MODAL_TOUCH_TARGET} flex-1 py-3 px-4 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold transition-colors`}
                                >
                                    إلغاء
                                </button>
                                <button type="button"
                                    onClick={handleAddAsset}
                                    className={`${EXEC_MODAL_TOUCH_TARGET} flex-1 py-3 px-4 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold transition-colors shadow-lg flex items-center justify-center gap-2`}
                                >
                                    <CheckCircle size={20} />
                                    حفظ وإضافة للمحجوزات
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Assets List */}
                {assets.length === 0 && !showAddForm && (
                    <div className="text-center py-12">
                        <Lock size={48} className="text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400 text-lg">لا توجد أموال محجوزة حالياً</p>
                        <p className="text-slate-500 text-sm mt-2">قم بإضافة طلب حجز جديد للبدء</p>
                    </div>
                )}

                <div className="space-y-4">
                    {assets.map(asset => {
                        const IconComponent = getAssetIcon(asset.type);
                        const color = getAssetColor(asset.type);
                        const isLocked = asset.status !== 'seized' || !asset.expertValue || asset.expertValue <= 0;

                        return (
                            <div 
                                key={asset.id}
                                className={`bg-slate-800/50 border-2 rounded-xl p-5 transition-all ${
                                    asset.status === 'sold' 
                                        ? 'border-emerald-500/50 bg-emerald-900/10' 
                                        : asset.status === 'auction'
                                        ? 'border-amber-500/50'
                                        : asset.status === 'seized'
                                        ? 'border-red-500/50'
                                        : 'border-slate-700'
                                }`}
                            >
                                {/* Asset Header */}
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p-3 rounded-lg bg-${color}-500/20`}>
                                            <IconComponent className={`text-${color}-400`} size={24} />
                                        </div>
                                        <div>
                                            <h4 className="text-white font-bold text-lg">{asset.type}</h4>
                                            <div className="text-slate-400 text-sm mt-1 space-y-0.5">
                                                {Object.entries(asset.details).map(([key, value]) => (
                                                    <p key={key}>{value as string}</p>
                                                ))}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status Badge */}
                                    <div className={`px-4 py-2 rounded-full text-sm font-bold ${
                                        asset.status === 'sold'
                                            ? 'bg-emerald-500/20 text-emerald-300'
                                            : asset.status === 'auction'
                                            ? 'bg-amber-500/20 text-amber-300'
                                            : asset.status === 'seized'
                                            ? 'bg-red-500/20 text-red-300'
                                            : 'bg-slate-700 text-slate-300'
                                    }`}
                                    >
                                        {asset.status === 'pending' && '⏳ قيد إرسال كتاب الحجز'}
                                        {asset.status === 'seized' && '🔴 تم وضع إشارة الحجز التنفيذي'}
                                        {asset.status === 'auction' && '⚖️ قيد إجراءات المزايدة والبيع'}
                                        {asset.status === 'sold' && '✅ تم البيع والإحالة'}
                                    </div>
                                </div>

                                {/* Status Toggle Buttons */}
                                {asset.status === 'pending' && (
                                    <button type="button"
                                        onClick={() => updateAssetStatus(asset.id, 'seized')}
                                        className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                                    >
                                        <CheckCircle size={20} />
                                        ✅ تأكيد وضع إشارة الحجز التنفيذي
                                    </button>
                                )}

                                {/* Expert Valuation Section (Only visible when seized) */}
                                {asset.status === 'seized' && !asset.expertValue && (
                                    <div className="mt-4 p-4 bg-amber-900/20 border border-amber-500/30 rounded-lg">
                                        <h5 className="text-amber-300 font-bold mb-3 flex items-center gap-2">
                                            <TrendingUp size={18} />
                                            📊 التقدير المالي للخبير القضائي
                                        </h5>
                                        
                                        {editingAsset === asset.id ? (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-slate-400 text-sm mb-2">القيمة التقديرية للمال (دينار)</label>
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        pattern="[0-9]*"
                                                        id={`expert-value-${asset.id}`}
                                                        onInput={(e) => {
                                                            const el = e.currentTarget as HTMLInputElement;
                                                            el.value = el.value.replace(/[^\d]/g, '');
                                                        }}
                                                        className="w-full bg-slate-800/50 border border-amber-500/50 rounded-lg px-4 py-2.5 text-white text-lg font-bold focus:border-amber-500 focus:outline-none"
                                                        placeholder="مثال: 50000000"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-slate-400 text-sm mb-2">تاريخ الكشف والتقدير</label>
                                                    <input
                                                        type="date"
                                                        id={`expert-date-${asset.id}`}
                                                        className="w-full bg-slate-800/50 border border-amber-500/50 rounded-lg px-4 py-2.5 text-white focus:border-amber-500 focus:outline-none"
                                                    />
                                                </div>
                                                <div className="flex gap-2">
                                                    <button type="button"
                                                        onClick={() => setEditingAsset(null)}
                                                        className="flex-1 py-2 px-4 rounded-lg bg-slate-700 hover:bg-slate-600 text-white font-bold transition-colors text-sm"
                                                    >
                                                        إلغاء
                                                    </button>
                                                    <button type="button"
                                                        onClick={() => {
                                                            const valueInput = document.getElementById(`expert-value-${asset.id}`) as HTMLInputElement;
                                                            const dateInput = document.getElementById(`expert-date-${asset.id}`) as HTMLInputElement;
                                                            const value = parseFloat(valueInput?.value || '0');
                                                            const date = dateInput?.value || '';
                                                            
                                                            if (value > 0 && date) {
                                                                saveExpertValuation(asset.id, value, date);
                                                            } else {
                                                                SmartToast.error('يرجى إدخال القيمة والتاريخ');
                                                            }
                                                        }}
                                                        className={`${EXEC_MODAL_TOUCH_TARGET} flex-1 py-2 px-4 rounded-lg bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-700 hover:to-yellow-700 text-white font-bold transition-colors text-sm shadow-lg`}
                                                    >
                                                        حفظ التقدير
                                                    </button>
                                                </div>
                                            </div>
                                        ) : (
                                            <button type="button"
                                                onClick={() => setEditingAsset(asset.id)}
                                                className={`${EXEC_MODAL_TOUCH_TARGET} w-full py-2.5 px-4 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold transition-colors text-sm`}
                                            >
                                                + إضافة التقدير من الخبير
                                            </button>
                                        )}
                                    </div>
                                )}

                                {/* Display Expert Valuation */}
                                {asset.expertValue && asset.expertValue > 0 && asset.status !== 'sold' && (
                                    <div className="mt-4 p-4 bg-emerald-900/20 border border-emerald-500/30 rounded-lg">
                                        <p className="text-emerald-300 font-bold text-sm mb-2">✅ التقدير المالي</p>
                                        <p className="text-white text-lg font-bold">
                                            {asset.expertValue.toLocaleString('ar-IQ')} <span className="text-sm text-slate-400">دينار</span>
                                        </p>
                                        <p className="text-slate-400 text-xs mt-1">
                                            تاريخ التقدير: {asset.expertDate ? new Date(asset.expertDate).toLocaleDateString('ar-EG') : '-'}
                                        </p>
                                    </div>
                                )}

                                {/* Auction Button (Locked until seized + valued) */}
                                {asset.status === 'seized' && (
                                    <button type="button"
                                        onClick={() => startAuction(asset.id)}
                                        disabled={isLocked}
                                        className={`w-full mt-4 py-4 px-6 rounded-xl font-bold text-lg transition-all shadow-lg flex items-center justify-center gap-3 ${
                                            isLocked
                                                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                                : 'bg-gradient-to-r from-red-700 to-crimson-700 hover:from-red-800 hover:to-crimson-800 text-white'
                                        }`}
                                    >
                                        {isLocked && <Lock size={24} />}
                                        {!isLocked && <Gavel size={24} />}
                                        🔨 بدء إجراءات المزايدة العلنية
                                    </button>
                                )}

                                {/* Auction Workflow */}
                                {asset.status === 'auction' && auctionAsset === asset.id && (
                                    <div className="mt-4 p-5 bg-red-900/20 border border-red-500/30 rounded-lg">
                                        <h5 className="text-red-300 font-bold mb-4 flex items-center gap-2 text-lg">
                                            <Gavel size={20} />
                                            إجراءات المزايدة العلنية
                                        </h5>
                                        
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-slate-400 text-sm mb-2">تاريخ النشر في الصحف المحلية</label>
                                                <input
                                                    type="date"
                                                    value={auctionFormData.publicationDate || ''}
                                                    onChange={(e) => setAuctionFormData({ ...auctionFormData, publicationDate: e.target.value })}
                                                    className="w-full bg-slate-800/50 border border-red-500/50 rounded-lg px-4 py-2.5 text-white focus:border-red-500 focus:outline-none"
                                                />
                                            </div>

                                            {auctionFormData.publicationDate && (
                                                <>
                                                    <div className="p-3 bg-amber-900/20 border border-amber-500/30 rounded-lg">
                                                        <p className="text-amber-300 text-sm font-bold mb-1">📅 موعد جلسة المزايدة</p>
                                                        <p className="text-white text-lg font-bold">
                                                            {(() => {
                                                                const isMovable = asset.type.includes('مركبة') || asset.type.includes('منقولة');
                                                                const pubDate = new Date(auctionFormData.publicationDate);
                                                                pubDate.setDate(pubDate.getDate() + (isMovable ? 10 : 30));
                                                                return pubDate.toLocaleDateString('ar-EG');
                                                            })()}
                                                        </p>
                                                        <p className="text-slate-400 text-xs mt-1">
                                                            {asset.type.includes('مركبة') || asset.type.includes('منقولة') ? '(بعد 10 أيام - المادة 71)' : '(بعد 30 يوماً - المادة 97)'}
                                                        </p>
                                                    </div>

                                                    <div>
                                                        <label className="block text-slate-400 text-sm mb-2">مبلغ الإحالة الأخير (أعلى عطاء)</label>
                                                        <input
                                                            type="text"
                                                            inputMode="numeric"
                                                            pattern="[0-9]*"
                                                            value={auctionFormData.highestBid || ''}
                                                            onChange={(e) =>
                                                                setAuctionFormData({
                                                                    ...auctionFormData,
                                                                    highestBid: e.target.value.replace(/[^\d]/g, ''),
                                                                })
                                                            }
                                                            className="w-full bg-slate-800/50 border border-red-500/50 rounded-lg px-4 py-2.5 text-white text-lg font-bold focus:border-red-500 focus:outline-none"
                                                            placeholder="مثال: 85000000"
                                                        />
                                                    </div>

                                                    {auctionFormData.highestBid && asset.expertValue && (
                                                        <div className={`p-3 rounded-lg border-2 ${
                                                            parseFloat(auctionFormData.highestBid) >= asset.expertValue * 0.70
                                                                ? 'bg-emerald-900/20 border-emerald-500/50 text-emerald-300'
                                                                : 'bg-rose-900/20 border-rose-500/50 text-rose-300'
                                                        }`}
                                                        >
                                                            <p className="font-bold text-sm">
                                                                {parseFloat(auctionFormData.highestBid) >= asset.expertValue * 0.70 
                                                                    ? '✅ المزايدة مستوفية للشروط القانونية' 
                                                                    : '⛔ البدل أقل من الحد المطلوب'}
                                                            </p>
                                                            <p className="text-xs mt-1">
                                                                النسبة: {((parseFloat(auctionFormData.highestBid) / asset.expertValue) * 100).toFixed(2)}%
                                                            </p>
                                                        </div>
                                                    )}

                                                    <div>
                                                        <label className="block text-slate-400 text-sm mb-2">اسم المشتري (المحال عليه)</label>
                                                        <input
                                                            type="text"
                                                            value={auctionFormData.buyerName || ''}
                                                            onChange={(e) => setAuctionFormData({ ...auctionFormData, buyerName: e.target.value })}
                                                            className="w-full bg-slate-800/50 border border-red-500/50 rounded-lg px-4 py-2.5 text-white focus:border-red-500 focus:outline-none"
                                                            placeholder="الاسم الكامل للمشتري"
                                                        />
                                                    </div>

                                                    <button type="button"
                                                        onClick={() => completeAuction(asset.id)}
                                                        className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 text-white font-bold text-lg transition-all shadow-xl flex items-center justify-center gap-3"
                                                    >
                                                        <CheckCircle size={24} />
                                                        ✅ إحالة قطعية واستيفاء المبلغ
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Sold Status Display */}
                                {asset.status === 'sold' && asset.auctionData && (
                                    <div className="mt-4 p-5 bg-emerald-900/20 border-2 border-emerald-500/50 rounded-lg">
                                        <p className="text-emerald-300 font-bold text-lg mb-3 flex items-center gap-2">
                                            <CheckCircle size={20} />
                                            ✅ تم البيع والإحالة القطعية
                                        </p>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">المشتري:</span>
                                                <span className="text-white font-bold">{asset.auctionData.buyerName}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">مبلغ الإحالة:</span>
                                                <span className="text-emerald-300 font-bold">
                                                    {parseFloat(asset.auctionData.highestBid).toLocaleString('ar-IQ')} دينار
                                                </span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-400">تاريخ المزايدة:</span>
                                                <span className="text-white">{new Date(asset.auctionData.auctionDate).toLocaleDateString('ar-EG')}</span>
                                            </div>
                                        </div>
                                        <div className="mt-4 p-3 bg-indigo-900/20 border border-indigo-500/30 rounded">
                                            <p className="text-indigo-300 text-xs">
                                                💡 يرجى مراجعة أداة "توزيع الحصيلة" لتوزيع المبلغ المحصل
                                            </p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Close Button */}
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
