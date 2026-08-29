import { useReduceMotion } from '@/app/hooks/useReduceMotion';
import { useSheetSwipeDismiss } from '@/app/hooks/useSheetSwipeDismiss';

type HomeHubOverlaySheetHandleProps = {
    enabled: boolean;
    onClose: () => void;
};

export function HomeHubOverlaySheetHandle({ enabled, onClose }: HomeHubOverlaySheetHandleProps) {
    const reduceMotion = useReduceMotion();
    const swipe = useSheetSwipeDismiss(onClose, { enabled: enabled && !reduceMotion });

    return (
        <div
            className="hami-hub-radar-overlay__handle"
            role="presentation"
            aria-hidden
            {...swipe}
        />
    );
}
