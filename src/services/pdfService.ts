import { PDFDocument, PDFTextField, PDFCheckBox, PDFDropdown } from 'pdf-lib';

/**
 * Lê os campos de formulário (AcroForm) de um PDF
 */
export async function lerCamposPdf(pdfBytes: ArrayBuffer): Promise<string[]> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();
  return fields.map(f => f.getName());
}

/**
 * Preenche os campos de um PDF e retorna o PDF preenchido como Blob
 */
export async function preencherPdf(
  pdfBytes: ArrayBuffer,
  dados: Record<string, string>
): Promise<Blob> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  for (const [fieldName, value] of Object.entries(dados)) {
    try {
      const field = form.getField(fieldName);

      if (field instanceof PDFTextField) {
        field.setText(value);
      } else if (field instanceof PDFCheckBox) {
        if (value === 'true' || value === 'Sim' || value === '1') {
          field.check();
        } else {
          field.uncheck();
        }
      } else if (field instanceof PDFDropdown) {
        field.select(value);
      }
    } catch (err) {
      console.warn(`Campo "${fieldName}" não encontrado no PDF ou tipo incompatível`);
    }
  }

  form.flatten();

  const filledPdfBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(filledPdfBytes)], { type: 'application/pdf' });
}

/**
 * Lê os campos de um PDF a partir de uma URL
 */
export async function lerCamposPdfDeUrl(url: string): Promise<string[]> {
  const response = await fetch(url);
  const pdfBytes = await response.arrayBuffer();
  return lerCamposPdf(pdfBytes);
}

/**
 * Faz download de um PDF preenchido
 */
export function downloadPdf(blob: Blob, nomeArquivo: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
