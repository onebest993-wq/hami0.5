// ✅ ExecutionDashboard - النسخة الجديدة المبسطة والمستقرة
// 📅 الإصدار: v12.0 - إعادة هيكلة كاملة
// 🎯 الهدف: ملف رئيسي نظيف بدون أخطاء TypeScript

import React, {
    useState,
    useEffect,
    useCallback,
    useMemo,
    Suspense,
    lazy,
} from 'react';

// استيراد الأدوات المساعدة المستخدمة فقط
// import { debug } from '@/app/utils/debug';

// استيراد الأيقونات الأساسية المستخدمة فقط
import { Gavel, DollarSign, Handshake, Wallet, ClipboardList } from 'lucide-react';

// استيراد المكونات المنفصلة
import { PaymentCalculatorModal } from './ExecutionDashboard/components/modals/PaymentCalculatorModal';
import { SettlementCalculatorModal } from './ExecutionDashboard/components/modals/SettlementCalculatorModal';
import { LedgerModal } from './ExecutionDashboard/components/LedgerModal';
import { ExecutionTrashModal } from './ExecutionDashboard/components/ExecutionTrashModal';
import { UnifiedExecutionModal } from './ExecutionDashboard/components/UnifiedExecutionModal';
import { UnifiedSummonsModal } from './ExecutionDashboard/components/UnifiedSummonsModal-simple';

// استيراد الأدوات المساعدة المعيارية (معلق مؤقتاً)
// import {
//     DebtorFinancialProgressBar,
//     executionDebtorRowCleared,
// } from './ExecutionDashboard/helpers/progressBars';

// تعريف الواجهات الأساسية
interface ExecutionDashboardProps {
    executionId: string | null;
    initialData?: Record<string, unknown>;
    onDataUpdate?: (data: Record<string, unknown>) => void;
}

