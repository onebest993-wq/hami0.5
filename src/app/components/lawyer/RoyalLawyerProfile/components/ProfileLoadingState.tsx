import React from 'react';

export function ProfileLoadingState() {
    return (
        <div
            className="min-h-screen bg-[#030508] flex flex-col items-center justify-center gap-4"
            data-testid="lawyer-profile-loading"
            aria-busy="true"
        >
            <div className="relative w-16 h-16">
                <div className="absolute inset-0 rounded-full border-2 border-[#E6C673]/20" />
                <div className="absolute inset-0 rounded-full border-2 border-[#E6C673] border-t-transparent animate-spin" />
            </div>
            <p className="text-[#E6C673]/60 text-xs font-bold tracking-widest animate-pulse">الملف المهني</p>
        </div>
    );
}
