declare module 'motion/react' {
    export const motion: any;
    export const AnimatePresence: any;
    export const LayoutGroup: any;
    export const MotionConfig: any;
    export function useReducedMotion(): boolean | null;
    export function useMotionValue<T>(initial: T): any;
    export function useDragControls(): {
        start: (event: Event | { nativeEvent?: Event }, options?: { snapToCursor?: boolean }) => void;
        cancel: () => void;
        stop: () => void;
    };
    export function animate(...args: any[]): any;
}

declare module 'zustand/react/shallow' {
    export function useShallow<S, U>(selector: (state: S) => U): (state: S) => U;
}

declare namespace React {
    interface HTMLAttributes<T> {
        /** Prefer `inertProps()` — React 18 warns on boolean `inert`. */
        inert?: '';
    }
    interface ImgHTMLAttributes<T> {
        /** Lowercase DOM attribute accepted by React 18. */
        fetchpriority?: 'high' | 'low' | 'auto' | string;
    }
}