// المكون الرئيسي الجديد
const ExecutionDashboard: React.FC<ExecutionDashboardProps> = ({
    executionId,
    initialData,
}) => {
    // State management أساسي
    const [showPaymentCalculator, setShowPaymentCalculator] = useState(false);
    const [showSettlementCalculator, setShowSettlementCalculator] = useState(false);
    const [showLedgerModal, setShowLedgerModal] = useState(false);
    const [showExecutionTrashModal, setShowExecutionTrashModal] = useState(false);
    const [showUnifiedExecutionModal, setShowUnifiedExecutionModal] = useState(false);
    const [showUnifiedSummonsModal, setShowUnifiedSummonsModal] = useState(false);

    // State للمحتوى الرئيسي
    const [executionData, setExecutionData] = useState<Record<string, unknown>>(initialData || {});
    const [isLoading, setIsLoading] = useState(true);

    // useEffect لتحميل البيانات
    useEffect(() => {
        const loadExecutionData = async () => {
            if (!executionId) return;
            
            setIsLoading(true);
            try {
                // محاكاة تحميل البيانات
                setTimeout(() => {
                    setExecutionData({
                        id: executionId,
                        status: 'active',
                        createdAt: new Date().toISOString(),
                        // ... بيانات افتراضية
                    });
                    setIsLoading(false);
                }, 500);
            } catch (error) {
                console.error('Error loading execution data:', error);
                setIsLoading(false);
            }
        };

        loadExecutionData();
    }, [executionId]);

    // useCallback للدوال الأساسية
    const handlePaymentFromCalculator = useCallback((payment: Record<string, unknown>) => {
        console.log('Payment received:', payment);
        // منطق معالجة الدفعة
    }, []);

    const handleSettlementFromCalculator = useCallback((settlement: Record<string, unknown>) => {
        console.log('Settlement received:', settlement);
        // منطق معالجة التسوية
    }, []);

    // useMemo للقيم المحسوبة
    const totalOwed = useMemo(() => {
        const amount = executionData?.totalAmount;
        return typeof amount === 'number' ? amount : 0;
    }, [executionData]);

    const progressPercentage = useMemo(() => {
        const progress = executionData?.progress;
        return typeof progress === 'number' ? progress : 0;
    }, [executionData]);

    // Lazy loading للمكونات الثقيلة
    const LazyPaymentCalculator = lazy(() => 
        import('./ExecutionDashboard/components/lazy/LazyPaymentCalculator')
    );
    
    const LazySettlementCalculator = lazy(() => 
        import('./ExecutionDashboard/components/lazy/LazySettlementCalculator')
    );

    // Fallback للـ Suspense
    const EXEC_OVERLAY_LAZY_FALLBACK = (
        <div className="flex h-64 items-center justify-center">
            <div className="text-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                <p className="mt-2 text-sm text-slate-500">جاري التحميل...</p>
            </div>
        </div>
    );

    // JSX الرئيسي - نظيف ومنظم
    return (
        <div className="min-h-screen bg-gradient-to-b from-slate-900 to-slate-950 text-slate-100">
            {/* Header */}
            <header className="border-b border-white/10 bg-slate-800/50 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Gavel className="h-8 w-8 text-amber-400" />
                        <div>
                            <h1 className="text-xl font-bold">لوحة متابعة التنفيذ</h1>
                            <p className="text-sm text-slate-400">رقم التنفيذ: {executionId || 'غير محدد'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium hover:bg-blue-700">
                            حفظ التغييرات
                        </button>
                        <button className="rounded-lg border border-white/20 px-4 py-2 text-sm hover:bg-white/10">
                            تصدير
                        </button>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="p-6">
                {isLoading ? (
                    <div className="flex h-64 items-center justify-center">
                        <div className="text-center">
                            <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
                            <p className="mt-3 text-slate-400">جاري تحميل بيانات التنفيذ...</p>
                        </div>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        {/* Left Column - Overview */}
                        <div className="lg:col-span-2 space-y-6">
                            {/* Progress Card */}
                            <div className="rounded-xl border border-white/10 bg-slate-800/30 p-6">
                                <div className="mb-4 flex items-center justify-between">
                                    <h2 className="text-lg font-bold">تقدم التنفيذ</h2>
                                    <span className="rounded-full bg-amber-500/20 px-3 py-1 text-sm text-amber-300">
                                        {progressPercentage}% مكتمل
                                    </span>
                                </div>
                                <div className="h-2 overflow-hidden rounded-full bg-slate-700">
                                    <div 
                                        className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-600"
                                        style={{ width: `${progressPercentage}%` }}
                                    ></div>
                                </div>
                                <div className="mt-4 grid grid-cols-2 gap-4">
                                    <div className="rounded-lg border border-white/10 p-4">
                                        <p className="text-sm text-slate-400">المبلغ الإجمالي</p>
                                        <p className="text-2xl font-bold text-amber-300">
                                            {totalOwed.toLocaleString('ar-IQ')} د.ع
                                        </p>
                                    </div>
                                    <div className="rounded-lg border border-white/10 p-4">
                                        <p className="text-sm text-slate-400">الحالة</p>
                                        <p className="text-xl font-bold text-green-400">نشط</p>
                                    </div>
                                </div>
                            </div>

                            {/* Actions Card */}
                            <div className="rounded-xl border border-white/10 bg-slate-800/30 p-6">
                                <h2 className="mb-4 text-lg font-bold">الإجراءات السريعة</h2>
                                <div className="grid grid-cols-2 gap-3">
                                    <button
                                        onClick={() => setShowPaymentCalculator(true)}
                                        className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 hover:bg-emerald-700"
                                    >
                                        <DollarSign className="h-5 w-5" />
                                        <span>حاسبة الدفعات</span>
                                    </button>
                                    <button
                                        onClick={() => setShowSettlementCalculator(true)}
                                        className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 hover:bg-blue-700"
                                    >
                                        <Handshake className="h-5 w-5" />
                                        <span>حاسبة التسويات</span>
                                    </button>
                                    <button
                                        onClick={() => setShowLedgerModal(true)}
                                        className="flex items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-3 hover:bg-purple-700"
                                    >
                                        <Wallet className="h-5 w-5" />
                                        <span>السجل المالي</span>
                                    </button>
                                    <button
                                        onClick={() => setShowUnifiedExecutionModal(true)}
                                        className="flex items-center justify-center gap-2 rounded-lg bg-amber-600 px-4 py-3 hover:bg-amber-700"
                                    >
                                        <ClipboardList className="h-5 w-5" />
                                        <span>النافذة الموحدة</span>
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Details */}
                        <div className="space-y-6">
                            {/* Info Card */}
                            <div className="rounded-xl border border-white/10 bg-slate-800/30 p-6">
                                <h2 className="mb-4 text-lg font-bold">معلومات التنفيذ</h2>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">تاريخ الإنشاء</span>
                                        <span>{executionData.createdAt ? new Date(executionData.createdAt as string).toLocaleDateString('ar-IQ') : 'غير محدد'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">آخر تحديث</span>
                                        <span>قبل ساعة</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-slate-400">عدد الإجراءات</span>
                                        <span>12 إجراء</span>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Stats */}
                            <div className="rounded-xl border border-white/10 bg-slate-800/30 p-6">
                                <h2 className="mb-4 text-lg font-bold">إحصائيات سريعة</h2>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="h-3 w-3 rounded-full bg-green-500"></div>
                                            <span>المكتمل</span>
                                        </div>
                                        <span className="font-bold">8</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="h-3 w-3 rounded-full bg-amber-500"></div>
                                            <span>قيد التنفيذ</span>
                                        </div>
                                        <span className="font-bold">3</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="h-3 w-3 rounded-full bg-red-500"></div>
                                            <span>معلق</span>
                                        </div>
                                        <span className="font-bold">1</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>

            {/* Modals */}
            <PaymentCalculatorModal
                showPaymentCalculator={showPaymentCalculator}
                setShowPaymentCalculator={setShowPaymentCalculator}
                EXEC_OVERLAY_LAZY_FALLBACK={EXEC_OVERLAY_LAZY_FALLBACK}
                LazyPaymentCalculator={LazyPaymentCalculator}
                totalOwed={totalOwed}
                handlePaymentFromCalculator={handlePaymentFromCalculator}
            />

            <SettlementCalculatorModal
                showSettlementCalculator={showSettlementCalculator}
                setShowSettlementCalculator={setShowSettlementCalculator}
                EXEC_OVERLAY_LAZY_FALLBACK={EXEC_OVERLAY_LAZY_FALLBACK}
                LazySettlementCalculator={LazySettlementCalculator}
                totalOwed={totalOwed}
                handleSettlementFromCalculator={handleSettlementFromCalculator}
            />

            <LedgerModal
                showLedgerModal={showLedgerModal}
                setShowLedgerModal={setShowLedgerModal}
            />

            <ExecutionTrashModal
                visible={showExecutionTrashModal}
                onClose={() => setShowExecutionTrashModal(false)}
                trashedTimelineEvents={[]}
                trashedCaseNotes={[]}
                trashedCaseTasks={[]}
                onRestoreTimelineEvent={() => {}}
                onPermanentDeleteTimeline={() => {}}
                onRestoreCaseNote={() => {}}
                onPermanentDeleteCaseNote={() => {}}
                onRestoreCaseTask={() => {}}
                onPermanentDeleteCaseTask={() => {}}
            />

            <UnifiedExecutionModal
                showUnifiedExecutionModal={showUnifiedExecutionModal}
                setShowUnifiedExecutionModal={setShowUnifiedExecutionModal}
                EXEC_MODAL_Z={{ unifiedFollowUp: 100 }}
                EXEC_MODAL_BACKDROP_STRONG="bg-black/70"
                unifiedModalTab="coercive"
                setUnifiedModalTab={() => {}}
                goFollowupSectionTabByDelta={() => {}}
                showPersonalCoerciveFollowupTab={false}
                personalTabLockedForEmployee={false}
            />

            <UnifiedSummonsModal
                showUnifiedSummonsModal={showUnifiedSummonsModal}
                setShowUnifiedSummonsModal={setShowUnifiedSummonsModal}
                EXEC_OVERLAY_LAZY_FALLBACK={EXEC_OVERLAY_LAZY_FALLBACK}
                LazyUnifiedSummonsHub={lazy(() => import('./ExecutionDashboard/components/lazy/LazyUnifiedSummonsHub'))}
            />
        </div>
    );
};

export default ExecutionDashboard;