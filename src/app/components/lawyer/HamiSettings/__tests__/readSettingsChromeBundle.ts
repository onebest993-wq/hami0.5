import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CHROME_DIR = join(process.cwd(), 'src/app/components/lawyer/HamiSettings');

export const SETTINGS_CHROME_FILES = [
    'settingsChrome.css',
    'settingsInstantChrome.css',
    'settingsChromeOverlay.css',
    'settingsChromeCards.css',
] as const;

export function readSettingsChromeBundle(): string {
    return SETTINGS_CHROME_FILES.map((file) => readFileSync(join(CHROME_DIR, file), 'utf8')).join(
        '\n',
    );
}
