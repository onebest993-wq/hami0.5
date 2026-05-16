/**
 * ═══════════════════════════════════════════════════════════════════════════
 * 💰 ExecutionPaymentsSection - Payments Management Section
 * ═══════════════════════════════════════════════════════════════════════════
 * 
 * Displays and manages payments in execution file
 * يعرض ويدير المدفوعات في ملف التنفيذ
 * 
 * @version 1.0.0
 * @author Hami Legal System - Modular Architecture
 */

import React from 'react';
import { motion } from 'motion/react';
import {
    DollarSign,
    CreditCard,
    Calendar,
    Plus,
    TrendingUp,
    TrendingDown,
    Wallet,
    CheckCircle,
    Filter,
    Download,
    Receipt,
} from 'lucide-react';
import type { Payment } from './types';

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export interface ExecutionPaymentsSectionProps {
    payments: Payment[];
    totalAmount: number;
    paidAmount: number;
    remainingAmount: number;
    onAddPayment?: () => void;
    onEditPayment?: (payment: Payment) => void;
    onDeletePayment?: (paymentId: string) => void;
    onDownloadReceipt?: (paymentId: string) => void;
}

type PaymentMethodFilter = 'all' | Payment['method'];
type PaymentsSortBy = 'date' | 'amount';

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENT METHOD BADGE
// ═══════════════════════════════════════════════════════════════════════════

