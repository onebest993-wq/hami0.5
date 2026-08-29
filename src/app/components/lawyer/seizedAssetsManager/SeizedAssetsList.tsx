import React from 'react';
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
                {assets.length === 0 && !showAddForm && (
                    <div className="text-center py-12">
                        <Lock size={48} className="text-slate-600 mx-auto mb-4" />
                        <p className="text-slate-400 text-lg">لا توجد أموال محجوزة حالياً</p>
                        <p className="text-slate-500 text-sm mt-2">قم بإضافة طلب حجز جديد للبدء</p>
                    </div>
                )}

                <div className="space-y-4">
                    {assets.map(asset => {
                        const IconComponent = getSeizedAssetIcon(asset.type);
                        const color = getSeizedAssetColor(asset.type);
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
        </>
    );
}
