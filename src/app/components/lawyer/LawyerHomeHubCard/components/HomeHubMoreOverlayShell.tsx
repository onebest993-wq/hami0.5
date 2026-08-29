import {
    useLayoutEffect,
    useRef,
    type KeyboardEvent,
    type ReactElement,
    type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import '../homeHubOverlayFx.css';
import { X } from '@/app/components/ui/icons/X';
import { useMobileKeyboardInset } from '@/app/hooks/useMobileKeyboardInset';
import { HUB_CONTENT_BUTTON_A11Y } from '../homeHub/homeHubA11y';
import { homeHubKeyboardFeedStyle } from '../homeHub/homeHubKeyboardFeedStyle';
import type { HomeHubOverlayBackId } from '../homeHub/homeHubOverlayBackStack';
import { trapHomeHubOverlayTabKey } from '../homeHub/homeHubOverlayFocusTrap';
import { useHomeHubOverlaySheet } from '../hooks/useHomeHubOverlaySheet';
import { HomeHubOverlaySheetHandle } from './HomeHubOverlaySheetHandle';

type HomeHubMoreOverlayShellProps = {
    open: boolean;
    overlayId: HomeHubOverlayBackId;
    onClose: () => void;
    testId: string;
    panelTestId: string;
    ariaLabel: string;
    backdropAriaLabel: string;
    title: string;
    subtitle: string;
    count: number;
    children: ReactNode;
    leading?: ReactNode;
    bodyClassName?: string;
    sheetId?: string;
    closeTestId?: string;
    closeIconSize?: number;
    closeStrokeWidth?: number;
    countBadgeAriaHidden?: boolean;
    ssrWithoutPortal?: boolean;
};

export function HomeHubMoreOverlayShell({
    open,
    overlayId,
    onClose,
    testId,
    panelTestId,
    ariaLabel,
    backdropAriaLabel,
    title,
    subtitle,
    count,
    children,
    leading,
    bodyClassName,
    sheetId,
    closeTestId = `${testId}-close`,
    closeIconSize = 18,
    closeStrokeWidth = 2.2,
    countBadgeAriaHidden = false,
    ssrWithoutPortal = false,
}: HomeHubMoreOverlayShellProps): ReactElement | null {
    const { requestBack } = useHomeHubOverlaySheet(open, onClose, overlayId);
    const keyboardInset = useMobileKeyboardInset(open);
    const sheetRef = useRef<HTMLDivElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);

    useLayoutEffect(() => {
        if (!open) return;
        closeRef.current?.focus({ preventScroll: true });
    }, [open]);

    const onSheetKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        trapHomeHubOverlayTabKey(event, sheetRef.current);
    };

    if (!open) return null;

    const layer = (
        <div
            className="hami-hub-radar-overlay"
            data-testid={testId}
            data-hami-overlay-safe="1"
            role="dialog"
            aria-modal="true"
            aria-label={ariaLabel}
            dir="rtl"
            style={homeHubKeyboardFeedStyle(keyboardInset)}
        >
            <button
                type="button"
                className="hami-hub-radar-overlay__backdrop"
                aria-label={backdropAriaLabel}
                tabIndex={-1}
                onClick={requestBack}
            />
            <div
                ref={sheetRef}
                id={sheetId ?? panelTestId}
                className="hami-hub-radar-overlay__sheet hami-sovereign-glass hami-sovereign-rim"
                data-testid={panelTestId}
                onKeyDown={onSheetKeyDown}
            >
                <div className="hami-hub-radar-overlay__rim" aria-hidden />
                <HomeHubOverlaySheetHandle enabled={open} onClose={requestBack} />

                <header className="hami-hub-radar-overlay__head">
                    <div className="hami-hub-radar-overlay__head-main">
                        {leading}
                        <div className="min-w-0">
                            <p className="hami-hub-radar-overlay__title" role="heading" aria-level={2}>
                                {title}
                            </p>
                            <p className="hami-hub-radar-overlay__subtitle">{subtitle}</p>
                        </div>
                    </div>
                    <div className="hami-hub-radar-overlay__head-actions">
                        <span
                            className="hami-hub-radar-overlay__count-badge"
                            aria-hidden={countBadgeAriaHidden || undefined}
                        >
                            {count}
                        </span>
                        <button
                            ref={closeRef}
                            type="button"
                            data-testid={closeTestId}
                            className={`hami-hub-radar-overlay__close ${HUB_CONTENT_BUTTON_A11Y}`}
                            aria-label="إغلاق"
                            onClick={requestBack}
                        >
                            <X size={closeIconSize} strokeWidth={closeStrokeWidth} aria-hidden />
                        </button>
                    </div>
                </header>

                <div
                    className={
                        bodyClassName
                            ? `hami-hub-radar-overlay__body ${bodyClassName}`
                            : 'hami-hub-radar-overlay__body'
                    }
                >
                    {children}
                </div>
            </div>
        </div>
    );

    if (typeof document !== 'undefined') return createPortal(layer, document.body);
    return ssrWithoutPortal ? layer : null;
}
