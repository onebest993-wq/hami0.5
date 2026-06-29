declare module 'motion/react' {
    export const motion: any;
    export const AnimatePresence: any;
    export const LayoutGroup: any;
}

declare module 'zustand/react/shallow' {
    export function useShallow<S, U>(selector: (state: S) => U): (state: S) => U;
}
