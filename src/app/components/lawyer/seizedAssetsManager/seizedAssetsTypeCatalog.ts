import { Lock } from '@/app/components/ui/icons/Lock';
import { DollarSign } from '@/app/components/ui/icons/DollarSign';
import { Car } from '@/app/components/ui/icons/Car';
import { Home } from '@/app/components/ui/icons/Home';
import { CreditCard } from '@/app/components/ui/icons/CreditCard';
import { Package } from '@/app/components/ui/icons/Package';

export const seizedAssetTypes = [
    { value: 'حجز راتب موظف', icon: DollarSign, color: 'emerald' },
    { value: 'حجز مركبة', icon: Car, color: 'blue' },
    { value: 'حجز عقار', icon: Home, color: 'amber' },
    { value: 'حجز حساب مصرفي', icon: CreditCard, color: 'purple' },
    { value: 'أموال منقولة/قاصة', icon: Package, color: 'indigo' },
];

export function getSeizedAssetIcon(type: string) {
    const match = seizedAssetTypes.find((at) => at.value === type);
    return match ? match.icon : Lock;
}

export function getSeizedAssetColor(type: string) {
    const match = seizedAssetTypes.find((at) => at.value === type);
    return match ? match.color : 'gray';
}
