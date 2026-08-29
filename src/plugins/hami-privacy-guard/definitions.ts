export type HamiPrivacyGuardOptions = {
    recentsCover: boolean;
    windowSecure: boolean;
};

export interface HamiPrivacyPlugin {
    setGuard(options: HamiPrivacyGuardOptions): Promise<void>;
    beginSensitivePrompt(): Promise<void>;
    endSensitivePrompt(): Promise<void>;
}
