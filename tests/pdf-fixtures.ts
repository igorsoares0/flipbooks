import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

// Test PDFs generated in code, so no binary fixtures live in the repository.

export const A4_PORTRAIT: [number, number] = [595, 842];
export const A4_LANDSCAPE: [number, number] = [842, 595];

export async function makePdf(sizes: [number, number][] = [A4_PORTRAIT, A4_LANDSCAPE, A4_PORTRAIT]) {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  sizes.forEach(([width, height], i) => {
    const page = doc.addPage([width, height]);
    page.drawRectangle({ x: 40, y: 40, width: width - 80, height: 100, color: rgb(0.1, 0.27, 0.84) });
    page.drawText(`Test page ${i + 1}`, { x: 60, y: height - 100, size: 36, font, color: rgb(0.09, 0.08, 0.06) });
  });
  return Buffer.from(await doc.save());
}

/** Starts like a PDF (passes the upload check) but cannot be parsed. */
export function corruptPdf() {
  return Buffer.concat([Buffer.from("%PDF-1.7\n"), Buffer.alloc(2048, 0x41)]);
}
