import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class PdfService {
  generateCraPdf(cra: any): Promise<Buffer> {
    return new Promise((resolve) => {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
      });

      const buffers: Buffer[] = [];

      doc.on('data', (buffer) => buffers.push(buffer));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const BLUE = '#0077C8';
      const DARK_BLUE = '#0A64B7';
      const ORANGE = '#F39A00';
      const LIGHT_BLUE = '#EAF4FF';
      const LIGHT_ORANGE = '#FFF3E0';
      const GREEN = '#0FA958';
      const RED = '#D93025';
      const GREY = '#F5F7FA';
      const BORDER = '#D6E0EA';

      const pageWidth = doc.page.width;
      const margin = 40;
      const contentWidth = pageWidth - margin * 2;

      const drawSectionTitle = (title: string, y: number) => {
        doc
          .rect(margin, y, 4, 14)
          .fill(ORANGE);

        doc
          .fillColor(DARK_BLUE)
          .fontSize(12)
          .font('Helvetica-Bold')
          .text(title, margin + 12, y - 1);
      };

      const drawInfoBox = (
        x: number,
        y: number,
        width: number,
        title: string,
        value: string,
      ) => {
        doc
          .roundedRect(x, y, width, 55, 6)
          .strokeColor(BORDER)
          .lineWidth(1)
          .stroke();

        doc
          .fillColor('#5D6D7E')
          .fontSize(8)
          .font('Helvetica-Bold')
          .text(title.toUpperCase(), x + 15, y + 13);

        doc
          .fillColor(DARK_BLUE)
          .fontSize(11)
          .font('Helvetica-Bold')
          .text(value, x + 15, y + 30);
      };

      const drawSummaryCard = (
        x: number,
        y: number,
        width: number,
        value: number,
        label: string,
        color: string,
        bg: string,
      ) => {
        doc
          .roundedRect(x, y, width, 55, 6)
          .fillAndStroke(bg, BORDER);

        doc
          .fillColor(color)
          .fontSize(22)
          .font('Helvetica-Bold')
          .text(String(value), x, y + 12, {
            width,
            align: 'center',
          });

        doc
          .fillColor('#34495E')
          .fontSize(8)
          .font('Helvetica')
          .text(label.toUpperCase(), x, y + 38, {
            width,
            align: 'center',
          });
      };

      const formatMonth = (mois: number, annee: number) => {
        const months = [
          'Janvier',
          'Février',
          'Mars',
          'Avril',
          'Mai',
          'Juin',
          'Juillet',
          'Août',
          'Septembre',
          'Octobre',
          'Novembre',
          'Décembre',
        ];

        return `${months[mois - 1]} ${annee}`;
      };

      const formatDate = (date?: string | Date) => {
        if (!date) return '-';

        const d = new Date(date);

        return d.toLocaleDateString('fr-FR');
      };

      const jours = cra.jours || [];

      const totalTravail = jours
        .filter((j) => j.type === 'TRAVAIL')
        .reduce((sum, j) => sum + Number(j.duree), 0);

      const totalConges = jours
        .filter((j) => j.type === 'CONGE')
        .reduce((sum, j) => sum + Number(j.duree), 0);

      const totalAbsences = jours
        .filter((j) => j.type === 'ABSENCE')
        .reduce((sum, j) => sum + Number(j.duree), 0);

      const totalRtt = jours
        .filter((j) => j.type === 'RTT')
        .reduce((sum, j) => sum + Number(j.duree), 0);

      const collaborateur = `${cra.collaborateur?.prenom ?? ''} ${cra.collaborateur?.nom ?? ''}`;
      const client = cra.client?.nom ?? '-';
      const periode = formatMonth(cra.mois, cra.annee);
      const reference = `CRA-${cra.annee}-${String(cra.mois).padStart(2, '0')}-${cra.id}`;

      // HEADER
      const logoPath = path.join(process.cwd(), 'src/pdf/assets/gmes-logo.jpg');

if (fs.existsSync(logoPath)) {
  doc.image(logoPath, margin, 18, {
  width: 70,
});
} else {
  doc
    .fillColor(BLUE)
    .fontSize(24)
    .font('Helvetica-Bold')
    .text('GMES', margin, 25);
}

doc
  .fillColor(DARK_BLUE)
  .fontSize(9)
  .font('Helvetica-Bold')
  .text('DOCUMENT INTERNE', pageWidth - 200, 25, {
    width: 160,
    align: 'right',
    lineBreak: false,
  });

doc
  .fillColor(ORANGE)
  .fontSize(10)
  .font('Helvetica-Bold')
  .text(`Référence : ${reference}`, pageWidth - 220, 45, {
    width: 180,
    align: 'right',
    lineBreak: false,
  });

doc.rect(0, 74, pageWidth * 0.45, 3).fill(BLUE);
doc.rect(pageWidth * 0.45, 74, pageWidth * 0.3, 3).fill(ORANGE);
doc.rect(pageWidth * 0.75, 74, pageWidth * 0.25, 3).fill(BLUE);

      // TITLE
      let y = 105;

      doc
        .fillColor(DARK_BLUE)
        .fontSize(22)
        .font('Helvetica-Bold')
        .text("COMPTE-RENDU D'ACTIVITÉ", margin, y);

      y += 30;

      doc
        .fillColor('#5D6D7E')
        .fontSize(10)
        .font('Helvetica')
        .text(`Période : ${periode}`, margin, y);

      y += 30;

      // INFO BOXES
      const boxWidth = contentWidth / 3;

      drawInfoBox(margin, y, boxWidth, 'Collaborateur', collaborateur);
      drawInfoBox(margin + boxWidth, y, boxWidth, 'Client', client);
      drawInfoBox(margin + boxWidth * 2, y, boxWidth, 'Mois', periode);

      y += 85;

      // ACTIVITIES TABLE
      drawSectionTitle('DÉTAIL DES ACTIVITÉS', y);
      y += 28;

      const tableX = margin;
      const rowHeight = 28;
      const colWidths = [110, 90, 80, contentWidth - 280];

      doc
        .roundedRect(tableX, y, contentWidth, rowHeight, 4)
        .fill(BLUE);

      doc
        .fillColor('#FFFFFF')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('DATE', tableX + 10, y + 10)
        .text('TYPE', tableX + colWidths[0] + 10, y + 10)
        .text('DURÉE (J)', tableX + colWidths[0] + colWidths[1] + 10, y + 10)
        .text('COMMENTAIRE', tableX + colWidths[0] + colWidths[1] + colWidths[2] + 10, y + 10);

      y += rowHeight;

      jours.slice(0, 8).forEach((jour, index) => {
        const bg = index % 2 === 0 ? '#FFFFFF' : GREY;

        doc
          .rect(tableX, y, contentWidth, rowHeight)
          .fillAndStroke(bg, BORDER);

        doc
          .fillColor('#2C3E50')
          .fontSize(8)
          .font('Helvetica')
          .text(formatDate(jour.date), tableX + 10, y + 9);

        const typeColor =
          jour.type === 'CONGE'
            ? ORANGE
            : jour.type === 'ABSENCE'
              ? RED
              : jour.type === 'RTT'
                ? GREEN
                : BLUE;

        doc
          .roundedRect(tableX + colWidths[0] + 10, y + 7, 50, 14, 3)
          .fill('#EAF4FF');

        doc
          .fillColor(typeColor)
          .fontSize(7)
          .font('Helvetica-Bold')
          .text(jour.type, tableX + colWidths[0] + 15, y + 10);

        doc
          .fillColor('#2C3E50')
          .fontSize(8)
          .font('Helvetica')
          .text(String(jour.duree), tableX + colWidths[0] + colWidths[1] + 25, y + 9);

        doc.text(
          jour.commentaire || '',
          tableX + colWidths[0] + colWidths[1] + colWidths[2] + 10,
          y + 9,
          {
            width: colWidths[3] - 20,
          },
        );

        y += rowHeight;
      });

      y += 25;

      // SUMMARY
      drawSectionTitle('RÉCAPITULATIF DU MOIS', y);
      y += 28;

      const cardGap = 10;
      const cardWidth = (contentWidth - cardGap * 3) / 4;

      drawSummaryCard(margin, y, cardWidth, totalTravail, 'Jours travaillés', BLUE, LIGHT_BLUE);
      drawSummaryCard(margin + (cardWidth + cardGap), y, cardWidth, totalConges, 'Congés', ORANGE, LIGHT_ORANGE);
      drawSummaryCard(margin + (cardWidth + cardGap) * 2, y, cardWidth, totalAbsences, 'Absences', RED, '#FFF0F0');
      drawSummaryCard(margin + (cardWidth + cardGap) * 3, y, cardWidth, totalRtt, 'RTT', GREEN, '#EAFBF0');

      y += 80;

      // STATUS
      drawSectionTitle('STATUT & VALIDATION', y);
      y += 28;

      doc
        .roundedRect(margin, y, 180, 42, 6)
        .fillAndStroke('#EAFBF0', GREEN);

      doc
        .fillColor(GREEN)
        .fontSize(11)
        .font('Helvetica-Bold')
        .text(cra.statut, margin + 20, y + 15);

      doc
        .roundedRect(margin + 200, y, contentWidth - 200, 42, 6)
        .strokeColor(BORDER)
        .stroke();

      doc
        .fillColor('#5D6D7E')
        .fontSize(8)
        .font('Helvetica-Bold')
        .text('VALIDATION CLIENT', margin + 215, y + 8);

      doc
        .fillColor(DARK_BLUE)
        .fontSize(10)
        .text(formatDate(cra.date_validation_client), margin + 215, y + 24);

      doc
        .fillColor('#5D6D7E')
        .fontSize(8)
        .text('VALIDATION ADMINISTRATEUR', margin + 390, y + 8);

      doc
        .fillColor(DARK_BLUE)
        .fontSize(10)
        .text(formatDate(cra.date_validation_admin), margin + 390, y + 24);

      y += 70;

      // SIGNATURES
      drawSectionTitle('SIGNATURES', y);
      y += 28;

      const sigWidth = (contentWidth - 20) / 3;

      const drawSignature = (x: number, title: string, name: string) => {
        doc
          .roundedRect(x, y, sigWidth, 70, 4)
          .strokeColor(BORDER)
          .stroke();

        doc
          .fillColor('#5D6D7E')
          .fontSize(8)
          .font('Helvetica-Bold')
          .text(title.toUpperCase(), x + 10, y + 10);

        doc
          .fillColor(DARK_BLUE)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(name, x + 10, y + 26);

        doc
          .moveTo(x + 10, y + 52)
          .lineTo(x + sigWidth - 10, y + 52)
          .strokeColor(BLUE)
          .stroke();

        doc
          .fillColor('#7F8C8D')
          .fontSize(7)
          .font('Helvetica')
          .text('Signature & date', x + 10, y + 56);
      };

      drawSignature(margin, 'Collaborateur', collaborateur);
      drawSignature(margin + sigWidth + 10, 'Représentant client', client);
      drawSignature(margin + (sigWidth + 10) * 2, 'Administrateur', 'Proxima Conseil');

      // FOOTER
const footerY = 790;

doc.rect(0, footerY, pageWidth, 52).fill(BLUE);
doc.rect(0, footerY - 3, pageWidth, 3).fill(ORANGE);

doc
  .fillColor('#FFFFFF')
  .fontSize(8)
  .font('Helvetica')
  .text('PROXIMA CONSEIL — Document confidentiel', margin, footerY + 22, {
    lineBreak: false,
  });

doc.text(`${reference} — Page 1/1`, 250, footerY + 22, {
  lineBreak: false,
});

doc.text(
  `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
  pageWidth - 170,
  footerY + 22,
  {
    width: 130,
    align: 'right',
    lineBreak: false,
  },
);

doc.end();
    });
  }
}