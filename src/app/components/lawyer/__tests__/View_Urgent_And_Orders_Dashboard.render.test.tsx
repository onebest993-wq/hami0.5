import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import { ErrorBoundary } from '@/app/components/ui/ErrorBoundary';
import { View_Urgent_And_Orders_Dashboard } from '../View_Urgent_And_Orders_Dashboard';

vi.mock('@/app/context/AuthContext', () => ({
    useAuthSafe: () => ({
        user: { id: 'dev-user-uuid-1' },
        isLoading: false,
        hasRole: () => true,
    }),
}));

describe('View_Urgent_And_Orders_Dashboard render smoke', () => {
    it('renders embedded workspace tab without crashing', () => {
        const errors: Error[] = [];
        render(
            <ErrorBoundary
                onError={(error) => errors.push(error)}
                fallback={<div data-testid="urgent-crash">crash</div>}
            >
                <View_Urgent_And_Orders_Dashboard embeddedInWorkspace />
            </ErrorBoundary>,
        );
        expect(errors).toHaveLength(0);
        expect(screen.queryByTestId('urgent-crash')).toBeNull();
    });
});
