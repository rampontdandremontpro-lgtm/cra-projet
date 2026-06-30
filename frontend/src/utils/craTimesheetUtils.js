export const CRA_DAY_TYPES = {
  TRAVAIL: 'TRAVAIL',
  CONGE: 'CONGE',
  ABSENCE: 'ABSENCE',
  RTT: 'RTT',
  ARRET_MALADIE: 'ARRET_MALADIE',
};

export const CRA_DAY_TYPE_LABELS = {
  TRAVAIL: 'Travail',
  CONGE: 'Congé',
  ABSENCE: 'Absence',
  RTT: 'RTT',
  ARRET_MALADIE: 'Arrêt maladie',
};

export const SPECIAL_ACTIVITY_COLUMNS = {
  ABSENCE: {
    id: 'special-absence',
    nom: 'Absence',
    type: 'SPECIAL',
    specialType: CRA_DAY_TYPES.ABSENCE,
    locked: true,
    orderIndex: -30,
  },
  RTT: {
    id: 'special-rtt',
    nom: 'RTT',
    type: 'SPECIAL',
    specialType: CRA_DAY_TYPES.RTT,
    locked: true,
    orderIndex: -20,
  },
  ARRET_MALADIE: {
    id: 'special-arret-maladie',
    nom: 'Arrêt maladie',
    type: 'SPECIAL',
    specialType: CRA_DAY_TYPES.ARRET_MALADIE,
    locked: true,
    orderIndex: -10,
  },
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

  if (row.type === CRA_DAY_TYPES.CONGE) {
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
        totals.absences += getDayTotal(row);
        return totals;
      }

      if (row.type === CRA_DAY_TYPES.ARRET_MALADIE) {
        totals.arretsMaladie += getDayTotal(row);
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
      arretsMaladie: 0,
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
  activities[column.id] = existingDay?.activities?.[column.id] ?? '';
}

    const existingEntries =
  existingDay?.activityEntries ||
  existingDay?.activity_entries ||
  [];

if (existingEntries.length > 0) {
  for (const entry of existingEntries) {
    const rawColumnId =
      entry.activityColumn?.id ||
      entry.activity_column?.id ||
      entry.activityColumnId ||
      entry.activity_column_id ||
      entry.columnId;

    const matchedColumn = activityColumns.find((column) => {
      return (
        String(column.id) === String(rawColumnId) ||
        String(column.backendId) === String(rawColumnId)
      );
    });

    if (matchedColumn) {
      activities[matchedColumn.id] = Number(entry.duree);
    }
  }

  const specialColumnForDay = activityColumns.find(
  (column) => column.specialType === existingDay?.type,
);

const isSpecialDay =
  existingDay?.type === CRA_DAY_TYPES.ABSENCE ||
  existingDay?.type === CRA_DAY_TYPES.RTT ||
  existingDay?.type === CRA_DAY_TYPES.ARRET_MALADIE;

if (
  isSpecialDay &&
  specialColumnForDay &&
  !activities[specialColumnForDay.id] &&
  Number(existingDay?.duree || 0) > 0
) {
  activities[specialColumnForDay.id] = String(Number(existingDay.duree));
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

  const columnsToSend = activityColumns.map((column, index) => ({
    id: column.id,
    nom: column.nom,
    orderIndex: index,
    specialType: column.specialType || null,
    locked: Boolean(column.locked),
  }));

  return {
    mois: Number(mois),
    annee: Number(annee),
    activityColumns: columnsToSend.map((column, index) => ({
      nom: column.nom,
      orderIndex: index,
    })),
    days: enabledRows.map((row) => {
      const activityEntries = [];

      activityColumns.forEach((column, index) => {
        const value = Number(row.activities?.[column.id] || 0);

        if (value > 0) {
          activityEntries.push({
            activityColumnIndex: index,
            duree: value,
          });
        }
      });

      return {
        date: row.date,
        type: row.type,
        duree: getDayTotal(row),
        commentaire: row.commentaire || '',
        activityEntries,
      };
    }),
  };
};

export const createDefaultActivityColumn = (index = 0) => ({
  id: `local-${Date.now()}-${index}`,
  nom: '',
  orderIndex: index,
});

export const normalizeCraActivityColumns = (cra) => {
  const columns = cra?.activityColumns || cra?.activity_columns || [];

  if (!columns.length) {
    return [createDefaultActivityColumn(0)];
  }

  return [...columns]
    .sort((a, b) => Number(a.orderIndex || 0) - Number(b.orderIndex || 0))
    .map((column, index) => {
      const name = column.nom || '';

      let specialType = null;

      if (name === 'Absence') specialType = CRA_DAY_TYPES.ABSENCE;
      if (name === 'RTT') specialType = CRA_DAY_TYPES.RTT;
      if (name === 'Arrêt maladie') specialType = CRA_DAY_TYPES.ARRET_MALADIE;

      return {
        id: specialType
          ? SPECIAL_ACTIVITY_COLUMNS[specialType]?.id || column.id
          : column.id,
        backendId: column.id,
        nom: name,
        orderIndex: column.orderIndex ?? index,
        specialType,
        locked: Boolean(specialType),
      };
    });
};

export const normalizeCraDays = (cra) => {
  return cra?.days || cra?.jours || [];
};

export const generateRowsFromExistingCra = ({
  cra,
  assignment,
  holidayDates = [],
}) => {
  const activityColumns = normalizeCraActivityColumns(cra);
  const existingDays = normalizeCraDays(cra);

  const rows = generateMonthRows({
    mois: Number(cra.mois),
    annee: Number(cra.annee),
    assignment,
    holidayDates,
    existingDays,
    activityColumns,
  });

  return {
    activityColumns,
    rows,
  };
};

export const isSpecialActivityColumn = (column) => {
  return Boolean(column?.specialType);
};

export const shouldShowSpecialColumn = (rows, specialType) => {
  return rows.some((row) => row.type === specialType);
};

export const ensureSpecialActivityColumns = (columns, rows) => {
  const existingById = new Map(columns.map((column) => [column.id, column]));

  const nextColumns = [...columns];

  Object.values(SPECIAL_ACTIVITY_COLUMNS).forEach((specialColumn) => {
    const isNeeded = shouldShowSpecialColumn(rows, specialColumn.specialType);
    const alreadyExists = existingById.has(specialColumn.id);

    if (isNeeded && !alreadyExists) {
      nextColumns.unshift(specialColumn);
    }
  });

  return nextColumns.sort((a, b) => {
    const aOrder = a.orderIndex ?? 0;
    const bOrder = b.orderIndex ?? 0;

    if (aOrder !== bOrder) return aOrder - bOrder;

    return String(a.nom || '').localeCompare(String(b.nom || ''));
  });
};

export const removeUnusedSpecialActivityColumns = (columns, rows) => {
  return columns.filter((column) => {
    if (!column.specialType) return true;

    return shouldShowSpecialColumn(rows, column.specialType);
  });
};

export const syncSpecialActivityColumns = (columns, rows) => {
  const withNeededSpecialColumns = ensureSpecialActivityColumns(columns, rows);
  return removeUnusedSpecialActivityColumns(withNeededSpecialColumns, rows);
};

export const getSpecialColumnForType = (columns, type) => {
  return columns.find((column) => column.specialType === type);
};