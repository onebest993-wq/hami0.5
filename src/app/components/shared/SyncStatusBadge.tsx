import React from 'react';
import { Cloud, CloudOff, Loader2, Check } from 'lucide-react';
import { motion } from 'motion/react';

interface SyncStatusBadgeProps {
    /**
     * هل المزامنة قيد التنفيذ؟
     */
    isSyncing: boolean;
    
    /**
     * آخر وقت للمزامنة الناجحة (timestamp)
     */
    lastSyncTime: number | null;
    
    /**
     * عدد محاولات الفشل
     */
    failureCount?: number;
    
    /**
     * حجم صغير أو كبير
     */
    size?: 'sm' | 'md' | 'lg';
    
    /**
     * إظهار النص أو الأيقونة فقط
     */
    showText?: boolean;
}

/**
 * Sync Status Badge
 * مؤشر حالة المزامنة التلقائية
 * 
 * الاستخدام:
 * <SyncStatusBadge 
 *   isSyncing={isSyncing} 
 *   lastSyncTime={lastSyncTime}
 * />
 */
export const SyncStatusBadge: React.FC<SyncStatusBadgeProps> = ({
    isSyncing,
    lastSyncTime,
    failureCount = 0,
    size = 'md',
    showText = true
}) => {
    
    // حساب الوقت منذ آخر مزامنة
    const getTimeSinceLastSync = (): string => {
        if (!lastSyncTime) return '';
        
        const now = Date.now();
        const diff = now - lastSyncTime;
        
        const seconds = Math.floor(diff / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (seconds < 60) return 'الآن';
        if (minutes < 60) return `قبل ${minutes} د`;
        if (hours < 24) return `قبل ${hours} س`;
        return 'منذ فترة';
    };
    
    // تحديد الحالة
    const getStatus = () => {
        if (isSyncing) {
            return {
                icon: Loader2,
                text: 'جارٍ المزامنة...',
                color: 'text-blue-400',
                bgColor: 'bg-blue-500/10',
                borderColor: 'border-blue-500/30'
            };
        }
        
        if (failureCount >= 3) {
            return {
                icon: CloudOff,
                text: 'فشل الاتصال',
                color: 'text-red-400',
                bgColor: 'bg-red-500/10',
                borderColor: 'border-red-500/30'
            };
        }
        
        if (lastSyncTime) {
            return {
                icon: Check,
                text: `محفوظ ${getTimeSinceLastSync()}`,
                color: 'text-green-400',
                bgColor: 'bg-green-500/10',
                borderColor: 'border-green-500/30'
            };
        }
        
        return {
            icon: Cloud,
            text: 'في انتظار المزامنة',
            color: 'text-gray-400',
            bgColor: 'bg-gray-500/10',
            borderColor: 'border-gray-500/30'
        };
    };
    
    const status = getStatus();
    const Icon = status.icon;
    
    // أحجام مختلفة
    const sizeClasses = {
        sm: 'h-6 px-2 text-[10px]',
        md: 'h-8 px-3 text-xs',
        lg: 'h-10 px-4 text-sm'
    };
    
    const iconSizes = {
        sm: 12,
        md: 14,
        lg: 16
    };
    
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`
                flex items-center gap-2 rounded-full border
                ${status.bgColor} ${status.borderColor}
                ${sizeClasses[size]}
            `}
            title={status.text}
        >
            <Icon 
                size={iconSizes[size]} 
                className={`${status.color} ${isSyncing ? 'animate-spin' : ''}`}
            />
            
            {showText && (
                <span className={`font-medium ${status.color} whitespace-nowrap`}>
                    {status.text}
                </span>
            )}
        </motion.div>
    );
};

/**
 * Compact Sync Icon (للاستخدام في الأماكن الضيقة)
 */
export const SyncIcon: React.FC<Pick<SyncStatusBadgeProps, 'isSyncing' | 'lastSyncTime' | 'failureCount'>> = (props) => {
    return <SyncStatusBadge {...props} size="sm" showText={false} />;
};
