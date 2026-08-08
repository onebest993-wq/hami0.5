import React, { createContext } from 'react';

const SettingsSectionActiveContext = createContext(true);

export function SettingsSectionActiveProvider({
    active,
    children,
}: {
    active: boolean;
    children: React.ReactNode;
}) {
    return (
        <SettingsSectionActiveContext.Provider value={active}>{children}</SettingsSectionActiveContext.Provider>
    );
}
