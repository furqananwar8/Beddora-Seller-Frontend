/** Joins PDFs (one label each) into one, in order. pdf-lib is loaded only when this runs. */
export async function mergePdfs(parts: Blob[]): Promise<Blob> {
  const { PDFDocument } = await import('pdf-lib')
  const merged = await PDFDocument.create()
  for (const part of parts) {
    const source = await PDFDocument.load(await part.arrayBuffer())
    const pages = await merged.copyPages(source, source.getPageIndices())
    pages.forEach((page) => merged.addPage(page))
  }
  return new Blob([(await merged.save()) as BlobPart], { type: 'application/pdf' })
}
