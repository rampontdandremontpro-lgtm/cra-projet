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
        layout: 'landscape',
        margin: 35,
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
      const TEXT = '#2C3E50';

      const pageWidth = doc.page.width;
      const pageHeight = doc.page.height;
      const margin = 35;
      const contentWidth = pageWidth - margin * 2;
      const footerHeight = 55;
      const maxY = pageHeight - footerHeight - 25;

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

      const dayNames = [
        'Dimanche',
        'Lundi',
        'Mardi',
        'Mercredi',
        'Jeudi',
        'Vendredi',
        'Samedi',
      ];

      const toIsoDate = (date?: string | Date | null): string => {
        if (!date) return '';

        if (typeof date === 'string') {
          return date.split('T')[0];
        }

        return date.toISOString().split('T')[0];
      };

      const formatDate = (date?: string | Date | null): string => {
        if (!date) return '-';

        const datePart = toIsoDate(date);
        const parts = datePart.split('-');

        if (parts.length === 3) {
          const [year, month, day] = parts;
          return `${day}/${month}/${year}`;
        }

        return datePart || '-';
      };

      const formatNumber = (value: number): string => {
        const numericValue = Number(value || 0);

        if (Number.isInteger(numericValue)) {
          return String(numericValue);
        }

        return numericValue.toFixed(1);
      };

      const getActivityColumns = () => {
        const columns = cra.activityColumns || cra.activity_columns || [];

        const normalized = [...columns]
          .sort((a, b) => Number(a.orderIndex || 0) - Number(b.orderIndex || 0))
          .map((column, index) => ({
            id: column.id,
            nom: column.nom || `Activité ${index + 1}`,
            orderIndex: column.orderIndex ?? index,
          }));

        if (normalized.length === 0) {
          return [
            {
              id: 'legacy-activity',
              nom: 'Activité',
              orderIndex: 0,
            },
          ];
        }

        return normalized;
      };

      const activityColumns = getActivityColumns();

      const jours = [...(cra.days || cra.jours || [])].sort((a, b) =>
        String(a.date).localeCompare(String(b.date)),
      );

      const daysByDate = new Map(
        jours.map((jour) => [toIsoDate(jour.date), jour]),
      );

      const getDayEntries = (jour: any) =>
        jour?.activityEntries || jour?.activity_entries || [];

      const getEntryColumnId = (entry: any) =>
        entry.activityColumn?.id ||
        entry.activity_column?.id ||
        entry.activityColumnId ||
        entry.activity_column_id ||
        entry.columnId;

      const getEntryValue = (jour: any, columnId: number | string): number => {
        const entry = getDayEntries(jour).find(
          (item: any) => String(getEntryColumnId(item)) === String(columnId),
        );

        return Number(entry?.duree || 0);
      };

      const getDayTotal = (jour: any): number => {
        if (!jour) return 0;

        if (jour.type === 'CONGE' || jour.type === 'ABSENCE') {
          return 1;
        }

        const entriesTotal = getDayEntries(jour).reduce(
          (sum: number, entry: any) => sum + Number(entry.duree || 0),
          0,
        );

        if (entriesTotal > 0) {
          return Number(entriesTotal.toFixed(1));
        }

        return Number(jour.duree || 0);
      };

      const getMonthRows = () => {
        const rows: any[] = [];
        const daysInMonth = new Date(cra.annee, cra.mois, 0).getDate();

        for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
          const date = new Date(cra.annee, cra.mois - 1, dayNumber);
          const isoDate = `${cra.annee}-${String(cra.mois).padStart(
            2,
            '0',
          )}-${String(dayNumber).padStart(2, '0')}`;
          const savedDay = daysByDate.get(isoDate);
          const isWeekend = date.getDay() === 0 || date.getDay() === 6;

          rows.push({
            date: isoDate,
            dayName: dayNames[date.getDay()],
            savedDay,
            disabled: !savedDay,
            disabledLabel: isWeekend ? 'Week-end' : 'Non saisissable',
          });
        }

        return rows;
      };

      const monthRows = getMonthRows();

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

      const totalByType = (type: string) =>
        jours
          .filter((jour) => jour.type === type)
          .reduce((total, jour) => total + getDayTotal(jour), 0);

      const totalTravail = totalByType('TRAVAIL');
      const totalConges = totalByType('CONGE');
      const totalAbsences = totalByType('ABSENCE');
      const totalRtt = totalByType('RTT');

      const getActivityTotal = (columnId: number | string) =>
        jours.reduce((total, jour) => total + getEntryValue(jour, columnId), 0);

      const getGrandTotal = () =>
        jours.reduce((total, jour) => total + getDayTotal(jour), 0);

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
          .roundedRect(x, y, width, 50, 6)
          .strokeColor(BORDER)
          .lineWidth(1)
          .stroke();

        doc
          .fillColor('#5D6D7E')
          .fontSize(8)
          .font('Helvetica-Bold')
          .text(title.toUpperCase(), x + 15, y + 11);

        doc
          .fillColor(DARK_BLUE)
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(value, x + 15, y + 28, {
            width: width - 25,
            lineBreak: false,
          });
      };

      const addNewPage = () => {
        doc.addPage();
        drawHeader();

        return 115;
      };

      const ensureSpace = (currentY: number, neededHeight: number) => {
        if (currentY + neededHeight > maxY) {
          return addNewPage();
        }

        return currentY;
      };

      const getColumnWidths = () => {
        const fixedWidths = {
          date: 58,
          day: 65,
          type: 72,
          total: 48,
        };

        const activityWidth =
          (contentWidth -
            fixedWidths.date -
            fixedWidths.day -
            fixedWidths.type -
            fixedWidths.total) /
          activityColumns.length;

        return {
          ...fixedWidths,
          activity: activityWidth,
        };
      };

      const colWidths = getColumnWidths();

      const drawCellText = (
        text: string,
        x: number,
        y: number,
        width: number,
        height: number,
        options?: {
          color?: string;
          bold?: boolean;
          align?: 'left' | 'center' | 'right';
          size?: number;
        },
      ) => {
        doc
          .fillColor(options?.color || TEXT)
          .fontSize(options?.size || 7)
          .font(options?.bold ? 'Helvetica-Bold' : 'Helvetica')
          .text(text, x + 4, y + 6, {
            width: width - 8,
            height: height - 8,
            align: options?.align || 'left',
            ellipsis: true,
          });
      };

      const drawVerticalLines = (
        y: number,
        height: number,
        positions: number[],
      ) => {
        doc.strokeColor(BORDER).lineWidth(0.5);

        positions.forEach((x) => {
          doc.moveTo(x, y).lineTo(x, y + height).stroke();
        });
      };

      const getTypeStyle = (type: string) => {
        if (type === 'CONGE') {
          return { color: GREEN, bg: '#EAFBF0', label: 'CONGÉ' };
        }

        if (type === 'ABSENCE') {
          return { color: RED, bg: '#FFF0F0', label: 'ABSENCE' };
        }

        if (type === 'RTT') {
          return { color: PURPLE, bg: '#F5F3FF', label: 'RTT' };
        }

        return { color: BLUE, bg: '#EAF4FF', label: 'TRAVAIL' };
      };

      const drawBadge = (
        label: string,
        color: string,
        bg: string,
        x: number,
        y: number,
        width: number,
      ) => {
        doc.roundedRect(x + 5, y + 5, width - 10, 14, 3).fill(bg);

        doc
          .fillColor(color)
          .fontSize(6)
          .font('Helvetica-Bold')
          .text(label, x + 7, y + 9, {
            width: width - 14,
            align: 'center',
            lineBreak: false,
          });
      };

      const drawDynamicTableHeader = (y: number) => {
        const headerHeight = 32;
        let x = margin;
        const linePositions: number[] = [];

        doc.roundedRect(margin, y, contentWidth, headerHeight, 4).fill(BLUE);

        drawCellText('DATE', x, y, colWidths.date, headerHeight, {
          color: '#FFFFFF',
          bold: true,
          align: 'center',
        });
        x += colWidths.date;
        linePositions.push(x);

        drawCellText('JOUR', x, y, colWidths.day, headerHeight, {
          color: '#FFFFFF',
          bold: true,
          align: 'center',
        });
        x += colWidths.day;
        linePositions.push(x);

        drawCellText('TYPE', x, y, colWidths.type, headerHeight, {
          color: '#FFFFFF',
          bold: true,
          align: 'center',
        });
        x += colWidths.type;
        linePositions.push(x);

        activityColumns.forEach((column) => {
          drawCellText(column.nom || 'Activité', x, y, colWidths.activity, headerHeight, {
            color: '#FFFFFF',
            bold: true,
            align: 'center',
          });
          x += colWidths.activity;
          linePositions.push(x);
        });

        drawCellText('TOTAL', x, y, colWidths.total, headerHeight, {
          color: '#FFFFFF',
          bold: true,
          align: 'center',
        });

        drawVerticalLines(y, headerHeight, linePositions);

        return y + headerHeight;
      };

      const getRowBackground = (row: any, index: number) => {
        if (row.disabled) return '#F1F5F9';

        const type = row.savedDay?.type;

        if (type === 'CONGE') return '#ECFDF5';
        if (type === 'ABSENCE') return '#FFF1F2';
        if (type === 'RTT') return '#F5F3FF';

        return index % 2 === 0 ? '#FFFFFF' : GREY;
      };

      const drawDynamicRow = (row: any, index: number, y: number) => {
        const rowHeight = 24;
        let x = margin;
        const linePositions: number[] = [];
        const bg = getRowBackground(row, index);

        doc.rect(margin, y, contentWidth, rowHeight).fillAndStroke(bg, BORDER);

        drawCellText(formatDate(row.date), x, y, colWidths.date, rowHeight, {
          align: 'center',
          color: row.disabled ? '#94A3B8' : TEXT,
        });
        x += colWidths.date;
        linePositions.push(x);

        drawCellText(row.dayName, x, y, colWidths.day, rowHeight, {
          align: 'center',
          color: row.disabled ? '#94A3B8' : TEXT,
        });
        x += colWidths.day;
        linePositions.push(x);

        if (row.disabled) {
          drawCellText(row.disabledLabel, x, y, colWidths.type, rowHeight, {
            align: 'center',
            color: '#64748B',
            bold: true,
            size: 6,
          });
        } else {
          const typeStyle = getTypeStyle(row.savedDay?.type);
          drawBadge(typeStyle.label, typeStyle.color, typeStyle.bg, x, y, colWidths.type);
        }

        x += colWidths.type;
        linePositions.push(x);

        activityColumns.forEach((column, columnIndex) => {
          let value = '';

          if (!row.disabled && row.savedDay?.type === 'ABSENCE' && columnIndex === 0) {
            value = row.savedDay?.commentaire || '';
          } else if (
            !row.disabled &&
            row.savedDay?.type !== 'ABSENCE' &&
            row.savedDay?.type !== 'CONGE'
          ) {
            const entryValue = getEntryValue(row.savedDay, column.id);
            value = entryValue > 0 ? formatNumber(entryValue) : '';
          }

          drawCellText(value, x, y, colWidths.activity, rowHeight, {
            align: 'center',
            color: row.savedDay?.type === 'ABSENCE' ? RED : TEXT,
            bold: row.savedDay?.type === 'ABSENCE' || Number(value) > 0,
            size: row.savedDay?.type === 'ABSENCE' ? 6 : 7,
          });

          x += colWidths.activity;
          linePositions.push(x);
        });

        const total = row.disabled ? '-' : formatNumber(getDayTotal(row.savedDay));

        drawCellText(total, x, y, colWidths.total, rowHeight, {
          align: 'center',
          bold: true,
          color: row.disabled ? '#94A3B8' : TEXT,
        });

        drawVerticalLines(y, rowHeight, linePositions);

        return y + rowHeight;
      };

      const drawDynamicTotalsRow = (y: number) => {
        const rowHeight = 26;
        let x = margin;
        const labelWidth = colWidths.date + colWidths.day + colWidths.type;
        const linePositions: number[] = [];

        doc.rect(margin, y, contentWidth, rowHeight).fillAndStroke('#F8FAFC', BORDER);

        drawCellText('TOTAL PAR ACTIVITÉ', x, y, labelWidth, rowHeight, {
          align: 'center',
          bold: true,
          color: '#64748B',
          size: 7,
        });

        x += labelWidth;
        linePositions.push(x);

        activityColumns.forEach((column) => {
          drawCellText(formatNumber(getActivityTotal(column.id)), x, y, colWidths.activity, rowHeight, {
            align: 'center',
            bold: true,
          });
          x += colWidths.activity;
          linePositions.push(x);
        });

        drawCellText(formatNumber(getGrandTotal()), x, y, colWidths.total, rowHeight, {
          align: 'center',
          bold: true,
        });

        drawVerticalLines(y, rowHeight, linePositions);

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
        doc.roundedRect(x, y, width, 50, 6).fillAndStroke(bg, BORDER);

        doc
          .fillColor(color)
          .fontSize(20)
          .font('Helvetica-Bold')
          .text(formatNumber(value), x, y + 10, {
            width,
            align: 'center',
          });

        doc
          .fillColor('#34495E')
          .fontSize(8)
          .font('Helvetica')
          .text(label.toUpperCase(), x, y + 34, {
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
        doc.roundedRect(x, y, width, 50, 6).fillAndStroke('#FFFFFF', BORDER);

        doc
          .fillColor('#5D6D7E')
          .fontSize(8)
          .font('Helvetica-Bold')
          .text(title.toUpperCase(), x + 15, y + 9, {
            width: width - 30,
            lineBreak: false,
          });

        doc.roundedRect(x + 15, y + 25, 120, 16, 5).fill(status.bg);

        doc
          .fillColor(status.color)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text(status.label, x + 22, y + 29, {
            width: 110,
            lineBreak: false,
          });

        doc
          .fillColor(DARK_BLUE)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text(formatDate(date), x + 145, y + 29, {
            width: width - 155,
            lineBreak: false,
          });
      };

      drawHeader();

      let y = 115;

      doc
        .fillColor(DARK_BLUE)
        .fontSize(21)
        .font('Helvetica-Bold')
        .text("COMPTE-RENDU D'ACTIVITÉ", margin, y);

      y += 28;

      doc
        .fillColor('#5D6D7E')
        .fontSize(10)
        .font('Helvetica')
        .text(`Période : ${periode}`, margin, y);

      y += 25;

      const boxWidth = contentWidth / 3;

      drawInfoBox(margin, y, boxWidth, 'Collaborateur', collaborateur);
      drawInfoBox(margin + boxWidth, y, boxWidth, 'Entreprise', entreprise);
      drawInfoBox(margin + boxWidth * 2, y, boxWidth, 'Service', service);

      y += 72;

      drawSectionTitle('DÉTAIL DES ACTIVITÉS', y);
      y += 25;

      y = drawDynamicTableHeader(y);

      monthRows.forEach((row, index) => {
        if (y + 24 > maxY) {
          y = addNewPage();
          drawSectionTitle('DÉTAIL DES ACTIVITÉS - SUITE', y);
          y += 25;
          y = drawDynamicTableHeader(y);
        }

        y = drawDynamicRow(row, index, y);
      });

      if (y + 26 > maxY) {
        y = addNewPage();
        drawSectionTitle('DÉTAIL DES ACTIVITÉS - SUITE', y);
        y += 25;
        y = drawDynamicTableHeader(y);
      }

      y = drawDynamicTotalsRow(y);

      y += 20;
      y = ensureSpace(y, 200);

      drawSectionTitle('RÉCAPITULATIF DU MOIS', y);
      y += 25;

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
        margin + cardWidth + cardGap,
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

      y += 70;

      drawSectionTitle('STATUT & VALIDATION', y);
      y += 25;

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

      y += 70;
      y = ensureSpace(y, 105);

      drawSectionTitle('SIGNATURES', y);
      y += 25;

      const sigWidth = (contentWidth - 20) / 3;

      const drawSignature = (x: number, title: string, name: string) => {
        doc.roundedRect(x, y, sigWidth, 65, 4).strokeColor(BORDER).stroke();

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
          .text(name || '-', x + 10, y + 25, {
            width: sigWidth - 20,
            lineBreak: false,
          });

        doc
          .moveTo(x + 10, y + 49)
          .lineTo(x + sigWidth - 10, y + 49)
          .strokeColor(BLUE)
          .stroke();

        doc
          .fillColor('#7F8C8D')
          .fontSize(7)
          .font('Helvetica')
          .text('Signature & date', x + 10, y + 53, {
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
  doc.switchToPage(range.start + i);

  const footerY = pageHeight - 70;
  const footerTextY = footerY + 22;

  doc.save();

  doc.rect(0, footerY, pageWidth, 70).fill(BLUE);
  doc.rect(0, footerY - 3, pageWidth, 3).fill(ORANGE);

  doc
    .fillColor('#FFFFFF')
    .fontSize(7)
    .font('Helvetica')
    .text('GMES - Document confidentiel', margin, footerTextY, {
      width: 190,
      lineBreak: false,
    });

  doc
    .fillColor('#FFFFFF')
    .fontSize(7)
    .font('Helvetica')
    .text(`${reference} - Page ${i + 1}/${range.count}`, 230, footerTextY, {
      width: 180,
      align: 'center',
      lineBreak: false,
    });

  doc
    .fillColor('#FFFFFF')
    .fontSize(7)
    .font('Helvetica')
    .text(
      `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
      pageWidth - 220,
      footerTextY,
      {
        width: 180,
        align: 'right',
        lineBreak: false,
      },
    );

  doc.restore();
}

      doc.end();
    });
  }
}
