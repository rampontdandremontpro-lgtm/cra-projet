export const CRA_DAY_TYPES = {
  TRAVAIL: 'TRAVAIL',
  CONGE: 'CONGE',
  ABSENCE: 'ABSENCE',
  RTT: 'RTT',
};

export const CRA_DAY_TYPE_LABELS = {
  TRAVAIL: 'Travail',
  CONGE: 'Congé',
  ABSENCE: 'Absence',
  RTT: 'RTT',
};

export const MONTH_NAMES = [
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

export const DAY_NAMES = [
  'Dimanche',
  'Lundi',
  'Mardi',
  'Mercredi',
  'Jeudi',
  'Vendredi',
  'Samedi',
];

export const formatDateFr = (dateString) => {
  if (!dateString) return '';

  const [year, month, day] = String(dateString).split('-');
  return `${day}/${month}/${year}`;
};

export const toDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
};

export const isWeekendDate = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

export const isDateBefore = (dateString, limitString) => {
  if (!dateString || !limitString) return false;
  return dateString < String(limitString).split('T')[0];
};

export const isDateAfter = (dateString, limitString) => {
  if (!dateString || !limitString) return false;
  return dateString > String(limitString).split('T')[0];
};

export const getDayTotal = (row) => {
  if (!row || row.disabled) return 0;

  if (row.type === CRA_DAY_TYPES.CONGE || row.type === CRA_DAY_TYPES.ABSENCE) {
    return 1;
  }

  return Object.values(row.activities || {}).reduce((sum, value) => {
    const numberValue = Number(value || 0);
    return sum + numberValue;
  }, 0);
};

export const getColumnTotal = (rows, columnId) => {
  return rows.reduce((sum, row) => {
    if (row.disabled) return sum;
    const value = Number(row.activities?.[columnId] || 0);
    return sum + value;
  }, 0);
};

export const getSummaryTotals = (rows) => {
  return rows.reduce(
    (totals, row) => {
      if (row.disabled) return totals;

      if (row.type === CRA_DAY_TYPES.CONGE) {
        totals.conges += 1;
        return totals;
      }

      if (row.type === CRA_DAY_TYPES.ABSENCE) {
        totals.absences += 1;
        return totals;
      }

      if (row.type === CRA_DAY_TYPES.RTT) {
        totals.rtt += getDayTotal(row);
        return totals;
      }

      totals.travail += getDayTotal(row);
      return totals;
    },
    {
      travail: 0,
      conges: 0,
      absences: 0,
      rtt: 0,
    },
  );
};

export const normalizeNumberInput = (value) => {
  if (value === '' || value === null || value === undefined) {
    return '';
  }

  const numberValue = Number(value);

  if (Number.isNaN(numberValue)) {
    return '';
  }

  return numberValue;
};

export const generateMonthRows = ({
  mois,
  annee,
  assignment,
  holidayDates = [],
  existingDays = [],
  activityColumns = [],
}) => {
  const daysInMonth = new Date(annee, mois, 0).getDate();

  const existingByDate = new Map(
    existingDays.map((day) => [
      String(day.date).split('T')[0],
      day,
    ]),
  );

  const rows = [];

  for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
    const date = new Date(annee, mois - 1, dayNumber);
    const dateString = toDateInputValue(date);
    const existingDay = existingByDate.get(dateString);

    const isWeekend = isWeekendDate(date);
    const isHoliday = holidayDates.includes(dateString);
    const isBeforeAssignment = isDateBefore(dateString, assignment?.startDate);
    const isAfterAssignment = isDateAfter(dateString, assignment?.endDate);

    const disabled =
      isWeekend || isHoliday || isBeforeAssignment || isAfterAssignment;

    const activities = {};

    for (const column of activityColumns) {
      activities[column.id] = '';
    }

    if (existingDay?.activityEntries?.length > 0) {
      for (const entry of existingDay.activityEntries) {
        const columnId =
          entry.activityColumn?.id ||
          entry.activityColumnId ||
          entry.columnId;

        if (columnId) {
          activities[columnId] = Number(entry.duree);
        }
      }
    }

    rows.push({
      date: dateString,
      jour: DAY_NAMES[date.getDay()],
      type: disabled
        ? ''
        : existingDay?.type || CRA_DAY_TYPES.TRAVAIL,
      commentaire: existingDay?.commentaire || '',
      activities,
      disabled,
      isWeekend,
      isHoliday,
      isBeforeAssignment,
      isAfterAssignment,
    });
  }

  return rows;
};

export const buildCraPayloadFromTimesheet = ({
  mois,
  annee,
  activityColumns,
  rows,
}) => {
  const enabledRows = rows.filter((row) => !row.disabled);

  return {
    mois: Number(mois),
    annee: Number(annee),
    activityColumns: activityColumns.map((column, index) => ({
      nom: column.nom,
      orderIndex: index,
    })),
    days: enabledRows.map((row) => {
      const activityEntries = [];

      if (
        row.type === CRA_DAY_TYPES.TRAVAIL ||
        row.type === CRA_DAY_TYPES.RTT
      ) {
        activityColumns.forEach((column, index) => {
          const value = Number(row.activities?.[column.id] || 0);

          if (value > 0) {
            activityEntries.push({
              activityColumnIndex: index,
              duree: value,
            });
          }
        });
      }

      return {
        date: row.date,
        type: row.type,
        duree: getDayTotal(row),
        commentaire:
          row.type === CRA_DAY_TYPES.ABSENCE
            ? row.commentaire || ''
            : row.commentaire || '',
        activityEntries,
      };
    }),
  };
};

export const createDefaultActivityColumn = (index = 0) => ({
  id: `local-${Date.now()}-${index}`,
  nom: `Activité ${index + 1}`,
  orderIndex: index,
});