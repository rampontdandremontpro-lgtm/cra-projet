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
        bufferPages: true,
      });

      const buffers: Buffer[] = [];

      doc.on('data', (buffer) => buffers.push(buffer));
      doc.on('end', () => resolve(Buffer.concat(buffers)));

      const BLUE = '#35AEE2';
      const DARK_BLUE = '#0A64B7';
      const ORANGE = '#F39A00';
      const GREEN = '#0FA958';
      const RED = '#D93025';
      const PURPLE = '#7C3AED';
      const GREY = '#F8FAFC';
      const BORDER = '#D6E0EA';

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 40;
      const contentWidth = pageWidth - margin * 2;
      const footerHeight = 70;
      const maxY = pageHeight - footerHeight - 30;

      const months = [
        '',
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

      const jours = [...(cra.days || [])].sort((a, b) =>
        String(a.date).localeCompare(String(b.date)),
      );

      const collaborateur = `${cra.collaborateur?.prenom ?? ''} ${
        cra.collaborateur?.nom ?? ''
      }`.trim();

      const entreprise = cra.service?.company?.nom ?? '-';
      const service = cra.service?.nom ?? '-';

      const periode = `${months[cra.mois]} ${cra.annee}`;
      const reference = `CRA-${cra.annee}-${String(cra.mois).padStart(
        2,
        '0',
      )}-${cra.id}`;

      const clientValidator = cra.clientValidator
        ? `${cra.clientValidator.prenom ?? ''} ${cra.clientValidator.nom ?? ''}`.trim()
        : '-';

      const adminValidator = cra.adminValidator
        ? `${cra.adminValidator.prenom ?? ''} ${cra.adminValidator.nom ?? ''}`.trim()
        : '-';

      const formatDate = (date?: string | Date | null): string => {
  if (!date) return '-';

  if (typeof date === 'string') {
    const datePart = date.split('T')[0];
    const parts = datePart.split('-');

    if (parts.length === 3) {
      const [year, month, day] = parts;
      return `${day}/${month}/${year}`;
    }

    return date;
  }

  return date.toLocaleDateString('fr-FR');
};

      const totalByType = (type: string) =>
        jours
          .filter((jour) => jour.type === type)
          .reduce((total, jour) => total + Number(jour.duree), 0);

      const totalTravail = totalByType('TRAVAIL');
      const totalConges = totalByType('CONGE');
      const totalAbsences = totalByType('ABSENCE');
      const totalRtt = totalByType('RTT');

      const drawHeader = () => {
        const logoPath = path.join(
          process.cwd(),
          'src/pdf/assets/gmes-logo.jpg',
        );

        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, margin, 15, {
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

        doc.rect(0, 88, pageWidth * 0.45, 3).fill(BLUE);
        doc.rect(pageWidth * 0.45, 88, pageWidth * 0.3, 3).fill(ORANGE);
        doc.rect(pageWidth * 0.75, 88, pageWidth * 0.25, 3).fill(BLUE);
      };

      const drawSectionTitle = (title: string, y: number) => {
        doc.rect(margin, y, 4, 14).fill(ORANGE);

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
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(value, x + 15, y + 30, {
            width: width - 25,
            lineBreak: false,
          });
      };

      const addNewPage = () => {
        doc.addPage();
        drawHeader();

        return 120;
      };

      const ensureSpace = (currentY: number, neededHeight: number) => {
        if (currentY + neededHeight > maxY) {
          return addNewPage();
        }

        return currentY;
      };

      const drawActivityTableHeader = (y: number) => {
        const rowHeight = 26;
        const colWidths = [95, 85, 70, contentWidth - 250];

        doc.roundedRect(margin, y, contentWidth, rowHeight, 4).fill(BLUE);

        doc
          .fillColor('#FFFFFF')
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('DATE', margin + 10, y + 9)
          .text('TYPE', margin + colWidths[0] + 10, y + 9)
          .text('DURÉE (J)', margin + colWidths[0] + colWidths[1] + 10, y + 9)
          .text(
            'COMMENTAIRE',
            margin + colWidths[0] + colWidths[1] + colWidths[2] + 10,
            y + 9,
          );

        return y + rowHeight;
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
        doc.roundedRect(x, y, width, 55, 6).fillAndStroke(bg, BORDER);

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

      const getClientValidationStatus = () => {
  if (cra.statut === 'SOUMIS_CLIENT') {
    return {
      label: 'SOUMIS_CLIENT',
      color: ORANGE,
      bg: '#FFF3E0',
    };
  }

  if (
    cra.statut === 'VALIDE_CLIENT' ||
    cra.statut === 'VALIDE_ADMIN' ||
    cra.statut === 'REFUSE_ADMIN' ||
    cra.statut === 'ARCHIVE'
  ) {
    return {
      label: 'VALIDE_CLIENT',
      color: GREEN,
      bg: '#EAFBF0',
    };
  }

  if (cra.statut === 'REFUSE_CLIENT') {
    return {
      label: 'REFUSE_CLIENT',
      color: RED,
      bg: '#FFF0F0',
    };
  }

  return {
    label: '-',
    color: '#5D6D7E',
    bg: '#FFFFFF',
  };
};

const getAdminValidationStatus = () => {
  if (cra.statut === 'VALIDE_ADMIN' || cra.statut === 'ARCHIVE') {
    return {
      label: 'VALIDE_ADMIN',
      color: GREEN,
      bg: '#EAFBF0',
    };
  }

  if (cra.statut === 'REFUSE_ADMIN') {
    return {
      label: 'REFUSE_ADMIN',
      color: RED,
      bg: '#FFF0F0',
    };
  }

  return {
    label: '-',
    color: '#5D6D7E',
    bg: '#FFFFFF',
  };
};

const drawValidationBox = (
  x: number,
  y: number,
  width: number,
  title: string,
  status: { label: string; color: string; bg: string },
  date?: string | Date | null,
) => {
  doc
    .roundedRect(x, y, width, 55, 6)
    .fillAndStroke('#FFFFFF', BORDER);

  doc
    .fillColor('#5D6D7E')
    .fontSize(8)
    .font('Helvetica-Bold')
    .text(title.toUpperCase(), x + 15, y + 10, {
      width: width - 30,
      lineBreak: false,
    });

  doc
    .roundedRect(x + 15, y + 25, 120, 18, 5)
    .fill(status.bg);

  doc
    .fillColor(status.color)
    .fontSize(8)
    .font('Helvetica-Bold')
    .text(status.label, x + 22, y + 30, {
      width: 110,
      lineBreak: false,
    });

  doc
    .fillColor(DARK_BLUE)
    .fontSize(8)
    .font('Helvetica-Bold')
    .text(formatDate(date), x + 145, y + 30, {
      width: width - 155,
      lineBreak: false,
    });
};

      drawHeader();

      let y = 120;

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

      const boxWidth = contentWidth / 3;

      drawInfoBox(margin, y, boxWidth, 'Collaborateur', collaborateur);
      drawInfoBox(margin + boxWidth, y, boxWidth, 'Entreprise', entreprise);
      drawInfoBox(margin + boxWidth * 2, y, boxWidth, 'Service', service);

      y += 85;

      drawSectionTitle('DÉTAIL DES ACTIVITÉS', y);
      y += 28;

      y = drawActivityTableHeader(y);

      const rowHeight = 25;
      const colWidths = [95, 85, 70, contentWidth - 250];

      jours.forEach((jour, index) => {
        y = ensureSpace(y, rowHeight + 30);

        if (y === 120) {
          drawSectionTitle('DÉTAIL DES ACTIVITÉS - SUITE', y);
          y += 28;
          y = drawActivityTableHeader(y);
        }

        const bg = index % 2 === 0 ? '#FFFFFF' : GREY;

        doc.rect(margin, y, contentWidth, rowHeight).fillAndStroke(bg, BORDER);

        doc
          .fillColor('#2C3E50')
          .fontSize(8)
          .font('Helvetica')
          .text(formatDate(jour.date), margin + 10, y + 8);

        const typeColor =
  jour.type === 'CONGE'
    ? GREEN
    : jour.type === 'ABSENCE'
      ? RED
      : jour.type === 'RTT'
        ? PURPLE
        : BLUE;

const typeBg =
  jour.type === 'CONGE'
    ? '#EAFBF0'
    : jour.type === 'ABSENCE'
      ? '#FFF0F0'
      : jour.type === 'RTT'
        ? '#F5F3FF'
        : '#EAF4FF';

        doc
          .roundedRect(margin + colWidths[0] + 10, y + 6, 58, 14, 3)
          .fill(typeBg);

        doc
          .fillColor(typeColor)
          .fontSize(7)
          .font('Helvetica-Bold')
          .text(jour.type, margin + colWidths[0] + 15, y + 9);

        doc
          .fillColor('#2C3E50')
          .fontSize(8)
          .font('Helvetica')
          .text(
            String(jour.duree),
            margin + colWidths[0] + colWidths[1] + 20,
            y + 8,
          );

        doc.text(
          jour.commentaire || '',
          margin + colWidths[0] + colWidths[1] + colWidths[2] + 10,
          y + 8,
          {
            width: colWidths[3] - 20,
            lineBreak: false,
          },
        );

        y += rowHeight;
      });

      y += 25;
      y = ensureSpace(y, 230);

      drawSectionTitle('RÉCAPITULATIF DU MOIS', y);
      y += 28;

      const cardGap = 10;
      const cardWidth = (contentWidth - cardGap * 3) / 4;

      drawSummaryCard(
        margin,
        y,
        cardWidth,
        totalTravail,
        'Jours travaillés',
        BLUE,
        '#EAF4FF',
      );

      drawSummaryCard(
  margin + (cardWidth + cardGap),
  y,
  cardWidth,
  totalConges,
  'Congés',
  GREEN,
  '#EAFBF0',
);

      drawSummaryCard(
        margin + (cardWidth + cardGap) * 2,
        y,
        cardWidth,
        totalAbsences,
        'Absences',
        RED,
        '#FFF0F0',
      );

      drawSummaryCard(
  margin + (cardWidth + cardGap) * 3,
  y,
  cardWidth,
  totalRtt,
  'RTT',
  PURPLE,
  '#F5F3FF',
);

      y += 80;

      drawSectionTitle('STATUT & VALIDATION', y);
y += 28;

const validationBoxGap = 14;
const validationBoxWidth = (contentWidth - validationBoxGap) / 2;

const clientStatus = getClientValidationStatus();
const adminStatus = getAdminValidationStatus();

const clientValidationDate =
  cra.dateValidationClient || cra.dateRefusClient || null;

const adminValidationDate =
  cra.dateValidationAdmin || cra.dateRefusAdmin || null;

drawValidationBox(
  margin,
  y,
  validationBoxWidth,
  'Validation client',
  clientStatus,
  clientValidationDate,
);

drawValidationBox(
  margin + validationBoxWidth + validationBoxGap,
  y,
  validationBoxWidth,
  'Validation administrateur',
  adminStatus,
  adminValidationDate,
);

y += 80;
      y = ensureSpace(y, 115);

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
          .text(title.toUpperCase(), x + 10, y + 10, {
            width: sigWidth - 20,
            lineBreak: false,
          });

        doc
          .fillColor(DARK_BLUE)
          .fontSize(9)
          .font('Helvetica-Bold')
          .text(name || '-', x + 10, y + 26, {
            width: sigWidth - 20,
            lineBreak: false,
          });

        doc
          .moveTo(x + 10, y + 52)
          .lineTo(x + sigWidth - 10, y + 52)
          .strokeColor(BLUE)
          .stroke();

        doc
          .fillColor('#7F8C8D')
          .fontSize(7)
          .font('Helvetica')
          .text('Signature & date', x + 10, y + 56, {
            width: sigWidth - 20,
            lineBreak: false,
          });
      };

      drawSignature(margin, 'Collaborateur', collaborateur);
      drawSignature(margin + sigWidth + 10, 'Responsable service', clientValidator);
      drawSignature(
        margin + (sigWidth + 10) * 2,
        'Administrateur',
        adminValidator,
      );

      const range = doc.bufferedPageRange();

      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(i);

        const footerY = pageHeight - 58;

        doc.rect(0, footerY, pageWidth, 58).fill(BLUE);
        doc.rect(0, footerY - 3, pageWidth, 3).fill(ORANGE);

        doc
          .fillColor('#FFFFFF')
          .fontSize(7)
          .font('Helvetica')
          .text('GMES — Document confidentiel', margin, footerY + 22, {
            width: 190,
            lineBreak: false,
          });

        doc.text(`${reference} — Page ${i + 1}/${range.count}`, 230, footerY + 22, {
          width: 150,
          align: 'center',
          lineBreak: false,
        });

        doc.text(
          `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
          pageWidth - 180,
          footerY + 22,
          {
            width: 140,
            align: 'right',
            lineBreak: false,
          },
        );
      }

      doc.end();
    });
  }
}