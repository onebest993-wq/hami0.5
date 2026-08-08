/**
 * Reusable DarkInput component
 * Consistent dark theme input styling
 */

import React from 'react';

interface DarkInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    icon?: React.ReactNode;
    error?: string;
}

export const DarkInput = React.memo<DarkInputProps>(({ 
    icon,
    error,
    className = '', 
    ...props 
}) => {
    return (
        <div className="w-full">
            <div className={`flex items-center gap-2 bg-[#0B1120] border ${error ? 'border-red-500' : 'border-gray-700'} rounded-lg p-3 focus-within:border-blue-500 transition-colors ${className}`}>
                {icon && <div className="text-gray-500 flex-shrink-0">{icon}</div>}
                <input 
                    className="flex-1 bg-transparent text-white outline-none placeholder:text-gray-500"
                    {...props}
                />
            </div>
            {error && (
                <p className="text-red-400 text-xs mt-1">{error}</p>
            )}
        </div>
    );
});

DarkInput.displayName = 'DarkInput';
