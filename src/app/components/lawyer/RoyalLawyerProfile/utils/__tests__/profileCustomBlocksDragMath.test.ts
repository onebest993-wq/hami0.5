import { describe, expect, it } from 'vitest';
import { beginProfileBlockDragSession } from '@/app/components/lawyer/RoyalLawyerProfile/utils/profileCustomBlocksDragMath';
import type { PendingDrag } from '@/app/components/lawyer/RoyalLawyerProfile/utils/profileCustomBlocksDragUtils';

describe('beginProfileBlockDragSession', () => {
    it('لا يُلغي الجلسة إن رفضت اللوحة setPointerCapture', () => {
        const canvas = document.createElement('div');
        const item = document.createElement('div') as HTMLDivElement;
        const handle = document.createElement('button');
        Object.defineProperty(canvas, 'getBoundingClientRect', {
            value: () => ({ width: 200, height: 200, top: 0, left: 0, right: 200, bottom: 200, x: 0, y: 0, toJSON() {} }),
        });
        Object.defineProperty(canvas, 'setPointerCapture', {
            value: () => {
                throw new Error('InvalidStateError');
            },
        });
        const pending: PendingDrag = {
            id: 'a',
            block: { id: 'a', kind: 'text', title: 'أ', body: 'نص', order: 0, posX: 10, posY: 10 },
            index: 0,
            pointerId: 9,
            startX: 10,
            startY: 10,
            element: item,
            captureTarget: handle,
        };

        const session = beginProfileBlockDragSession({
            canvas,
            pending,
            clientX: 12,
            clientY: 14,
        });
        expect(session.id).toBe('a');
        expect(session.pointerId).toBe(9);
        expect(item.dataset.dragging).toBe('true');
    });
});
