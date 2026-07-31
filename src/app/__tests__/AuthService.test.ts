/**
 * AuthService removed (Wave 7) — live auth is AuthContext + liveAuthUserId + shellAuth.
 */
import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('AuthService tombstone', () => {
    it('لا يوجد src/app/services/AuthService.ts — المسار الحي AuthContext', () => {
        const zombie = path.join(process.cwd(), 'src/app/services/AuthService.ts');
        expect(fs.existsSync(zombie)).toBe(false);
        const ctx = path.join(process.cwd(), 'src/app/context/AuthContext.tsx');
        expect(fs.existsSync(ctx)).toBe(true);
        const live = path.join(process.cwd(), 'src/app/utils/liveAuthUserId.ts');
        expect(fs.existsSync(live)).toBe(true);
    });
});
