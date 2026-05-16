/**
 * 🧪 UNIT TESTS - CryptoService
 * 
 * Test Coverage:
 * - Initialization
 * - Encryption/Decryption
 * - Signature Generation/Verification
 * - Object Encryption
 * - Error Handling
 */

import { describe, it, expect, beforeEach } from 'vitest';
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
    
    describe('Signature Generation & Verification', () => {
        it('should generate consistent signature for same data', async () => {
            const data = { name: 'علي', amount: '5000000' };
            
            const sig1 = await CryptoService.generateSignature(data);
            const sig2 = await CryptoService.generateSignature(data);
            
            expect(sig1).toBe(sig2);
        });
        
        it('should generate different signatures for different data', async () => {
            const data1 = { name: 'علي', amount: '5000000' };
            const data2 = { name: 'أحمد', amount: '5000000' };
            
            const sig1 = await CryptoService.generateSignature(data1);
            const sig2 = await CryptoService.generateSignature(data2);
            
            expect(sig1).not.toBe(sig2);
        });
        
        it('should verify signature correctly', async () => {
            const data = { debtor: 'علي حسن', debt: '1000000' };
            
            const signature = await CryptoService.generateSignature(data);
            const isValid = await CryptoService.verifySignature(data, signature);
            
            expect(isValid).toBe(true);
        });
        
        it('should detect tampered data', async () => {
            const originalData = { debtor: 'علي حسن', debt: '1000000' };
            const signature = await CryptoService.generateSignature(originalData);
            
            const tamperedData = { debtor: 'علي حسن', debt: '9999999' }; // Changed!
            const isValid = await CryptoService.verifySignature(tamperedData, signature);
            
            expect(isValid).toBe(false);
        });
        
        it('should be order-independent for object keys', async () => {
            const data1 = { a: '1', b: '2', c: '3' };
            const data2 = { c: '3', a: '1', b: '2' }; // Different order
            
            const sig1 = await CryptoService.generateSignature(data1);
            const sig2 = await CryptoService.generateSignature(data2);
            
            expect(sig1).toBe(sig2);
        });
    });
    
    describe('Object Encryption', () => {
        it('should encrypt all string fields in object', async () => {
            const obj = {
                debtor_name: 'علي حسن',
                phone: '07701234567',
                address: 'بغداد - الكرادة'
            };
            
            const { encrypted, signature } = await CryptoService.encryptObject(obj);
            
            expect(encrypted.debtor_name).not.toBe(obj.debtor_name);
            expect(encrypted.phone).not.toBe(obj.phone);
            expect(encrypted.address).not.toBe(obj.address);
            expect(signature).toBeTruthy();
            expect(signature.length).toBe(64); // SHA-256 hex
        });
        
        it('should preserve non-string values', async () => {
            const obj = {
                name: 'علي',
                amount: 5000000, // number
                active: true,    // boolean
                data: null       // null
            };
            
            const { encrypted } = await CryptoService.encryptObject(obj);
            
            expect(encrypted.name).not.toBe(obj.name); // Encrypted
            expect(encrypted.amount).toBe(5000000);    // Preserved
            expect(encrypted.active).toBe(true);       // Preserved
            expect(encrypted.data).toBe(null);         // Preserved
        });
        
        it('should decrypt object and verify integrity', async () => {
            const original = {
                debtor_name: 'محمد علي',
                total_debt: 3000000,
                status: 'active'
            };
            
            const { encrypted, signature } = await CryptoService.encryptObject(original);
            const { decrypted, isIntegrityValid } = await CryptoService.decryptObject(
                encrypted,
                signature
            );
            
            expect(decrypted.debtor_name).toBe(original.debtor_name);
            expect(decrypted.total_debt).toBe(original.total_debt);
            expect(decrypted.status).toBe(original.status);
            expect(isIntegrityValid).toBe(true);
        });
        
        it('should detect integrity violation', async () => {
            const original = { name: 'علي', amount: '1000000' };
            
            const { encrypted, signature } = await CryptoService.encryptObject(original);
            
            // Tamper with encrypted data (decrypt, modify, re-encrypt)
            const tamperedName = await CryptoService.encrypt('أحمد'); // Different name!
            encrypted.name = tamperedName;
            
            const { isIntegrityValid } = await CryptoService.decryptObject(
                encrypted,
                signature
            );
            
            expect(isIntegrityValid).toBe(false);
        });
    });
    
    describe('Error Handling', () => {
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
