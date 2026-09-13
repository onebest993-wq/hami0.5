import { afterEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { EXECUTION_DOSSIER_TEST_IDS } from '../../executionDossierTestIds';
import {
    ExecutionDashboardErrorView,
    ExecutionDashboardLoadingView,
} from '../ExecutionDashboardStatusViews';

/**
 * **درعُ النقرة الشبح يبتلع أوّل ١٨٠ م.ث — وكان هذا الاختبار ينقر داخلها.**
 *
 * `ExecutionDossierInstantFrame` يُركّب `useOverlayGhostClickShield`: يبتلع `click`
 * و`pointerup` في **طور الالتقاط** مدّة `durationMs = 180` بعد التركيب، كي لا تُغلق
 * الإضبارةَ النقرةُ المتبقّية من اللمسة التي فتحتها. أُضيف في `3b9b03bc`
 * (٢٠٢٦-٠٩-٠٦)، **وسُجّل هذا الاختبار ساقطاً في اليوم نفسه** بدل أن يُحدَّث.
 *
 * وقيس بثلاثة مسابير قبل التعديل: نقرٌ فوريّ ← **٠** استدعاء · بعد ١٠٠ م.ث ← **٠**
 * · بعد ٢٠٠ م.ث ← **١**. فالزرُّ يعمل للمستخدم الحقيقيّ، والاختبارُ وحده قديم.
 *
 * **والتوكيدُ لم يُضعَف:** الخروجُ ما زال يُشترط استدعاؤه مرّةً واحدة. واختبارٌ مضادّ
 * يُثبت أنّ النقرة الفورية تُبتلع — **فحذفُ الدرع يُسقط هذا الملفّ** ولا يمرّ صامتاً.
 */
const GHOST_CLICK_SHIELD_MS = 180;

afterEach(() => {
    vi.useRealTimers();
});

describe('ExecutionDashboardStatusViews', () => {
    it('هيكل التحميل توأم InstantFrame مع خروج 44px يعمل', () => {
        vi.useFakeTimers({ toFake: ['performance'] });
        const onExitToHome = vi.fn();
        render(
            <ExecutionDashboardLoadingView
                file={{ id: 'exec-1', fileNumber: '88', fileYear: '2024' }}
                onExitToHome={onExitToHome}
            />,
        );
        expect(screen.getByText('الإضبارة التنفيذية')).toBeTruthy();
        expect(screen.getByText('88/2024')).toBeTruthy();
        vi.advanceTimersByTime(GHOST_CLICK_SHIELD_MS + 20);
        fireEvent.click(screen.getByTestId(EXECUTION_DOSSIER_TEST_IDS.close));
        expect(onExitToHome).toHaveBeenCalledTimes(1);
    });

    it('النقرةُ الفورية بعد الفتح تُبتلع — درعُ النقرة الشبح قائم', () => {
        vi.useFakeTimers({ toFake: ['performance'] });
        const onExitToHome = vi.fn();
        render(
            <ExecutionDashboardLoadingView
                file={{ id: 'exec-1', fileNumber: '88', fileYear: '2024' }}
                onExitToHome={onExitToHome}
            />,
        );
        fireEvent.click(screen.getByTestId(EXECUTION_DOSSIER_TEST_IDS.close));
        expect(onExitToHome).not.toHaveBeenCalled();
    });

    it('شاشة الخطأ تغلق بلمس 44px', () => {
        const onClose = vi.fn();
        render(<ExecutionDashboardErrorView message="تعذّر القراءة" onClose={onClose} />);
        const close = screen.getByRole('button', { name: 'إغلاق' });
        expect(close.className).toContain('min-h-[44px]');
        expect(close.className).toContain('touch-manipulation');
        fireEvent.click(close);
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
