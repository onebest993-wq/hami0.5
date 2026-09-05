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

        it('restores AES key material from the keystore after destroy', async () => {
            if (typeof indexedDB === 'undefined') return;
            const cipher = await CryptoService.encrypt('reload-secret');
            CryptoService.destroy();
            expect(CryptoService.hasMasterKey()).toBe(false);
            await CryptoService.initialize('test-password-123');
            expect(await CryptoService.decrypt(cipher)).toBe('reload-secret');
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

        it('keeps the AES key when the shell guest hops to the signed-in uid', async () => {
            const { setLiveAuthUserId } = await import('@/app/utils/liveAuthUserId');
            CryptoService.destroy();
            setLiveAuthUserId('guest-lawyer-1');
            await CryptoService.initialize('test-password-123');
            const cipher = await CryptoService.encrypt('hop-secret');
            setLiveAuthUserId('dev-user-uuid-1');
            await CryptoService.initialize('test-password-123');
            expect(await CryptoService.decrypt(cipher)).toBe('hop-secret');
            if (typeof indexedDB !== 'undefined') {
                CryptoService.destroy();
                setLiveAuthUserId('dev-user-uuid-1');
                await CryptoService.initialize('test-password-123');
                expect(await CryptoService.decrypt(cipher)).toBe('hop-secret');
                CryptoService.destroy();
                setLiveAuthUserId('guest-lawyer-1');
                await CryptoService.initialize('test-password-123');
                expect(await CryptoService.decrypt(cipher)).toBe('hop-secret');
                await (
                    CryptoService as unknown as {
                        deleteMasterKeyRecord: (id: string) => Promise<void>;
                    }
                ).deleteMasterKeyRecord('master-key-v3:u:guest-lawyer-1');
                CryptoService.destroy();
                setLiveAuthUserId('guest-lawyer-1');
                await CryptoService.initialize('test-password-123');
                expect(await CryptoService.decrypt(cipher)).toBe('hop-secret');
                CryptoService.destroy();
                setLiveAuthUserId(null);
                await CryptoService.initialize('test-password-123');
                expect(await CryptoService.decrypt(cipher)).toBe('hop-secret');
            }
            setLiveAuthUserId(null);
        });

        it('rehydrates the disk AES key when memory holds a different key', async () => {
            if (typeof indexedDB === 'undefined') return;
            const cipher = await CryptoService.encrypt('rehydrate-secret');
            const random = crypto.getRandomValues(new Uint8Array(32));
            const adopted = await (
                CryptoService as unknown as {
                    adoptMasterKeyFromBits: (bits: ArrayBuffer) => Promise<boolean>;
                }
            ).adoptMasterKeyFromBits(random.buffer.slice(0));
            expect(adopted).toBe(true);
            await expect(CryptoService.decrypt(cipher)).rejects.toThrow();
            expect(await CryptoService.rehydrateMasterKeyFromDisk()).toBe(true);
            expect(await CryptoService.decrypt(cipher)).toBe('rehydrate-secret');
        });

        it('keeps the AES key when live identity flickers to empty', async () => {
            const { setLiveAuthUserId } = await import('@/app/utils/liveAuthUserId');
            CryptoService.destroy();
            setLiveAuthUserId('guest-lawyer-1');
            await CryptoService.initialize('test-password-123');
            const cipher = await CryptoService.encrypt('flicker-secret');
            setLiveAuthUserId(null);
            await CryptoService.initialize('test-password-123');
            expect(await CryptoService.decrypt(cipher)).toBe('flicker-secret');
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

        it('round-trips JSON empty array used by lawsuit segment clears', async () => {
            const ciphertext = await CryptoService.encrypt('[]');
            expect(await CryptoService.decrypt(ciphertext)).toBe('[]');
        });

        it('still decrypts after re-importing the same raw bits', async () => {
            const ciphertext = await CryptoService.encrypt('[]');
            expect(await CryptoService.ensureMasterKeyObjectFromBits()).toBe(true);
            expect((CryptoService as unknown as { masterKeyBits: ArrayBuffer | null }).masterKeyBits?.byteLength).toBe(
                32,
            );
            expect(await CryptoService.decrypt(ciphertext)).toBe('[]');
        });
    });
    
    describe('Error Handling', () => {
        it('keeps the in-memory AES key while pinned even if destroy is called', async () => {
            const cipher = await CryptoService.encrypt('pinned-secret');
            CryptoService.pinMasterKeyForAtomicWrite();
            CryptoService.destroy();
            expect(CryptoService.hasMasterKey()).toBe(true);
            expect(await CryptoService.decrypt(cipher)).toBe('pinned-secret');
            CryptoService.unpinMasterKeyForAtomicWrite();
            CryptoService.destroy();
            expect(CryptoService.hasMasterKey()).toBe(false);
        });

        it('does not adopt a different AES key while a write is pinned', async () => {
            const cipher = await CryptoService.encrypt('pinned-secret');
            CryptoService.pinMasterKeyForAtomicWrite();
            const foreign = new Uint8Array(32);
            crypto.getRandomValues(foreign);
            await (
                CryptoService as unknown as {
                    adoptMasterKeyFromBits: (bits: ArrayBuffer) => Promise<boolean>;
                }
            ).adoptMasterKeyFromBits(foreign.buffer);
            expect(await CryptoService.decrypt(cipher)).toBe('pinned-secret');
            CryptoService.unpinMasterKeyForAtomicWrite();
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
