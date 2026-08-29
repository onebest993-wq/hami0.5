import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
    mergePrivacyKeysIntoPlist,
    missingRequiredPrivacyKeys,
    parsePlistKeyStrings,
    REQUIRED_IOS_PRIVACY_KEYS,
    ensureUiDeviceFamilyHandheld,
    ensureHamiAppUrlScheme,
} from '../../../../scripts/lib/ios-info-plist.mjs';

const root = process.cwd();

const SAMPLE_PLIST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>CFBundleDisplayName</key>
	<string>Hami Legal</string>
</dict>
</plist>
`;

describe('iOS native-ready handoff (Windows cannot generate Xcode)', () => {
    it('القصاصة تحمل مفاتيح Face ID والموقع والكاميرا والميكروفون', () => {
        const snippet = fs.readFileSync(
            path.join(root, 'scripts/native-ready/biometric-ios-Info.plist.snippet.xml'),
            'utf8',
        );
        const keys = parsePlistKeyStrings(snippet);
        for (const required of REQUIRED_IOS_PRIVACY_KEYS) {
            expect(keys[required], required).toBeTruthy();
        }
        expect(missingRequiredPrivacyKeys(snippet)).toEqual([]);
    });

    it('الدمج يضيف المفاتيح مرة واحدة ويُعيد الكتابة دون تكرار', () => {
        const keys = {
            NSFaceIDUsageDescription: 'وجه',
            NSLocationWhenInUseUsageDescription: 'موقع',
            NSCameraUsageDescription: 'كاميرا',
            NSMicrophoneUsageDescription: 'صوت',
        };
        const once = mergePrivacyKeysIntoPlist(SAMPLE_PLIST, keys);
        const twice = mergePrivacyKeysIntoPlist(once, keys);
        expect(twice).toBe(once);
        expect(once.split('NSFaceIDUsageDescription').length - 1).toBe(1);
        expect(missingRequiredPrivacyKeys(once)).toEqual([]);
        expect(parsePlistKeyStrings(once).NSFaceIDUsageDescription).toBe('وجه');
    });

    it('ensureHamiAppUrlScheme يضيف iq.hami.legal مرة واحدة', () => {
        const once = ensureHamiAppUrlScheme(SAMPLE_PLIST);
        const twice = ensureHamiAppUrlScheme(once);
        expect(twice).toBe(once);
        expect(once.split('iq.hami.legal').length - 1).toBe(2);
        expect(once).toContain('CFBundleURLSchemes');
        const existing = ensureHamiAppUrlScheme(
            SAMPLE_PLIST.replace(
                '</dict>',
                '\t<key>CFBundleURLTypes</key>\n\t<array>\n\t\t<dict>\n\t\t\t<key>CFBundleURLSchemes</key>\n\t\t\t<array>\n\t\t\t\t<string>App</string>\n\t\t\t</array>\n\t\t</dict>\n\t</array>\n</dict>',
            ),
        );
        expect(existing).toContain('<string>App</string>');
        expect(existing).toContain('<string>iq.hami.legal</string>');
    });

    it('ensureUiDeviceFamilyHandheld يضيف iPhone+iPad مرة واحدة', () => {
        const once = ensureUiDeviceFamilyHandheld(SAMPLE_PLIST);
        const twice = ensureUiDeviceFamilyHandheld(once);
        expect(twice).toBe(once);
        expect(once.split('UIDeviceFamily').length - 1).toBe(1);
        expect(once).toContain('<integer>1</integer>');
        expect(once).toContain('<integer>2</integer>');
    });

    it('cap-add-ios يرفض غير macOS ولا يولّد ios/ على ويندوز', () => {
        const src = fs.readFileSync(path.join(root, 'scripts/cap-add-ios.mjs'), 'utf8');
        expect(src).toContain("process.platform !== 'darwin'");
        expect(src).toContain('process.exit(2)');
        expect(src).toContain("['exec', '--', 'cap', 'add', 'ios']");
        expect(src).toContain('apply-ios-native-ready');
    });

    it('apply-ios يدمج UIDeviceFamily مع مفاتيح الخصوصية', () => {
        const src = fs.readFileSync(path.join(root, 'scripts/apply-ios-native-ready.mjs'), 'utf8');
        expect(src).toContain('ensureUiDeviceFamilyHandheld');
        expect(src).toContain('ensureHamiAppUrlScheme');
        expect(src).toContain('HamiPrivacyPlugin.swift');
    });

    it('لوحة المفاتيح الأصلية داكنة في الإعداد وفي الإقلاع', () => {
        const cap = fs.readFileSync(path.join(root, 'capacitor.config.ts'), 'utf8');
        expect(cap).toMatch(/style:\s*'DARK'/);
        expect(cap).toContain("autoBackdropColor: 'auto'");
        const boot = fs.readFileSync(path.join(root, 'src/app/runtime/capacitorShellBoot.ts'), 'utf8');
        expect(boot).toContain('KeyboardStyle.Dark');
        expect(boot).toContain('Keyboard.setStyle');
        const stub = fs.readFileSync(
            path.join(root, 'src/app/runtime/capacitorWebShims/pluginStub.ts'),
            'utf8',
        );
        expect(stub).toContain('KeyboardStyle');
        expect(stub).toContain('setStyle');
    });
});
