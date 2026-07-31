#!/usr/bin/env node
/**
 * Vite production build for Capacitor debug APKs.
 * Opens shell auth so emulator/device can reach the lawyer dashboard
 * without a live Supabase session (avoids frozen black LawyerBootShell).
 */
import { spawnSync } from 'node:child_process';

const env = {
    ...process.env,
    VITE_SHELL_AUTH_OPEN: 'true',
};

const result = spawnSync('npm', ['run', 'build'], {
    stdio: 'inherit',
    env,
    shell: process.platform === 'win32',
});

process.exit(result.status ?? 1);
