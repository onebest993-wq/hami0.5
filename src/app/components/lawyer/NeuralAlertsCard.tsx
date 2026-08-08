import React, { useCallback, useEffect, useState } from 'react';
import useEmblaCarousel from 'embla-carousel-react';
import { Bell } from '@/app/components/ui/lucideIcons';
import { SmartToast } from '@/app/components/ui/SmartToast';
import { useNeuralAlerts } from './NeuralAlertsCard/useNeuralAlerts';
import { AlertCardItem, CarouselDots, EmptyAlertsCard } from './NeuralAlertsCard/AlertCardItem';
import { safeString } from './NeuralAlertsCard/constants';
import type { SmartAlert } from './NeuralAlertsCard/types';

interface NeuralAlertsCardProps {
    onOpenDrafter: (caseId: string) => void;
    onOpenScanner: (caseId: string) => void;
    onOpenWhatsApp: (phone: string, message: string) => void;
}

export const NeuralAlertsCard: React.FC<NeuralAlertsCardProps> = ({ onOpenDrafter, onOpenScanner, onOpenWhatsApp }) => {
    const { alerts, dismiss } = useNeuralAlerts();
    const [emblaRef, emblaApi] = useEmblaCarousel({ direction: 'rtl', loop: false });
    const [activeIndex, setActiveIndex] = useState(0);

    const onSelect = useCallback((api: { selectedScrollSnap: () => number }) => {
        setActiveIndex(api.selectedScrollSnap());
    }, []);

    useEffect(() => {
        if (!emblaApi) return;
        emblaApi.on('select', onSelect);
        onSelect(emblaApi);
    }, [emblaApi, onSelect]);

    const handleAction = useCallback((alert: SmartAlert) => {
        try {
            const p = alert.payload;
            const caseId = safeString(p.caseId);
            const phone = safeString(p.phone);
            const msg = safeString(p.msg, 'نص افتراضي');

            switch (alert.actionType) {
                case 'openDrafter':
                    if (caseId) { onOpenDrafter(caseId); }
                    else { SmartToast.error('لم يتم العثور على معرف الدعوى'); }
                    break;
                case 'openScanner':
                    if (caseId) { onOpenScanner(caseId); }
                    else { SmartToast.error('لم يتم العثور على معرف الدعوى'); }
                    break;
                case 'sendWhatsApp':
                    if (phone) { onOpenWhatsApp(phone, msg); }
                    else { SmartToast.error('رقم الهاتف غير متوفر'); }
                    break;
                case 'sendAutoReminder':
                    if (phone) { onOpenWhatsApp(phone, 'تذكير ودي: موعد سداد الدفعة المستحقة.'); }
                    SmartToast.success('تم تجهيز التذكير الآلي');
                    break;
                case 'openChecklist':
                    SmartToast.info('جاري فتح الإضبارة الرقمية...');
                    break;
            }
        } catch (err) {
            SmartToast.error('حدث خطأ أثناء تنفيذ الإجراء');
            console.error('[NeuralAlerts] Action error:', err);
        }
    }, [onOpenDrafter, onOpenScanner, onOpenWhatsApp]);

    const handleDismiss = useCallback((alertId: string) => {
        dismiss(alertId);
        SmartToast.info('تم إخفاء التنبيه');
    }, [dismiss]);

    const criticalCount = alerts.filter((a) => a.priority === 'critical').length;

    if (alerts.length === 0) return <EmptyAlertsCard />;

    return (
        <div className="w-full flex flex-col items-center relative">
            <div className="w-full flex items-center justify-between mb-2 px-1">
                <div className="flex items-center gap-2">
                    <Bell size={16} className="text-amber-400" />
                    <span className="text-white/60 text-xs font-medium">التنبيهات الذكية</span>
                </div>
                <div className="flex items-center gap-1.5">
                    {criticalCount > 0 && (
                        <div className="bg-red-500/20 text-red-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-500/30">
                            {criticalCount} عاجل
                        </div>
                    )}
                    <div className="bg-white/10 text-white/70 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        {alerts.length} تنبيه{alerts.length !== 1 ? 'ات' : ''}
                    </div>
                </div>
            </div>

            <div className="w-full overflow-hidden" ref={emblaRef} dir="rtl">
                <div className="flex touch-pan-y">
                    {alerts.map((alert) => (
                        <AlertCardItem
                            key={alert.id}
                            alert={alert}
                            onAction={handleAction}
                            onDismiss={handleDismiss}
                        />
                    ))}
                </div>
            </div>

            <CarouselDots count={alerts.length} active={activeIndex} />
        </div>
    );
};
