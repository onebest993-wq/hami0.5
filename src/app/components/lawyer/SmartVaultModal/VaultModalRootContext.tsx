import { createContext, useContext } from 'react';

/** جذر لوحة المخزن — لربط القوائم المنبثقة داخل اللوحة وليس document.body */
export const VaultModalRootContext = createContext<HTMLElement | null>(null);

export function useVaultModalRoot(): HTMLElement | null {
    return useContext(VaultModalRootContext);
}
