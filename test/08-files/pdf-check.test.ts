import { deflateSync } from 'node:zlib';
import { PDFDocument, PDFName, PDFRawStream } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { PDF_CHECK_LIMITS, pdfPageCount, runInWorker } from '../../src/files/pdf-check';

describe('the PDF check in its worker', () => {
  it('stops each run at its time limit, one run at a time, while the API thread keeps running', async () => {
    let ticks = 0;
    const ticker = setInterval(() => {
      ticks += 1;
    }, 20);
    const started = Date.now();
    const limits = { timeoutMs: 300, maxHeapMb: 64 };
    const answers = await Promise.all([
      runInWorker('for (;;) {}', null, limits),
      runInWorker('for (;;) {}', null, limits),
    ]);
    const elapsed = Date.now() - started;
    clearInterval(ticker);
    expect(answers).toEqual([null, null]);
    expect(elapsed).toBeGreaterThanOrEqual(600);
    expect(elapsed).toBeLessThan(3_000);
    expect(ticks).toBeGreaterThanOrEqual(10);
  });

  it('ends a run that passes its heap limit, well before its time limit', async () => {
    const started = Date.now();
    const answer = await runInWorker(
      'const kept = []; for (;;) kept.push({ at: kept.length });',
      null,
      { timeoutMs: 20_000, maxHeapMb: 32 },
    );
    expect(answer).toBeNull();
    expect(Date.now() - started).toBeLessThan(10_000);
  }, 30_000);

  it('finds no page in a PDF whose decoders pass the budget, and its page under the real budget', async () => {
    const document = await PDFDocument.create();
    document.addPage([200, 200]);
    const pdf = Buffer.from(await document.save({ useObjectStreams: true }));
    expect(await pdfPageCount(pdf, { ...PDF_CHECK_LIMITS, maxDecodedBytes: 16 })).toBe(0);
    expect(await pdfPageCount(pdf)).toBe(1);
  });

  it('counts every decoder of a chain of filters against one budget', async () => {
    const limits = { ...PDF_CHECK_LIMITS, maxDecodedBytes: 9_500 };
    expect(await pdfPageCount(await pdfWithObjectStream(1), limits)).toBe(1);
    expect(await pdfPageCount(await pdfWithObjectStream(8), limits)).toBe(0);
  });

  it('counts an LZW decoder dictionary, which it allocates outside its buffer', async () => {
    const pdf = await pdfWithLzwObjectStream();
    expect(await pdfPageCount(pdf, { ...PDF_CHECK_LIMITS, maxDecodedBytes: 20_000 })).toBe(0);
    expect(await pdfPageCount(pdf)).toBe(1);
  });
});

async function pdfWithObjectStream(layers: number): Promise<Buffer> {
  const document = await PDFDocument.create();
  document.addPage([200, 200]);
  const note = document.context.nextRef();
  const header = `${note.objectNumber} 0 `;
  let contents = Buffer.from(`${header}<< /Note (${'evidence '.repeat(400)}) >>`, 'latin1');
  for (let layer = 0; layer < layers; layer += 1) contents = deflateSync(contents);
  const dict = document.context.obj({
    Type: 'ObjStm',
    N: 1,
    First: header.length,
    Filter: Array.from({ length: layers }, () => PDFName.of('FlateDecode')),
  });
  document.context.register(PDFRawStream.of(dict, contents));
  return Buffer.from(await document.save({ useObjectStreams: false }));
}

async function pdfWithLzwObjectStream(): Promise<Buffer> {
  const document = await PDFDocument.create();
  document.addPage([200, 200]);
  const note = document.context.nextRef();
  const header = `${note.objectNumber} 0 `;
  const body = Buffer.from(`${header}<< /Note (evidence) >>`, 'latin1');
  const dict = document.context.obj({ Type: 'ObjStm', N: 1, First: header.length, Filter: PDFName.of('LZWDecode') });
  document.context.register(PDFRawStream.of(dict, lzwLiterals(body)));
  return Buffer.from(await document.save({ useObjectStreams: false }));
}

function lzwLiterals(bytes: Buffer): Buffer {
  const bits: number[] = [];
  const emit = (code: number): void => {
    for (let bit = 8; bit >= 0; bit -= 1) bits.push((code >> bit) & 1);
  };
  for (const byte of bytes) emit(byte);
  emit(257);
  const out = Buffer.alloc(Math.ceil(bits.length / 8));
  bits.forEach((bit, index) => {
    if (bit) out[index >> 3] |= 1 << (7 - (index & 7));
  });
  return out;
}
