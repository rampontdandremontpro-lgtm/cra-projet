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
        layout: 'portrait',
        margin: 26,
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
      const margin = 26;
      const contentWidth = pageWidth - margin * 2;
      const footerHeight = 38;
      const maxY = pageHeight - footerHeight - 18;

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
        if (typeof date === 'string') return date.split('T')[0];
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
        if (Number.isInteger(numericValue)) return String(numericValue);
        return numericValue.toFixed(1);
      };

      const normalizeText = (value: string) =>
        String(value || '')
          .trim()
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '');

      const getSpecialTypeFromColumnName = (name: string): string | null => {
        const normalizedName = normalizeText(name);
        if (normalizedName === 'absence') return 'ABSENCE';
        if (normalizedName === 'rtt') return 'RTT';
        if (normalizedName === 'arret maladie') return 'ARRET_MALADIE';
        return null;
      };

      const getActivityColumns = () => {
        const columns = cra.activityColumns || cra.activity_columns || [];

        const normalized = [...columns]
          .sort((a, b) => Number(a.orderIndex || 0) - Number(b.orderIndex || 0))
          .map((column, index) => {
            const name = column.nom || `Activité ${index + 1}`;

            return {
              id: column.id,
              nom: name,
              orderIndex: column.orderIndex ?? index,
              specialType: getSpecialTypeFromColumnName(name),
            };
          });

        if (normalized.length === 0) {
          return [
            {
              id: 'legacy-activity',
              nom: 'Activité',
              orderIndex: 0,
              specialType: null,
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

      const isSpecialType = (type?: string | null): boolean =>
        ['ABSENCE', 'RTT', 'ARRET_MALADIE'].includes(type || '');

      const getColumnValue = (jour: any, column: any): number => {
        if (!jour || !column) return 0;

        const entryValue = getEntryValue(jour, column.id);
        if (entryValue > 0) return entryValue;

        if (
          column.specialType &&
          jour.type === column.specialType &&
          Number(jour.duree || 0) > 0
        ) {
          return Number(jour.duree || 0);
        }

        return 0;
      };

      const getDayTotal = (jour: any): number => {
        if (!jour) return 0;
        if (jour.type === 'CONGE') return 1;

        const entriesTotal = getDayEntries(jour).reduce(
          (sum: number, entry: any) => sum + Number(entry.duree || 0),
          0,
        );

        if (entriesTotal > 0) return Number(entriesTotal.toFixed(1));
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
          const isHoliday = !savedDay && !isWeekend;

          rows.push({
            date: isoDate,
            dayName: dayNames[date.getDay()],
            savedDay,
            disabled: !savedDay,
            isWeekend,
            isHoliday,
            disabledLabel: isWeekend ? 'Week-end' : 'Jour férié',
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
      const totalArretsMaladie = totalByType('ARRET_MALADIE');
      const totalRtt = totalByType('RTT');

      const getActivityTotal = (column: any) =>
        jours.reduce((total, jour) => total + getColumnValue(jour, column), 0);

      const getGrandTotal = () =>
        jours.reduce((total, jour) => total + getDayTotal(jour), 0);

      const drawHeader = () => {
        const logoPath = path.join(
          process.cwd(),
          'src/pdf/assets/gmes-logo.jpg',
        );

        if (fs.existsSync(logoPath)) {
          doc.image(logoPath, margin, 12, { width: 48 });
        } else {
          doc
            .fillColor(BLUE)
            .fontSize(18)
            .font('Helvetica-Bold')
            .text('GMES', margin, 22);
        }

        doc
          .fillColor(DARK_BLUE)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text('DOCUMENT INTERNE', pageWidth - margin - 150, 18, {
            width: 150,
            align: 'right',
            lineBreak: false,
          });

        doc
          .fillColor(ORANGE)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text(`Référence : ${reference}`, pageWidth - margin - 170, 36, {
            width: 170,
            align: 'right',
            lineBreak: false,
          });

        const lineY = 64;
        doc.rect(margin, lineY, contentWidth * 0.45, 2).fill(BLUE);
        doc.rect(margin + contentWidth * 0.45, lineY, contentWidth * 0.3, 2).fill(ORANGE);
        doc.rect(margin + contentWidth * 0.75, lineY, contentWidth * 0.25, 2).fill(BLUE);
      };

      const drawSectionTitle = (title: string, y: number) => {
        doc.rect(margin, y + 1, 3, 12).fill(ORANGE);

        doc
          .fillColor(DARK_BLUE)
          .fontSize(10)
          .font('Helvetica-Bold')
          .text(title, margin + 10, y, {
            width: contentWidth - 10,
            lineBreak: false,
          });
      };

      const drawInfoBox = (
        x: number,
        y: number,
        width: number,
        title: string,
        value: string,
      ) => {
        doc
          .roundedRect(x, y, width, 40, 5)
          .strokeColor(BORDER)
          .lineWidth(0.8)
          .stroke();

        doc
          .fillColor('#5D6D7E')
          .fontSize(6.5)
          .font('Helvetica-Bold')
          .text(title.toUpperCase(), x + 10, y + 8, {
            width: width - 20,
            lineBreak: false,
          });

        doc
          .fillColor(DARK_BLUE)
          .fontSize(8)
          .font('Helvetica-Bold')
          .text(value, x + 10, y + 22, {
            width: width - 20,
            height: 15,
            ellipsis: true,
          });
      };

      const addNewPage = () => {
        doc.addPage();
        drawHeader();
        return 84;
      };

      const ensureSpace = (currentY: number, neededHeight: number) => {
        if (currentY + neededHeight > maxY) return addNewPage();
        return currentY;
      };

      const getActivityColumnGroups = () => {
        const fixedWidth = 48 + 46 + 56 + 34;
        const minActivityWidth = 42;
        const maxColumnsPerTable = Math.max(
          1,
          Math.floor((contentWidth - fixedWidth) / minActivityWidth),
        );

        const groups: any[][] = [];

        for (let i = 0; i < activityColumns.length; i += maxColumnsPerTable) {
          groups.push(activityColumns.slice(i, i + maxColumnsPerTable));
        }

        return groups;
      };

      const activityColumnGroups = getActivityColumnGroups();

      const getColumnWidths = (columns: any[]) => {
        const fixedWidths = {
          date: 48,
          day: 46,
          type: 56,
          total: 34,
        };

        const activityWidth =
          (contentWidth -
            fixedWidths.date -
            fixedWidths.day -
            fixedWidths.type -
            fixedWidths.total) /
          Math.max(columns.length, 1);

        return {
          ...fixedWidths,
          activity: activityWidth,
        };
      };

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
          .fontSize(options?.size || 5.8)
          .font(options?.bold ? 'Helvetica-Bold' : 'Helvetica')
          .text(text, x + 2, y + 4, {
            width: width - 4,
            height: height - 5,
            align: options?.align || 'left',
            ellipsis: true,
          });
      };

      const drawVerticalLines = (
        y: number,
        height: number,
        positions: number[],
      ) => {
        doc.strokeColor(BORDER).lineWidth(0.4);

        positions.forEach((x) => {
          doc.moveTo(x, y).lineTo(x, y + height).stroke();
        });
      };

      const getTypeStyle = (type: string) => {
        if (type === 'CONGE') return { color: GREEN, bg: '#EAFBF0', label: 'CONGÉ' };
        if (type === 'ABSENCE') return { color: RED, bg: '#FFF0F0', label: 'ABSENCE' };
        if (type === 'ARRET_MALADIE') return { color: RED, bg: '#FFF0F0', label: 'ARRÊT MAL.' };
        if (type === 'RTT') return { color: PURPLE, bg: '#F5F3FF', label: 'RTT' };
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
        doc.roundedRect(x + 4, y + 4, width - 8, 10, 2).fill(bg);

        doc
          .fillColor(color)
          .fontSize(4.8)
          .font('Helvetica-Bold')
          .text(label, x + 5, y + 7, {
            width: width - 10,
            align: 'center',
            lineBreak: false,
          });
      };

      const drawDynamicTableHeader = (y: number, columns: any[]) => {
        const headerHeight = 22;
        const colWidths = getColumnWidths(columns);
        let x = margin;
        const linePositions: number[] = [];

        doc.roundedRect(margin, y, contentWidth, headerHeight, 3).fill(BLUE);

        drawCellText('DATE', x, y, colWidths.date, headerHeight, {
          color: '#FFFFFF',
          bold: true,
          align: 'center',
          size: 5.6,
        });
        x += colWidths.date;
        linePositions.push(x);

        drawCellText('JOUR', x, y, colWidths.day, headerHeight, {
          color: '#FFFFFF',
          bold: true,
          align: 'center',
          size: 5.6,
        });
        x += colWidths.day;
        linePositions.push(x);

        drawCellText('TYPE', x, y, colWidths.type, headerHeight, {
          color: '#FFFFFF',
          bold: true,
          align: 'center',
          size: 5.6,
        });
        x += colWidths.type;
        linePositions.push(x);

        columns.forEach((column) => {
          drawCellText(column.nom || 'Activité', x, y, colWidths.activity, headerHeight, {
            color: '#FFFFFF',
            bold: true,
            align: 'center',
            size: columns.length > 7 ? 4.8 : 5.2,
          });
          x += colWidths.activity;
          linePositions.push(x);
        });

        drawCellText('TOTAL', x, y, colWidths.total, headerHeight, {
          color: '#FFFFFF',
          bold: true,
          align: 'center',
          size: 5.2,
        });

        drawVerticalLines(y, headerHeight, linePositions);

        return y + headerHeight;
      };

      const getRowBackground = (row: any, index: number) => {
        if (row.isHoliday) return '#FFF7ED';
        if (row.disabled) return '#F1F5F9';

        const type = row.savedDay?.type;

        if (type === 'CONGE') return '#ECFDF5';
        if (type === 'ABSENCE' || type === 'ARRET_MALADIE') return '#FFF1F2';
        if (type === 'RTT') return '#F5F3FF';

        return index % 2 === 0 ? '#FFFFFF' : GREY;
      };

      const drawDynamicRow = (
        row: any,
        index: number,
        y: number,
        columns: any[],
      ) => {
        const rowHeight = 18;
        const colWidths = getColumnWidths(columns);
        let x = margin;
        const linePositions: number[] = [];
        const bg = getRowBackground(row, index);

        doc.rect(margin, y, contentWidth, rowHeight).fillAndStroke(bg, BORDER);

        drawCellText(formatDate(row.date), x, y, colWidths.date, rowHeight, {
          align: 'center',
          color: row.disabled ? '#94A3B8' : TEXT,
          size: 5.3,
        });
        x += colWidths.date;
        linePositions.push(x);

        drawCellText(row.dayName, x, y, colWidths.day, rowHeight, {
          align: 'center',
          color: row.disabled ? '#94A3B8' : TEXT,
          size: 5.2,
        });
        x += colWidths.day;
        linePositions.push(x);

        if (row.disabled) {
          drawCellText(row.disabledLabel, x, y, colWidths.type, rowHeight, {
            align: 'center',
            color: row.isHoliday ? ORANGE : '#64748B',
            bold: true,
            size: 5,
          });
        } else {
          const typeStyle = getTypeStyle(row.savedDay?.type);
          drawBadge(typeStyle.label, typeStyle.color, typeStyle.bg, x, y, colWidths.type);
        }

        x += colWidths.type;
        linePositions.push(x);

        columns.forEach((column) => {
          let value = '';
          let valueColor = TEXT;
          let valueSize = 5.5;
          let isBold = false;

          if (!row.disabled && row.savedDay?.type !== 'CONGE') {
            const entryValue = getColumnValue(row.savedDay, column);

            if (column.specialType) {
              if (row.savedDay?.type === column.specialType && entryValue > 0) {
                if (column.specialType === 'ABSENCE') {
                  const reason = row.savedDay?.commentaire || 'Absence';
                  value = `${reason} / ${formatNumber(entryValue)}`;
                  valueSize = 4.6;
                } else {
                  value = formatNumber(entryValue);
                }

                valueColor = column.specialType === 'RTT' ? PURPLE : RED;
                isBold = true;
              }
            } else if (!isSpecialType(column.specialType)) {
              value = entryValue > 0 ? formatNumber(entryValue) : '';
              isBold = entryValue > 0;
            }
          }

          drawCellText(value, x, y, colWidths.activity, rowHeight, {
            align: 'center',
            color: valueColor,
            bold: isBold,
            size: valueSize,
          });

          x += colWidths.activity;
          linePositions.push(x);
        });

        const total = row.disabled ? '-' : formatNumber(getDayTotal(row.savedDay));

        drawCellText(total, x, y, colWidths.total, rowHeight, {
          align: 'center',
          bold: true,
          color: row.disabled ? '#94A3B8' : TEXT,
          size: 5.7,
        });

        drawVerticalLines(y, rowHeight, linePositions);

        return y + rowHeight;
      };

      const drawDynamicTotalsRow = (y: number, columns: any[]) => {
        const rowHeight = 20;
        const colWidths = getColumnWidths(columns);
        let x = margin;
        const labelWidth = colWidths.date + colWidths.day + colWidths.type;
        const linePositions: number[] = [];

        doc.rect(margin, y, contentWidth, rowHeight).fillAndStroke('#F8FAFC', BORDER);

        drawCellText('TOTAL PAR ACTIVITÉ', x, y, labelWidth, rowHeight, {
          align: 'center',
          bold: true,
          color: '#64748B',
          size: 5.5,
        });

        x += labelWidth;
        linePositions.push(x);

        columns.forEach((column) => {
          drawCellText(formatNumber(getActivityTotal(column)), x, y, colWidths.activity, rowHeight, {
            align: 'center',
            bold: true,
            size: 5.7,
          });
          x += colWidths.activity;
          linePositions.push(x);
        });

        drawCellText(formatNumber(getGrandTotal()), x, y, colWidths.total, rowHeight, {
          align: 'center',
          bold: true,
          size: 5.7,
        });

        drawVerticalLines(y, rowHeight, linePositions);

        return y + rowHeight;
      };

      const drawActivityTableGroup = (
        y: number,
        columns: any[],
        groupIndex: number,
        groupCount: number,
      ) => {
        if (groupIndex > 0) {
          y = ensureSpace(y, 40);
          drawSectionTitle(
            `DÉTAIL DES ACTIVITÉS - COLONNES ${groupIndex + 1}/${groupCount}`,
            y,
          );
          y += 18;
        }

        y = drawDynamicTableHeader(y, columns);

        monthRows.forEach((row, index) => {
          if (y + 18 > maxY) {
            y = addNewPage();
            drawSectionTitle(
              groupCount > 1
                ? `DÉTAIL DES ACTIVITÉS - COLONNES ${groupIndex + 1}/${groupCount}`
                : 'DÉTAIL DES ACTIVITÉS - SUITE',
              y,
            );
            y += 18;
            y = drawDynamicTableHeader(y, columns);
          }

          y = drawDynamicRow(row, index, y, columns);
        });

        if (y + 20 > maxY) {
          y = addNewPage();
          drawSectionTitle(
            groupCount > 1
              ? `DÉTAIL DES ACTIVITÉS - COLONNES ${groupIndex + 1}/${groupCount}`
              : 'DÉTAIL DES ACTIVITÉS - SUITE',
            y,
          );
          y += 18;
          y = drawDynamicTableHeader(y, columns);
        }

        y = drawDynamicTotalsRow(y, columns);
        return y + 16;
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
        doc.roundedRect(x, y, width, 42, 5).fillAndStroke(bg, BORDER);

        doc
          .fillColor(color)
          .fontSize(16)
          .font('Helvetica-Bold')
          .text(formatNumber(value), x, y + 7, {
            width,
            align: 'center',
          });

        doc
          .fillColor('#34495E')
          .fontSize(6.5)
          .font('Helvetica-Bold')
          .text(label.toUpperCase(), x + 4, y + 27, {
            width: width - 8,
            align: 'center',
            height: 12,
            ellipsis: true,
          });
      };

      const getClientValidationStatus = () => {
        if (cra.statut === 'SOUMIS_CLIENT') {
          return { label: 'SOUMIS_CLIENT', color: ORANGE, bg: '#FFF3E0' };
        }

        if (
          cra.statut === 'VALIDE_CLIENT' ||
          cra.statut === 'VALIDE_ADMIN' ||
          cra.statut === 'REFUSE_ADMIN' ||
          cra.statut === 'ARCHIVE'
        ) {
          return { label: 'VALIDE_CLIENT', color: GREEN, bg: '#EAFBF0' };
        }

        if (cra.statut === 'REFUSE_CLIENT') {
          return { label: 'REFUSE_CLIENT', color: RED, bg: '#FFF0F0' };
        }

        return { label: '-', color: '#5D6D7E', bg: '#FFFFFF' };
      };

      const getAdminValidationStatus = () => {
        if (cra.statut === 'VALIDE_ADMIN' || cra.statut === 'ARCHIVE') {
          return { label: 'VALIDE_ADMIN', color: GREEN, bg: '#EAFBF0' };
        }

        if (cra.statut === 'REFUSE_ADMIN') {
          return { label: 'REFUSE_ADMIN', color: RED, bg: '#FFF0F0' };
        }

        return { label: '-', color: '#5D6D7E', bg: '#FFFFFF' };
      };

      const drawValidationBox = (
        x: number,
        y: number,
        width: number,
        title: string,
        status: { label: string; color: string; bg: string },
        date?: string | Date | null,
      ) => {
        doc.roundedRect(x, y, width, 42, 5).fillAndStroke('#FFFFFF', BORDER);

        doc
          .fillColor('#5D6D7E')
          .fontSize(6.5)
          .font('Helvetica-Bold')
          .text(title.toUpperCase(), x + 10, y + 7, {
            width: width - 20,
            lineBreak: false,
          });

        doc.roundedRect(x + 10, y + 22, 88, 13, 4).fill(status.bg);

        doc
          .fillColor(status.color)
          .fontSize(6)
          .font('Helvetica-Bold')
          .text(status.label, x + 14, y + 26, {
            width: 80,
            lineBreak: false,
          });

        doc
          .fillColor(DARK_BLUE)
          .fontSize(6.5)
          .font('Helvetica-Bold')
          .text(formatDate(date), x + 105, y + 26, {
            width: width - 112,
            align: 'right',
            lineBreak: false,
          });
      };

      drawHeader();

      let y = 84;

      doc
        .fillColor(DARK_BLUE)
        .fontSize(17)
        .font('Helvetica-Bold')
        .text("COMPTE-RENDU D'ACTIVITÉ", margin, y, {
          lineBreak: false,
        });

      y += 23;

      doc
        .fillColor('#5D6D7E')
        .fontSize(8.5)
        .font('Helvetica')
        .text(`Période : ${periode}`, margin, y, {
          lineBreak: false,
        });

      y += 20;

      const infoGap = 6;
      const boxWidth = (contentWidth - infoGap * 2) / 3;

      drawInfoBox(margin, y, boxWidth, 'Collaborateur', collaborateur);
      drawInfoBox(margin + boxWidth + infoGap, y, boxWidth, 'Entreprise', entreprise);
      drawInfoBox(margin + (boxWidth + infoGap) * 2, y, boxWidth, 'Service', service);

      y += 58;

      drawSectionTitle('DÉTAIL DES ACTIVITÉS', y);
      y += 18;

      activityColumnGroups.forEach((columns, groupIndex) => {
        y = drawActivityTableGroup(y, columns, groupIndex, activityColumnGroups.length);
      });

      y += 4;
      y = ensureSpace(y, 165);

      drawSectionTitle('RÉCAPITULATIF DU MOIS', y);
      y += 18;

      const cardGap = 6;
      const cardWidth = (contentWidth - cardGap * 4) / 5;

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
        totalArretsMaladie,
        'Arrêts maladie',
        RED,
        '#FFF0F0',
      );

      drawSummaryCard(
        margin + (cardWidth + cardGap) * 4,
        y,
        cardWidth,
        totalRtt,
        'RTT',
        PURPLE,
        '#F5F3FF',
      );

      y += 58;

      drawSectionTitle('STATUT & VALIDATION', y);
      y += 18;

      const validationBoxGap = 10;
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

      y += 58;
      y = ensureSpace(y, 125);

      drawSectionTitle('SIGNATURES', y);
      y += 18;

      const sigGap = 8;
      const sigWidth = (contentWidth - sigGap * 2) / 3;
      const sigHeight = 86;

      const drawSignature = (x: number, title: string, name: string) => {
        doc.roundedRect(x, y, sigWidth, sigHeight, 4).strokeColor(BORDER).stroke();

        doc
          .fillColor('#5D6D7E')
          .fontSize(6.5)
          .font('Helvetica-Bold')
          .text(title.toUpperCase(), x + 8, y + 8, {
            width: sigWidth - 16,
            lineBreak: false,
          });

        doc
          .fillColor(DARK_BLUE)
          .fontSize(7.5)
          .font('Helvetica-Bold')
          .text(name || '-', x + 8, y + 22, {
            width: sigWidth - 16,
            height: 12,
            ellipsis: true,
          });

        doc
          .moveTo(x + 8, y + 62)
          .lineTo(x + sigWidth - 8, y + 62)
          .strokeColor(BLUE)
          .stroke();

        doc
          .fillColor('#7F8C8D')
          .fontSize(6)
          .font('Helvetica')
          .text('Signature & date', x + 8, y + 68, {
            width: sigWidth - 16,
            lineBreak: false,
          });
      };

      drawSignature(margin, 'Collaborateur', collaborateur);
      drawSignature(margin + sigWidth + sigGap, 'Responsable service', clientValidator);
      drawSignature(
        margin + (sigWidth + sigGap) * 2,
        'Administrateur',
        adminValidator,
      );

      const range = doc.bufferedPageRange();

      for (let i = 0; i < range.count; i++) {
        doc.switchToPage(range.start + i);

        // IMPORTANT : ne pas placer le texte du footer trop près du bas.
        // Sinon PDFKit crée des pages blanches avec uniquement les morceaux du footer.
        const footerY = pageHeight - 48;
        const footerTextY = footerY + 12;
        const footerTextHeight = 10;

        doc.save();

        doc.rect(margin, footerY, contentWidth * 0.45, 1.5).fill(BLUE);
        doc.rect(margin + contentWidth * 0.45, footerY, contentWidth * 0.3, 1.5).fill(ORANGE);
        doc.rect(margin + contentWidth * 0.75, footerY, contentWidth * 0.25, 1.5).fill(BLUE);

        doc
          .fillColor('#334155')
          .fontSize(6.5)
          .font('Helvetica')
          .text('GMES - Document confidentiel', margin, footerTextY, {
            width: 165,
            height: footerTextHeight,
            lineBreak: false,
            ellipsis: true,
          });

        doc
          .fillColor('#334155')
          .fontSize(6.5)
          .font('Helvetica')
          .text(`${reference} - Page ${i + 1}/${range.count}`, margin + 170, footerTextY, {
            width: contentWidth - 340,
            height: footerTextHeight,
            align: 'center',
            lineBreak: false,
            ellipsis: true,
          });

        doc
          .fillColor('#334155')
          .fontSize(6.5)
          .font('Helvetica')
          .text(
            `Généré le ${new Date().toLocaleDateString('fr-FR')}`,
            pageWidth - margin - 165,
            footerTextY,
            {
              width: 165,
              height: footerTextHeight,
              align: 'right',
              lineBreak: false,
              ellipsis: true,
            },
          );

        doc.restore();
      }

      doc.end();
    });
  }
}
