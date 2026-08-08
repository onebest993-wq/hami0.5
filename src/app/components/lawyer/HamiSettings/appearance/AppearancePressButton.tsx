import React, { useRef } from 'react';

type AppearancePressButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
    onPress: () => void;
};

/** ضغطة لمس واحدة — لا يُعاد التفعيل من click بعد pointerdown (يمنع التبديل المزدوج). */
export function AppearancePressButton({
    onPress,
    onPointerDown,
    onClick,
    onPointerCancel,
    type = 'button',
    ...rest
}: AppearancePressButtonProps) {
    const commitRef = useRef(false);

    return (
        <button
            {...rest}
            type={type}
            onPointerDown={(event) => {
                onPointerDown?.(event);
                if (event.defaultPrevented) return;
                if (event.button !== 0) return;
                event.stopPropagation();
                commitRef.current = true;
                onPress();
            }}
            onPointerCancel={(event) => {
                onPointerCancel?.(event);
                commitRef.current = false;
            }}
            onClick={(event) => {
                onClick?.(event);
                if (event.defaultPrevented) return;
                event.preventDefault();
                event.stopPropagation();
                if (commitRef.current) {
                    commitRef.current = false;
                    return;
                }
                onPress();
            }}
        />
    );
}
