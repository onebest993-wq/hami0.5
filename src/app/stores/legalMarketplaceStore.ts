/**
 * سوق المحامين (نموذج): ربط «ابحث عن محامي» مع «طلبات التوكيل» عبر حالة مشتركة + persist.
 */
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { ClientRequest, RequestUrgency } from '@/app/types/common';

export type LawyerDirectoryEntry = {
    id: string;
    name: string;
    title: string;
    specialization: string;
    rating: number;
    reviewCount: number;
    location: string;
    avatar: string;
    verified: boolean;
    responseTime: string;
    successRate: number;
};

const INITIAL_LAWYERS: LawyerDirectoryEntry[] = [
    {
        id: '1',
        name: 'المحامي أحمد محمود العراقي',
        title: 'مستشار قانوني أول',
        specialization: 'قضايا التنفيذ والديون',
        rating: 4.9,
        reviewCount: 120,
        location: 'بغداد، الكرادة',
        avatar: 'https://images.unsplash.com/photo-1556157382-97eda2d62296?w=400',
        verified: true,
        responseTime: '15 دقيقة',
        successRate: 94,
    },
    {
        id: '2',
        name: 'المحامية سارة حسين الموسوي',
        title: 'خبيرة أحوال شخصية',
        specialization: 'قضايا الأسرة والنفقة',
        rating: 4.8,
        reviewCount: 98,
        location: 'بغداد، الجادرية',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
        verified: true,
        responseTime: '20 دقيقة',
        successRate: 91,
    },
    {
        id: '3',
        name: 'المحامي علي رضا الخفاجي',
        title: 'محامي جنائي',
        specialization: 'القضايا الجنائية والجزائية',
        rating: 4.7,
        reviewCount: 156,
        location: 'بغداد، الكاظمية',
        avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400',
        verified: true,
        responseTime: '10 دقائق',
        successRate: 88,
    },
    {
        id: '4',
        name: 'المحامي محمد جاسم البصري',
        title: 'مستشار تجاري وشركات',
        specialization: 'القانون التجاري والشركات',
        rating: 4.9,
        reviewCount: 203,
        location: 'البصرة، العشار',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400',
        verified: true,
        responseTime: '30 دقيقة',
        successRate: 96,
    },
    {
        id: '5',
        name: 'المحامية زينب عبد الحسين',
        title: 'خبيرة القانون المدني',
        specialization: 'قضايا العقارات والملكية',
        rating: 4.8,
        reviewCount: 87,
        location: 'النجف الأشرف',
        avatar: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400',
        verified: true,
        responseTime: '25 دقيقة',
        successRate: 92,
    },
    {
        id: '6',
        name: 'المحامي حسن عدنان الربيعي',
        title: 'محامي إداري',
        specialization: 'القضايا الإدارية والخدمة المدنية',
        rating: 4.6,
        reviewCount: 64,
        location: 'كربلاء المقدسة',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
        verified: true,
        responseTime: '40 دقيقة',
        successRate: 85,
    },
];

export function formatRequestElapsedArabic(createdAtMs: number): string {
    const s = Math.floor((Date.now() - createdAtMs) / 1000);
    if (s < 45) return 'الآن';
    if (s < 3600) return `منذ ${Math.max(1, Math.floor(s / 60))} دقيقة`;
    if (s < 86400) return `منذ ${Math.floor(s / 3600)} ساعة`;
    return `منذ ${Math.floor(s / 86400)} يوم`;
}

function newRequestId(): string {
    return `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export type AddClientRequestInput = {
    clientName: string;
    lawyerId: string;
    typeLabel: string;
    description: string;
    urgency: RequestUrgency;
    price: number;
    requestKind: 'SOS' | 'Consultation' | 'Service';
};

interface LegalMarketplaceState {
    lawyers: LawyerDirectoryEntry[];
    escrowWallet: number;
    lawyerWallet: number;
    requests: ClientRequest[];

    addClientRequest: (input: AddClientRequestInput) => { ok: boolean; error?: 'insufficient_funds' };
    setRequestContacting: (id: string) => void;
    acceptRequest: (id: string) => void;
    rejectRequest: (id: string) => void;
}

export const useLegalMarketplaceStore = create<LegalMarketplaceState>()(
    persist(
        (set, get) => ({
            lawyers: INITIAL_LAWYERS,
            escrowWallet: 500_000,
            lawyerWallet: 0,
            requests: [] as ClientRequest[],

            addClientRequest: (input) => {
                const { escrowWallet, requests } = get();
                if (escrowWallet < input.price) {
                    return { ok: false, error: 'insufficient_funds' };
                }
                const now = Date.now();
                const req: ClientRequest = {
                    id: newRequestId(),
                    clientName: input.clientName,
                    type: input.typeLabel,
                    description: input.description.trim() || '—',
                    urgency: input.urgency,
                    status: 'new',
                    createdAt: formatRequestElapsedArabic(now),
                    createdAtMs: now,
                    lawyerId: input.lawyerId,
                    price: input.price,
                    requestKind: input.requestKind,
                };
                set({
                    escrowWallet: escrowWallet - input.price,
                    requests: [req, ...requests],
                });
                return { ok: true };
            },

            setRequestContacting: (id) => {
                set((state) => ({
                    requests: state.requests.map((r) =>
                        r.id === id && r.status === 'new' ? { ...r, status: 'contacting' as const } : r,
                    ),
                }));
            },

            acceptRequest: (id) => {
                set((state) => {
                    const req = state.requests.find((r) => r.id === id);
                    if (!req || req.status !== 'new') return state;
                    const credit = req.price ?? 0;
                    return {
                        requests: state.requests.map((r) =>
                            r.id === id ? { ...r, status: 'accepted' as const } : r,
                        ),
                        lawyerWallet: state.lawyerWallet + credit,
                    };
                });
            },

            rejectRequest: (id) => {
                set((state) => {
                    const req = state.requests.find((r) => r.id === id);
                    if (!req) return state;
                    const refund = req.status === 'new' || req.status === 'contacting' ? req.price ?? 0 : 0;
                    return {
                        escrowWallet: state.escrowWallet + refund,
                        requests: state.requests.map((r) =>
                            r.id === id ? { ...r, status: 'rejected' as const } : r,
                        ),
                    };
                });
            },
        }),
        {
            name: 'hami-legal-marketplace',
            storage: createJSONStorage(() => localStorage),
            partialize: (s) => ({
                escrowWallet: s.escrowWallet,
                lawyerWallet: s.lawyerWallet,
                requests: s.requests,
            }),
        },
    ),
);
