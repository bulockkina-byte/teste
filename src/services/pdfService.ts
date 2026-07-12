import { PDFDocument, PDFTextField, PDFCheckBox, PDFDropdown, StandardFonts, rgb } from 'pdf-lib';
import type { DocumentField } from '../types/document';

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
 * Preenche um PDF: primeiro tenta AcroForm, depois escreve texto nas coordenadas x,y dos campos posicionados
 */
export async function preencherPdf(
  pdfBytes: ArrayBuffer,
  dados: Record<string, string>,
  fieldPositions?: { field_name: string; x: number; y: number; width: number; height: number; font_size: number; is_signature?: boolean }[],
): Promise<Blob> {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  let usedAcroForm = false;

  // 1. Tentar preencher AcroForm (se existir)
  try {
    const form = pdfDoc.getForm();
    const acroFields = form.getFields();
    if (acroFields.length > 0) {
      usedAcroForm = true;
      for (const [fieldName, value] of Object.entries(dados)) {
        try {
          const field = form.getField(fieldName);
          if (field instanceof PDFTextField) {
            field.setText(value);
          } else if (field instanceof PDFCheckBox) {
            if (value === 'V' || value === 'true' || value === 'Sim' || value === '1') {
              field.check();
            } else {
              field.uncheck();
            }
          } else if (field instanceof PDFDropdown) {
            field.select(value);
          }
        } catch {
          // campo não encontrado no AcroForm, ignorar
        }
      }
      form.flatten();
    }
  } catch {
    // sem AcroForm, continuar
  }

  // 2. Se tem posições de campos, escrever texto diretamente no PDF
  if (fieldPositions && fieldPositions.length > 0) {
    const usedFields = new Set<string>();

    for (const pos of fieldPositions) {
      const value = dados[pos.field_name];
      if (!value || value.trim() === '') continue;
      if (pos.is_signature) continue;

      const page = pages[pos.page - 1] || pages[0];
      const { height: pageHeight } = page.getSize();

      const fontSize = pos.font_size || 10;
      const textFont = fontSize >= 10 ? boldFont : font;

      // Converter coordenada Y (editor usa top-left, pdf-lib usa bottom-left)
      const pdfY = pageHeight - pos.y - fontSize - 2;

      // Quebra de linha para textos longos
      const maxWidth = pos.width - 4;
      const lines = breakText(textFont, value, fontSize, maxWidth);

      lines.forEach((line, i) => {
        page.drawText(line, {
          x: pos.x + 2,
          y: pdfY - (i * (fontSize + 2)),
          size: fontSize,
          font: textFont,
          color: rgb(0, 0, 0),
        });
      });

      usedFields.add(pos.field_name);
    }
  }

  const filledPdfBytes = await pdfDoc.save();
  return new Blob([new Uint8Array(filledPdfBytes)], { type: 'application/pdf' });
}

function breakText(font: any, text: string, fontSize: number, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.length > 0 ? lines : [''];
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
