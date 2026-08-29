/**
 * 🧪 UNIT TESTS - CryptoService
 *
 * Test Coverage:
 * - Initialization
 * - Encryption/Decryption
 * - Error Handling
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CryptoService } from '../CryptoService';

describe('CryptoService', () => {
    
    beforeEach(async () => {
        // Initialize before each test
        await CryptoService.initialize('test-password-123');
    });
    
    afterEach(() => {
        // Clean up after each test
        CryptoService.destroy();
    });
    
    describe('Initialization', () => {
        it('should initialize with a password', async () => {
            const service = CryptoService as any;
            expect(service.isInitialized).toBe(true);
            expect(service.masterKey).not.toBeNull();
        });
        
        it('should not reinitialize if already initialized', async () => {
            const service = CryptoService as any;
            expect(service.isInitialized).toBe(true);
            
            await CryptoService.initialize('different-password');
            
            expect(service.isInitialized).toBe(true);
        });
        
        it('should destroy keys properly', () => {
            CryptoService.destroy();
            
            const service = CryptoService as any;
            expect(service.isInitialized).toBe(false);
            expect(service.masterKey).toBeNull();
        });

        it('does not decrypt ciphertext after live user switch', async () => {
            const { setLiveAuthUserId } = await import('@/app/utils/liveAuthUserId');
            CryptoService.destroy();
            setLiveAuthUserId('user-a');
            await CryptoService.initialize('test-password-123');
            const cipher = await CryptoService.encrypt('owner-a-secret');
            setLiveAuthUserId('user-b');
            await CryptoService.initialize('test-password-123');
            await expect(CryptoService.decrypt(cipher)).rejects.toThrow();
            setLiveAuthUserId(null);
        });

        it('refuses to mint a new master key when encrypted lawsuit ciphertext exists on disk', async () => {
            const SecureStoreService = (await import('@/app/services/SecureStoreService')).default;
            const { LAWSUIT_FILES_ACTIVE_KEY } = await import(
                '@/app/services/dossierPersistence/dossierStorageKeys'
            );
            await SecureStoreService.setItem(
                LAWSUIT_FILES_ACTIVE_KEY,
                JSON.stringify([{ id: 1, type: 'lawsuit' }]),
            );
            const raw = await SecureStoreService.peekRawFromDisk(LAWSUIT_FILES_ACTIVE_KEY);
            expect(raw?.startsWith('ENC:') || (raw != null && raw.length > 0)).toBe(true);

            CryptoService.destroy();
            const spyRestore = vi
                .spyOn(
                    CryptoService as unknown as {
                        tryRestoreKeyFromPersistentStore: () => Promise<boolean>;
                    },
                    'tryRestoreKeyFromPersistentStore',
                )
                .mockResolvedValue(false);
            const spySession = vi
                .spyOn(
                    CryptoService as unknown as { tryRestoreKeyFromSession: () => Promise<boolean> },
                    'tryRestoreKeyFromSession',
                )
                .mockResolvedValue(false);
            const spyLegacyShared = vi
                .spyOn(
                    CryptoService as unknown as {
                        tryClaimLegacySharedMasterKey: () => Promise<boolean>;
                    },
                    'tryClaimLegacySharedMasterKey',
                )
                .mockResolvedValue(false);
            const spyLegacyDevice = vi
                .spyOn(
                    CryptoService as unknown as {
                        tryRestoreLegacyDeviceKey: () => Promise<boolean>;
                    },
                    'tryRestoreLegacyDeviceKey',
                )
                .mockResolvedValue(false);
            const spyMint = vi.spyOn(
                CryptoService as unknown as { generateMasterKey: () => Promise<CryptoKey> },
                'generateMasterKey',
            );

            await CryptoService.initialize('unrelated-password-xyz');
            expect(spyMint).not.toHaveBeenCalled();
            expect((CryptoService as unknown as { isInitialized: boolean }).isInitialized).toBe(
                false,
            );

            spyRestore.mockRestore();
            spySession.mockRestore();
            spyLegacyShared.mockRestore();
            spyLegacyDevice.mockRestore();
            spyMint.mockRestore();
            SecureStoreService.deleteItemSync(LAWSUIT_FILES_ACTIVE_KEY);
            CryptoService.destroy();
            await CryptoService.initialize('test-password-123');
            expect((CryptoService as unknown as { isInitialized: boolean }).isInitialized).toBe(
                true,
            );
        });
    });
    
    describe('Encryption & Decryption', () => {
        it('should encrypt and decrypt text correctly', async () => {
            const plaintext = 'محمد أحمد علي - سري جداً';
            
            const ciphertext = await CryptoService.encrypt(plaintext);
            expect(ciphertext).not.toBe(plaintext);
            expect(ciphertext.length).toBeGreaterThan(0);
            
            const decrypted = await CryptoService.decrypt(ciphertext);
            expect(decrypted).toBe(plaintext);
        });
        
        it('should produce different ciphertexts for same plaintext', async () => {
            const plaintext = 'test message';
            
            const ciphertext1 = await CryptoService.encrypt(plaintext);
            const ciphertext2 = await CryptoService.encrypt(plaintext);
            
            expect(ciphertext1).not.toBe(ciphertext2); // Due to random IV
        });
        
        it('should throw error when decrypting invalid data', async () => {
            await expect(
                CryptoService.decrypt('invalid-base64-data')
            ).rejects.toThrow();
        });
        
        it('should handle Arabic text properly', async () => {
            const arabicText = 'النص العربي الطويل مع الأحرف الخاصة !@#$%';
            
            const ciphertext = await CryptoService.encrypt(arabicText);
            const decrypted = await CryptoService.decrypt(ciphertext);
            
            expect(decrypted).toBe(arabicText);
        });
        
        it('should handle empty strings', async () => {
            const plaintext = '';
            
            const ciphertext = await CryptoService.encrypt(plaintext);
            const decrypted = await CryptoService.decrypt(ciphertext);
            
            expect(decrypted).toBe(plaintext);
        });
    });
    
    describe('Error Handling', () => {
        it('hasMasterKey reflects whether a master key is in memory', () => {
            expect(CryptoService.hasMasterKey()).toBe(true);
            CryptoService.destroy();
            expect(CryptoService.hasMasterKey()).toBe(false);
        });

        it('should throw error when encrypting without initialization', async () => {
            CryptoService.destroy();
            
            await expect(
                CryptoService.encrypt('test')
            ).rejects.toThrow('CryptoService not initialized');
        });
        
        it('should throw error when decrypting without initialization', async () => {
            CryptoService.destroy();
            
            await expect(
                CryptoService.decrypt('test')
            ).rejects.toThrow('CryptoService not initialized');
        });
        
        it('should handle corrupted ciphertext gracefully', async () => {
            const validCiphertext = await CryptoService.encrypt('test');
            const corrupted = validCiphertext.slice(0, -5) + 'XXXXX';
            
            await expect(
                CryptoService.decrypt(corrupted)
            ).rejects.toThrow();
        });
    });
});
