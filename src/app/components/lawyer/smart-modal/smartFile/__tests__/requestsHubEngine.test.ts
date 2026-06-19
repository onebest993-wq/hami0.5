import { describe, expect, it } from 'vitest';
import {
    buildUnifiedRequests,
    computeRequestStats,
    filterRequests,
    resolveRequestResultLabel,
} from '../requestsHubEngine';

describe('requestsHubEngine', () => {
    it('builds unified requests without task urgency hints', () => {
        const items = buildUnifiedRequests({
            petitions: [
                {
                    id: '1',
                    type: 'منع سفر',
                    reason: 'المدعى عليه',
                    status: '⏳ قيد الانتظار',
                },
            ],
            attachments: [{ id: '2', attachedProperty: 'عقار', status: 'فعّال' }],
        });

        expect(items).toHaveLength(2);
        expect(items[1].kind).toBe('attachment');
        expect(resolveRequestResultLabel(items[0])).toBe('فيما بعد');
    });

    it('filters and computes accept/reject/pending stats', () => {
        const items = buildUnifiedRequests({
            petitions: [
                { id: '1', requestType: 'طلب ألف', status: '⏳ قيد الانتظار (7 أيام)' },
                { id: '2', requestType: 'طلب باء', status: '✅ صدر قرار بالقبول' },
                { id: '3', requestType: 'طلب جيم', status: '❌ صدر قرار بالرفض' },
            ],
            attachments: [],
        });

        const stats = computeRequestStats(items);
        expect(stats.total).toBe(3);
        expect(stats.pending).toBe(1);
        expect(stats.accepted).toBe(1);
        expect(stats.rejected).toBe(1);

        expect(filterRequests(items, 'pending', '').map((i) => i.id)).toEqual(['1']);
        expect(filterRequests(items, 'all', 'باء').map((i) => i.id)).toEqual(['2']);
    });
});
