import React from 'react';
import { motion } from 'motion/react';
import { Timer, Bell } from '@/app/components/ui/lucideIcons';

interface ObjectionTimerProps {
    docType?: string;
    executionTarget?: string;
    debtNotificationDate: string;
    onDateChange: (date: string) => void;
}

export const ObjectionTimer: React.FC<ObjectionTimerProps> = ({
    docType,
    executionTarget,
    debtNotificationDate,
    onDateChange
}) => {
    // Calculate timer
    const objectionTimer = React.useMemo(() => {
        const isDebtAcknowledgment = docType === 'السندات المتضمنة إقراراً بدين';
        const isJointGuarantor = executionTarget === 'كفيل متضامن';
        
        if ((!isDebtAcknowledgment && !isJointGuarantor) || !debtNotificationDate) {
            return { isActive: false, daysLeft: 0, endDate: '', isExpired: false };
        }
        
        const notificationDate = new Date(debtNotificationDate);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        notificationDate.setHours(0, 0, 0, 0);
        
        const endDate = new Date(notificationDate);
        endDate.setDate(endDate.getDate() + 1 + 7);
        
        const diffTime = endDate.getTime() - today.getTime();
        const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const daysLeft = Math.max(0, daysRemaining);
        const isExpired = daysLeft <= 0;
        
        return {
            isActive: daysLeft > 0,
            daysLeft,
            endDate: endDate.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }),
            isExpired
        };
    }, [docType, executionTarget, debtNotificationDate]);
    
    const shouldShow = docType === 'السندات المتضمنة إقراراً بدين' || executionTarget === 'كفيل متضامن';
    
    if (!shouldShow) return null;
    
    return (
        <div className="w-full bg-indigo-950/20 border border-indigo-900/50 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between mb-3">
                <h4 className="text-indigo-400 font-bold text-sm flex items-center gap-2">
                    <Timer size={18} />
                    حاسبة مدة الاعتراض (7 أيام)
                </h4>
                {objectionTimer.isActive && (
                    <span className="bg-indigo-900/50 text-indigo-300 text-xs px-2 py-1 rounded-full font-bold">
                        متبقي: {objectionTimer.daysLeft} يوم
                    </span>
                )}
                {objectionTimer.isExpired && (
                    <span className="bg-emerald-900/50 text-emerald-300 text-xs px-2 py-1 rounded-full font-bold">
                        ✅ انتهت المهلة
                    </span>
                )}
            </div>
            
            <div className="flex items-center gap-3">
                <span className="text-xs text-gray-400 whitespace-nowrap">تاريخ التبليغ:</span>
                <input 
                    type="date"
                    value={debtNotificationDate}
                    onChange={(e) => onDateChange(e.target.value)}
                    className="flex-1 bg-[#0B1120] border border-gray-700 text-white p-2 rounded-lg text-sm focus:border-indigo-500 outline-none"
                    style={{ direction: 'ltr', textAlign: 'right' }}
                />
            </div>
            
            {objectionTimer.isExpired && debtNotificationDate && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-3 bg-emerald-900/30 border border-emerald-800/50 rounded-lg p-3"
                >
                    <p className="text-emerald-300 text-xs font-bold flex items-center gap-2">
                        <Bell size={14} />
                        🔔 انتهت مدة الـ 7 أيام ولم يُراجع المدين. السند اكتسب القوة التنفيذية، سارع اليوم بطلب إيقاع الحجز التنفيذي!
                    </p>
                </motion.div>
            )}
        </div>
    );
};
