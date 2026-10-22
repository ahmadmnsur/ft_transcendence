import { Worker } from 'node:worker_threads';

// §9.5 step 4's PDF load, off the API's thread (§9.5's note of 2026-10-22).
// pdf-lib 1.17.1 inflates each object stream and cross-reference stream
// whole while it loads, with no cap and without yielding, so a PDF of a few
// megabytes could ask for gigabytes: the thread every request waits on held
// meanwhile, then the process out of memory. So each load runs in its own
// worker thread, one at a time, and finds no page when:
// - its decoders together would allocate more than `maxDecodedBytes` over
//   the whole load, memory the worker shares with the API, counted before
//   pdf-lib allocates it: a chain of filters on one stream holds a buffer
//   for each filter, and every one counts;
// - the worker's heap passes `maxHeapMb`;
// - the load is still running `timeoutMs` after its worker started; the
//   wait for an earlier load does not count.
export type PdfCheckLimits = { timeoutMs: number; maxDecodedBytes: number; maxHeapMb: number };

// 32 MiB is nine times the most any of 122 real PDFs under 5 MiB needed
// (3.55 MiB), and twice a generated PDF of 20,500 pages with every object in
// one object stream (16.5 MiB).
export const PDF_CHECK_LIMITS: PdfCheckLimits = {
  timeoutMs: 5_000,
  maxDecodedBytes: 32 * 1024 * 1024,
  maxHeapMb: 256,
};

// The worker, as source rather than a file of its own, so it runs the same
// from `src/` under Vitest and from `dist/` in the image. Every pdf-lib
// decoder grows its buffer through `DecodeStream.prototype.ensureBuffer`, so
// the budget sits there, in the worker's own copy of pdf-lib: each new
// buffer is sized as pdf-lib sizes it, doubling from its minimum until the
// request fits, and counted before pdf-lib allocates it. The load's options
// are §9.5's; `Fastest` stops pdf-lib yielding, since the worker has nothing
// else to answer. A load that throws, or one pdf-lib recovers after the
// budget ran out, posts 0 pages.
const PDF_WORKER = `
const { parentPort, workerData } = require('node:worker_threads');
const { PDFDocument, ParseSpeeds } = require(workerData.pdfLib);
const DecodeStream = require(workerData.decodeStream).default;
const ensureBuffer = DecodeStream.prototype.ensureBuffer;
let allocated = 0;
let overBudget = false;
DecodeStream.prototype.ensureBuffer = function (requested) {
  if (requested > this.buffer.byteLength) {
    let size = this.minBufferLength;
    while (size < requested) size *= 2;
    allocated += size;
    if (allocated > workerData.maxDecodedBytes) {
      overBudget = true;
      throw new Error('The decoders pass their budget.');
    }
  }
  return ensureBuffer.call(this, requested);
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

// The run before this one, so runs go one at a time: two loads never share
// the process's memory and CPU at once.
let previous: Promise<unknown> = Promise.resolve();

// Runs `source` in a worker thread given `workerData`, after every earlier
// run, and answers what it posts first, or null when it posts nothing: it
// threw, passed `maxHeapMb`, or was stopped at `timeoutMs`.
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
    // A throw or the heap limit: the run answers nothing, and the API goes on.
    worker.on('error', () => undefined);
    worker.once('exit', () => {
      clearTimeout(timer);
      resolve(answer);
    });
  });
}

// The pages pdf-lib finds in `bytes` within `limits`, or 0 when it finds
// none, refuses the file, or a limit stops it.
export async function pdfPageCount(bytes: Buffer, limits: PdfCheckLimits = PDF_CHECK_LIMITS): Promise<number> {
  const pages = await runInWorker<number>(
    PDF_WORKER,
    {
      bytes,
      pdfLib: require.resolve('pdf-lib'),
      decodeStream: require.resolve('pdf-lib/cjs/core/streams/DecodeStream'),
      maxDecodedBytes: limits.maxDecodedBytes,
    },
    limits,
  );
  return pages ?? 0;
}
