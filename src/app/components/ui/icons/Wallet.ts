import { createElement, forwardRef, type SVGProps } from 'react';

type WalletProps = SVGProps<SVGSVGElement> & {
    size?: number | string;
    strokeWidth?: number | string;
};

/**
 * محفظة مخصّصة بلا المسار الجانبي الثقيل (M3 5v14…).
 * ملف .ts واحد كنقطة دخول مثل باقي الأيقونات — يمنع كاش Vite العالق على Wallet.ts المحذوف.
 */
export const Wallet = forwardRef<SVGSVGElement, WalletProps>(function Wallet(
    { className, size = 24, strokeWidth = 2, style, ...props },
    ref,
) {
    const dim = typeof size === 'number' ? `${size}px` : size;
    return createElement(
        'svg',
        {
            ref,
            xmlns: 'http://www.w3.org/2000/svg',
            width: dim,
            height: dim,
            viewBox: '0 0 24 24',
            fill: 'none',
            stroke: 'currentColor',
            strokeWidth,
            strokeLinecap: 'round',
            strokeLinejoin: 'round',
            className,
            style,
            'aria-hidden': props['aria-hidden'] ?? true,
            ...props,
        },
        createElement('path', { d: 'M21 12V7H5a2 2 0 0 1 0-4h14v4' }),
        createElement('path', { d: 'M18 12a2 2 0 0 0 0 4h4v-4Z' }),
    );
});

Wallet.displayName = 'Wallet';

export default Wallet;
