import { Worker } from 'node:worker_threads';

export type PdfCheckLimits = { timeoutMs: number; maxDecodedBytes: number; maxHeapMb: number };

export const PDF_CHECK_LIMITS: PdfCheckLimits = {
  timeoutMs: 5_000,
  maxDecodedBytes: 32 * 1024 * 1024,
  maxHeapMb: 256,
};

const PDF_WORKER = `
const { parentPort, workerData } = require('node:worker_threads');
const { PDFDocument, ParseSpeeds } = require(workerData.pdfLib);
const DecodeStream = require(workerData.decodeStream).default;
const lzwModule = require(workerData.lzwStream);
let allocated = 0;
let overBudget = false;
function charge(size) {
  allocated += size;
  if (allocated > workerData.maxDecodedBytes) {
    overBudget = true;
    throw new Error('The decoders pass their budget.');
  }
}
const ensureBuffer = DecodeStream.prototype.ensureBuffer;
DecodeStream.prototype.ensureBuffer = function (requested) {
  if (requested > this.buffer.byteLength) {
    let size = this.minBufferLength;
    while (size < requested) size *= 2;
    charge(size);
  }
  return ensureBuffer.call(this, requested);
};
const OriginalLzw = lzwModule.default;
const LZW_DICTIONARY_BYTES = 4096 * (1 + 2 + 2 + 1);
lzwModule.default = function (stream, maybeLength, earlyChange) {
  charge(LZW_DICTIONARY_BYTES);
  return new OriginalLzw(stream, maybeLength, earlyChange);
};
(async () => {
  let pages = 0;
  try {
    const document = await PDFDocument.load(workerData.bytes, {
      throwOnInvalidObject: true,
      updateMetadata: false,
      parseSpeed: ParseSpeeds.Fastest,
    });
    pages = document.getPageCount();
  } catch {}
  parentPort.postMessage(overBudget ? 0 : pages);
})();
`;

let previous: Promise<unknown> = Promise.resolve();

export function runInWorker<T>(
  source: string,
  workerData: unknown,
  limits: Pick<PdfCheckLimits, 'timeoutMs' | 'maxHeapMb'>,
): Promise<T | null> {
  const run = previous.then(() => runNow<T>(source, workerData, limits));
  previous = run.catch(() => null);
  return run;
}

function runNow<T>(
  source: string,
  workerData: unknown,
  limits: Pick<PdfCheckLimits, 'timeoutMs' | 'maxHeapMb'>,
): Promise<T | null> {
  return new Promise((resolve) => {
    let answer: T | null = null;
    const worker = new Worker(source, {
      eval: true,
      workerData,
      resourceLimits: { maxOldGenerationSizeMb: limits.maxHeapMb },
    });
    const timer = setTimeout(() => void worker.terminate(), limits.timeoutMs);
    worker.once('message', (message: T) => {
      answer = message;
      void worker.terminate();
    });
    worker.on('error', () => undefined);
    worker.once('exit', () => {
      clearTimeout(timer);
      resolve(answer);
    });
  });
}

export async function pdfPageCount(bytes: Buffer, limits: PdfCheckLimits = PDF_CHECK_LIMITS): Promise<number> {
  const pages = await runInWorker<number>(
    PDF_WORKER,
    {
      bytes,
      pdfLib: require.resolve('pdf-lib'),
      decodeStream: require.resolve('pdf-lib/cjs/core/streams/DecodeStream'),
      lzwStream: require.resolve('pdf-lib/cjs/core/streams/LZWStream'),
      maxDecodedBytes: limits.maxDecodedBytes,
    },
    limits,
  );
  return pages ?? 0;
}
