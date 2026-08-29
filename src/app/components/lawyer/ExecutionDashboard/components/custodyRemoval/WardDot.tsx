import type { CustodyWardDeliveryStatus } from '@/app/types/custodyWardDelivery';

const STATUS_DOT: Record<CustodyWardDeliveryStatus, string> = {
    pending: 'bg-slate-500',
    scheduled: 'bg-amber-400',
    received_early: 'bg-sky-400',
    received: 'bg-emerald-400',
    not_received: 'bg-rose-400',
};

export function WardDot({ status }: { status: CustodyWardDeliveryStatus }) {
    return (
        <span
            className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ring-2 ring-white/10 ${STATUS_DOT[status]}`}
            aria-hidden
        />
    );
}
