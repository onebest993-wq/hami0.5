import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HqMailHealthStrip } from '../HqMailHealthStrip';

describe('HqMailHealthStrip', () => {
    it('لا يدّعي أن البريد غير مضبوط أثناء التحقق', () => {
        render(<HqMailHealthStrip checking />);
        expect(screen.queryByText('يحتاج ضبط')).not.toBeInTheDocument();
        expect(screen.queryByText('قناة الإرسال غير مضبوطة')).not.toBeInTheDocument();
        expect(screen.getByText('جاري التحقق من قناة الإرسال')).toBeInTheDocument();
    });

    it('يعرض الجاهزية بعد وصول النبض', () => {
        render(
            <HqMailHealthStrip
                mail={{ configured: true, channel: 'resend', mailboxMasked: 'ha***@proton.me' }}
            />,
        );
        expect(screen.getByText('قناة الإرسال جاهزة')).toBeInTheDocument();
        expect(screen.getByText('جاهز')).toBeInTheDocument();
        expect(screen.getByText(/ha\*\*\*@proton\.me/)).toBeInTheDocument();
    });

    it('يعرض يحتاج ضبط فقط بعد نبض صريح غير مضبوط', () => {
        render(<HqMailHealthStrip mail={{ configured: false, channel: 'none', mailboxMasked: '' }} />);
        expect(screen.getByText('قناة الإرسال غير مضبوطة')).toBeInTheDocument();
        expect(screen.getByText('يحتاج ضبط')).toBeInTheDocument();
    });

    it('غياب الجلسة لا يدّعي أن البريد غير مضبوط', () => {
        render(<HqMailHealthStrip gated />);
        expect(screen.queryByText('يحتاج ضبط')).not.toBeInTheDocument();
        expect(screen.queryByText('قناة الإرسال غير مضبوطة')).not.toBeInTheDocument();
        expect(screen.getByText('لم تُفحص قناة الإرسال')).toBeInTheDocument();
        expect(screen.getByText('بلا جلسة')).toBeInTheDocument();
    });

    it('لا يعرض قناة خام غير معروفة', () => {
        render(
            <HqMailHealthStrip
                mail={{ configured: true, channel: 'mystery-pipe', mailboxMasked: 'ha***@proton.me' }}
            />,
        );
        expect(screen.queryByText(/mystery-pipe/)).not.toBeInTheDocument();
        expect(screen.getByText(/ha\*\*\*@proton\.me/)).toBeInTheDocument();
    });
});
