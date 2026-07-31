import React, { Component, type ErrorInfo, type ReactNode } from 'react';

/** Error boundary بلا lucide — لمسار HomeTab الحرج */
export class HomeLiteErrorBoundary extends Component<
    { children: ReactNode; fallback: ReactNode },
    { hasError: boolean }
> {
    state = { hasError: false };

    static getDerivedStateFromError(): { hasError: boolean } {
        return { hasError: true };
    }

    componentDidCatch(_error: Error, _info: ErrorInfo): void {
        /* fallback يكفي */
    }

    render(): ReactNode {
        if (this.state.hasError) return this.props.fallback;
        return this.props.children;
    }
}
