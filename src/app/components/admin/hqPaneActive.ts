import { createContext, useContext } from 'react';

/** التبويب الظاهر داخل HqKeepAlivePane — الافتراضي true للاختبارات والألواح خارج الغلاف */
export const HqPaneActiveContext = createContext(true);

export function useHqPaneActive(): boolean {
    return useContext(HqPaneActiveContext);
}