const PaymentMethodBadge: React.FC<{ method: Payment['method'] }> = ({ method }) => {
    const methodConfig = {
        cash: { text: 'نقد', color: 'bg-green-500/20 text-green-400 border-green-500/30' },
        check: { text: 'شيك', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
        bank_transfer: { text: 'تحويل بنكي', color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' }
    };

    const config = methodConfig[method] || methodConfig.cash;

    return (
        <span className={`px-2 py-1 text-xs rounded-lg border ${config.color}`}>
            {config.text}
        </span>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENT CARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

interface PaymentCardProps {
    payment: Payment;
    onEdit?: (payment: Payment) => void;
    onDelete?: (paymentId: string) => void;
    onDownloadReceipt?: (paymentId: string) => void;
}

const PaymentCard: React.FC<PaymentCardProps> = ({ payment, onEdit, onDelete, onDownloadReceipt }) => {
    return (
        <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-navy-800/50 border border-navy-700 rounded-xl p-4 hover:border-gold-500/30 transition-all cursor-pointer group"
            onClick={() => onEdit?.(payment)}
        >
            <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <p className="text-lg font-bold text-white mb-1">
                            {payment.amount.toLocaleString('ar-IQ')} IQD
                        </p>
                        <div className="flex items-center gap-2">
                            <Calendar className="w-3 h-3 text-gray-500" />
                            <span className="text-xs text-gray-400">
                                {new Date(payment.date).toLocaleDateString('ar-IQ')}
                            </span>
                        </div>
                    </div>
                </div>

                <PaymentMethodBadge method={payment.method} />
            </div>

            {/* Receipt Number */}
            {payment.receiptNumber && (
                <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
                    <Receipt className="w-4 h-4" />
                    <span>رقم الوصل: {payment.receiptNumber}</span>
                </div>
            )}

            {/* Notes */}
            {payment.notes && (
                <p className="text-sm text-gray-400 bg-navy-900/50 p-2 rounded-lg mb-3">
                    {payment.notes}
                </p>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-3 border-t border-navy-700">
                {onDownloadReceipt && (
                    <button type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDownloadReceipt(payment.id);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-900 hover:bg-navy-700 border border-navy-700 rounded-lg transition-colors text-sm text-gray-400 hover:text-gold-400"
                    >
                        <Download className="w-4 h-4" />
                        <span>تحميل الوصل</span>
                    </button>
                )}
                {onDelete && (
                    <button type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(payment.id);
                        }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500 hover:bg-red-600 border border-red-500 rounded-lg transition-colors text-sm text-gray-400 hover:text-white"
                    >
                        <CreditCard className="w-4 h-4" />
                        <span>حذف الدفعة</span>
                    </button>
                )}
                <span className="text-xs text-gray-500 mr-auto">
                    {new Date(payment.createdAt).toLocaleString('ar-IQ')}
                </span>
            </div>
        </motion.div>
    );
};

// ═══════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════

export const ExecutionPaymentsSection = React.memo<ExecutionPaymentsSectionProps>(({
    payments = [],
    totalAmount = 0,
    paidAmount = 0,
    onAddPayment,
    onEditPayment,
    onDeletePayment,
    onDownloadReceipt
}) => {
    const [filterMethod, setFilterMethod] = React.useState<PaymentMethodFilter>('all');
    const [sortBy, setSortBy] = React.useState<PaymentsSortBy>('date');
    const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

    // Calculate statistics with useMemo for performance
    const paymentStats = React.useMemo(() => {
        const cashTotal = (payments || []).filter(p => p.method === 'cash').reduce((s, p) => s + (p.amount || 0), 0);
        const checkTotal = (payments || []).filter(p => p.method === 'check').reduce((s, p) => s + (p.amount || 0), 0);
        const transferTotal = (payments || []).filter(p => p.method === 'bank_transfer').reduce((s, p) => s + (p.amount || 0), 0);
        const safeTotal = totalAmount || 0;
        const safePaid = paidAmount || 0;
        return {
            total: safeTotal,
            paid: safePaid,
            remaining: safeTotal - safePaid,
            percentage: safeTotal > 0 ? Math.round((safePaid / safeTotal) * 100) : 0,
            count: (payments || []).length,
            cashTotal,
            checkTotal,
            transferTotal
        };
    }, [totalAmount, paidAmount, payments]);

    // Filter and sort payments with useMemo
    const filteredAndSortedPayments = React.useMemo(() => {
        let result = [...payments];

        // Filter
        if (filterMethod !== 'all') {
            result = result.filter(p => p.method === filterMethod);
        }

        // Sort
        result.sort((a, b) => {
            if (sortBy === 'date') {
                const comparison = new Date(a.date).getTime() - new Date(b.date).getTime();
                return sortOrder === 'asc' ? comparison : -comparison;
            } else {
                const comparison = a.amount - b.amount;
                return sortOrder === 'asc' ? comparison : -comparison;
            }
        });

        return result;
    }, [payments, filterMethod, sortBy, sortOrder]);

    // ─────────────────────────────────────────────────────────────────────────
    // RENDER
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="space-y-6">
            {/* Section Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-xl flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">المدفوعات</h3>
                        <p className="text-sm text-gray-400">{paymentStats.count} عملية دفع</p>
                    </div>
                </div>

                {/* Add Payment Button */}
                {onAddPayment && (
                    <button type="button"
                        onClick={onAddPayment}
                        className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-gold-500 to-gold-600 hover:from-gold-600 hover:to-gold-700 text-navy-900 font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-gold-500/20"
                    >
                        <Plus className="w-4 h-4" />
                        <span>تسجيل دفعة</span>
                    </button>
                )}
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-3 gap-4">
                {/* Total Amount */}
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 border border-blue-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <Wallet className="w-4 h-4 text-blue-400" />
                        <span className="text-xs text-gray-400">المبلغ الإجمالي</span>
                    </div>
                    <p className="text-2xl font-bold text-white mb-1">
                        {paymentStats.total.toLocaleString('ar-IQ')}
                    </p>
                    <p className="text-xs text-gray-400">دينار عراقي</p>
                </div>

                {/* Paid Amount */}
                <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 border border-green-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp className="w-4 h-4 text-green-400" />
                        <span className="text-xs text-gray-400">المبلغ المدفوع</span>
                    </div>
                    <p className="text-2xl font-bold text-white mb-1">
                        {paymentStats.paid.toLocaleString('ar-IQ')}
                    </p>
                    <p className="text-xs text-green-400">{paymentStats.percentage.toFixed(1)}% من الإجمالي</p>
                </div>

                {/* Remaining Amount */}
                <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/10 border border-amber-500/30 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingDown className="w-4 h-4 text-amber-400" />
                        <span className="text-xs text-gray-400">المبلغ المتبقي</span>
                    </div>
                    <p className="text-2xl font-bold text-white mb-1">
                        {paymentStats.remaining.toLocaleString('ar-IQ')}
                    </p>
                    <p className="text-xs text-amber-400">{(100 - paymentStats.percentage).toFixed(1)}% متبقي</p>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">نسبة التحصيل</span>
                    <span className="text-gold-400 font-semibold">{paymentStats.percentage.toFixed(1)}%</span>
                </div>
                <div className="h-3 bg-navy-900/50 rounded-full overflow-hidden">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${paymentStats.percentage}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="h-full bg-gradient-to-r from-green-500 to-green-400 rounded-full"
                    />
                </div>
            </div>

            {/* Payment Method Stats */}
            <div className="grid grid-cols-3 gap-3">
                <div className="bg-navy-800/30 border border-navy-700 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">نقد</p>
                    <p className="text-sm font-semibold text-green-400">
                        {paymentStats.cashTotal.toLocaleString('ar-IQ')} IQD
                    </p>
                </div>
                <div className="bg-navy-800/30 border border-navy-700 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">شيكات</p>
                    <p className="text-sm font-semibold text-blue-400">
                        {paymentStats.checkTotal.toLocaleString('ar-IQ')} IQD
                    </p>
                </div>
                <div className="bg-navy-800/30 border border-navy-700 rounded-lg p-3">
                    <p className="text-xs text-gray-400 mb-1">تحويل بنكي</p>
                    <p className="text-sm font-semibold text-purple-400">
                        {paymentStats.transferTotal.toLocaleString('ar-IQ')} IQD
                    </p>
                </div>
            </div>

            {/* Filters & Sort */}
            <div className="flex items-center gap-3">
                {/* Filter */}
                <div className="flex items-center gap-2 flex-1">
                    <Filter className="w-4 h-4 text-gray-500" />
                    <select
                        value={filterMethod}
                        onChange={(e) => setFilterMethod(e.target.value as PaymentMethodFilter)}
                        className="flex-1 bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold-500"
                    >
                        <option value="all">كل الطرق</option>
                        <option value="cash">نقد فقط</option>
                        <option value="check">شيك فقط</option>
                        <option value="bank_transfer">تحويل بنكي فقط</option>
                    </select>
                </div>

                {/* Sort */}
                <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as PaymentsSortBy)}
                    className="bg-navy-800 border border-navy-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-gold-500"
                >
                    <option value="date">ترتيب حسب التاريخ</option>
                    <option value="amount">ترتيب حسب المبلغ</option>
                </select>
            </div>

            {/* Payments List */}
            <div className="space-y-3">
                {filteredAndSortedPayments.length > 0 ? (
                    filteredAndSortedPayments.map((payment) => (
                        <PaymentCard
                            key={payment.id}
                            payment={payment}
                            onEdit={onEditPayment}
                            onDelete={onDeletePayment}
                            onDownloadReceipt={onDownloadReceipt}
                        />
                    ))
                ) : (
                    <div className="text-center py-12 bg-navy-900/30 border border-dashed border-navy-700 rounded-xl">
                        <Wallet className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                        <p className="text-gray-400 mb-4">
                            {filterMethod === 'all' ? 'لا توجد مدفوعات مسجلة' : 'لا توجد مدفوعات بهذا النوع'}
                        </p>
                        {onAddPayment && filterMethod === 'all' && (
                            <button type="button"
                                onClick={onAddPayment}
                                className="px-4 py-2 bg-gold-500 hover:bg-gold-600 text-navy-900 font-semibold rounded-lg transition-colors"
                            >
                                تسجيل أول دفعة
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
});

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export default ExecutionPaymentsSection;