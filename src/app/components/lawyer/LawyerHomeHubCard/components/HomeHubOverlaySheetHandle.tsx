import { useSheetSwipeDismiss } from '@/app/hooks/useSheetSwipeDismiss';

export type HomeHubOverlaySheetHandleProps = {
    enabled: boolean;
    onClose: () => void;
};

export function HomeHubOverlaySheetHandle({ enabled, onClose }: HomeHubOverlaySheetHandleProps) {
    const swipe = useSheetSwipeDismiss(onClose, { enabled });

    return (
        <div
            className="hami-hub-radar-overlay__handle"
            role="presentation"
            aria-hidden
            {...swipe}
        />
    );
}
