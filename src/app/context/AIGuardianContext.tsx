import React, { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { SmartToast } from '@/app/components/ui/SmartToast';
import SecureStoreService from '@/app/services/SecureStoreService';

// --- TYPES ---
export type UserInterest = 'family' | 'criminal' | 'money' | 'property' | 'general';
type StressLevel = 'normal' | 'worried' | 'panic';

interface AIProfile {
    interests: Record<UserInterest, number>; // Points system for each category
    lastActive: number;
    stressLevel: StressLevel;
    visitCount: number;
    topInterest: UserInterest | null;
}

interface AIGuardianContextType {
    profile: AIProfile;
    trackAction: (category: UserInterest, weight?: number, actionName?: string) => void;
    getSuggestion: () => { title: string, subtitle: string, route: string } | null;
    resetMemory: () => void;
}

const AIGuardianContext = createContext<AIGuardianContextType | undefined>(undefined);

// --- LOGIC ---
export const AIGuardianProvider = ({ children }: { children: ReactNode }) => {
    
    // 1. Initial State (Try to load from LocalStorage to keep memory)
    const [profile, setProfile] = useState<AIProfile>(() => {
        const saved = SecureStoreService.getItemSync('ai_guardian_memory');
        const fallback: AIProfile = {
            interests: { family: 0, criminal: 0, money: 0, property: 0, general: 0 },
            lastActive: Date.now(),
            stressLevel: 'normal',
            visitCount: 0,
            topInterest: null,
        };
        if (saved) {
            try {
                const parsed: unknown = JSON.parse(saved);
                if (
                    parsed &&
                    typeof parsed === 'object' &&
                    'interests' in parsed &&
                    typeof (parsed as { interests?: unknown }).interests === 'object' &&
                    (parsed as { interests?: unknown }).interests !== null
                ) {
                    return parsed as AIProfile;
                }
            } catch {
                /* corrupted */
            }
        }
        return fallback;
    });

    // 2. Save to Memory on Change
    useEffect(() => {
        SecureStoreService.setItemSync('ai_guardian_memory', JSON.stringify(profile));
    }, [profile]);

    // 3. The Core Learning Function
    const trackAction = useCallback((category: UserInterest, weight: number = 1, actionName?: string) => {
        setProfile(prev => {
            const newInterests = { ...prev.interests };
            newInterests[category] += weight;

            // Decay others slightly (Focus mechanism)
            Object.keys(newInterests).forEach(k => {
                if (k !== category && newInterests[k as UserInterest] > 0) {
                    newInterests[k as UserInterest] -= 0.1; 
                }
            });

            // Determine Top Interest
            let maxScore = 0;
            let top: UserInterest | null = prev.topInterest;
            (Object.keys(newInterests) as UserInterest[]).forEach(k => {
                if (newInterests[k] > maxScore) {
                    maxScore = newInterests[k];
                    top = k;
                }
            });

            // Analyze Stress (Heuristic)
            let newStress: StressLevel = prev.stressLevel;
            if (category === 'criminal') newStress = 'worried';
            if (actionName?.includes('emergency') || actionName?.includes('police')) newStress = 'panic';

            return {
                ...prev,
                interests: newInterests,
                visitCount: prev.visitCount + 1,
                lastActive: Date.now(),
                topInterest: top,
                stressLevel: newStress
            };
        });
    }, []);

    // 4. The "Hidden Manager" Output
    const getSuggestion = useCallback(() => {
        if (profile.visitCount < 3) return null; // Need more data

        // Panic Mode
        if (profile.stressLevel === 'panic') {
            return {
                title: "أنا أشعر بقلقك",
                subtitle: "تم تفعيل وضع الطوارئ. المحامون الجنائيون مستعدون.",
                route: "emergency"
            };
        }

        // Interest Based Logic
        switch (profile.topInterest) {
            case 'family':
                return {
                    title: "ملفك: الأحوال الشخصية",
                    subtitle: "هل ترغب في استشارة سريعة بخصوص 'النفقة' أو 'الحضانة'؟",
                    route: "lawsuit" // Or consultation
                };
            case 'money':
                return {
                    title: "الديون والمعاملات",
                    subtitle: "لاحظت اهتمامك بالماليات. دعنا نراجع إجراءات التنفيذ.",
                    route: "execution"
                };
            case 'criminal':
                return {
                    title: "الحماية القانونية",
                    subtitle: "القضايا الجزائية حساسة. لا تتصرف بمفردك.",
                    route: "lawsuit"
                };
             case 'property':
                return {
                    title: "العقارات والأملاك",
                    subtitle: "تريد توثيق عقد أو بيع عقار؟",
                    route: "transactions"
                };
            default:
                return null;
        }
    }, [profile]);

    const resetMemory = useCallback(() => {
        setProfile({
            interests: { family: 0, criminal: 0, money: 0, property: 0, general: 0 },
            lastActive: Date.now(),
            stressLevel: 'normal',
            visitCount: 0,
            topInterest: null
        });
        SmartToast.info("تم مسح ذاكرة المساعد الذكي");
    }, []);

    const guardianValue = useMemo(
        () => ({ profile, trackAction, getSuggestion, resetMemory }),
        [profile, trackAction, getSuggestion, resetMemory]
    );

    return (
        <AIGuardianContext.Provider value={guardianValue}>
            {children}
        </AIGuardianContext.Provider>
    );
};

export const useAIGuardian = () => {
    const context = useContext(AIGuardianContext);
    if (!context) throw new Error("useAIGuardian must be used within AIGuardianProvider");
    return context;
};
