import { PDFDocument } from 'pdf-lib';
import { describe, expect, it } from 'vitest';
import { PDF_CHECK_LIMITS, pdfPageCount, runInWorker } from '../../src/files/pdf-check';

// §9.5's note of 2026-10-22: the PDF load's worker and its limits. Outside
// §16.3's closed list, because a broken limit would fail silently: every
// honest upload keeps working, and only the PDF the limit exists for would
// hold the API. No file here inflates far: a stand-in that never ends plays
// a slow load, one that fills its heap plays a heavy one, and an ordinary
// PDF under a cap of a few bytes plays a stream that decodes too far.
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
    // The second run's 300 ms start after the first's end.
    expect(elapsed).toBeGreaterThanOrEqual(600);
    expect(elapsed).toBeLessThan(3_000);
    // A load on the API's own thread would have let no timer fire.
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

  it('finds no page in a PDF one of whose streams decodes past the cap, and its page under the real cap', async () => {
    const document = await PDFDocument.create();
    document.addPage([200, 200]);
    // pdf-lib writes the catalog and the page tree into a Flate object stream.
    const pdf = Buffer.from(await document.save({ useObjectStreams: true }));
    expect(await pdfPageCount(pdf, { ...PDF_CHECK_LIMITS, maxStreamBytes: 16 })).toBe(0);
    expect(await pdfPageCount(pdf)).toBe(1);
  });
});
