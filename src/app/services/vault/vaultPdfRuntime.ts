import type * as PdfJs from 'pdfjs-dist';
import { resolvePdfJsWorkerUrl } from '@/app/services/vault/vaultPdfAssetUrls';

type PdfJsModule = typeof PdfJs;

let pdfJsModulePromise: Promise<PdfJsModule> | null = null;
let workerConfigured = false;

async function loadPdfJsModule(): Promise<PdfJsModule> {
    if (!pdfJsModulePromise) {
        pdfJsModulePromise = (async () => {
            const pdfjs = await import('pdfjs-dist');
            if (!workerConfigured) {
                pdfjs.GlobalWorkerOptions.workerSrc = resolvePdfJsWorkerUrl();
                workerConfigured = true;
            }
            return pdfjs;
        })();
    }
    return pdfJsModulePromise;
}

export async function getVaultPdfJs(): Promise<PdfJsModule> {
    return loadPdfJsModule();
}

export function resetVaultPdfRuntimeForTests(): void {
    pdfJsModulePromise = null;
    workerConfigured = false;
}
