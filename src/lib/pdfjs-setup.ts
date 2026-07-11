import * as pdfjsLib from 'pdfjs-dist';
import { WorkerMessageHandler } from 'pdfjs-dist/build/pdf.worker.mjs';

(globalThis as any).pdfjsWorker = { WorkerMessageHandler };

export default pdfjsLib;
