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

export const ABSENCES_SPECIAL_TYPE = 'ABSENCES';
export const ABSENCES_COLUMN_ID = 'special-absences';

export const ABSENCE_LIKE_DAY_TYPES = [
  CRA_DAY_TYPES.CONGE,
  CRA_DAY_TYPES.ABSENCE,
  CRA_DAY_TYPES.RTT,
  CRA_DAY_TYPES.ARRET_MALADIE,
];

export const isAbsenceLikeType = (type) => {
  return ABSENCE_LIKE_DAY_TYPES.includes(type);
};

export const SPECIAL_ACTIVITY_COLUMNS = {
  ABSENCES: {
    id: ABSENCES_COLUMN_ID,
    nom: 'Absences',
    type: 'SPECIAL',
    specialType: ABSENCES_SPECIAL_TYPE,
    locked: true,
    orderIndex: -30,
    groupedTypes: ABSENCE_LIKE_DAY_TYPES,
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

export const getAbsencesColumnValue = (row) => {
  if (!row || row.disabled) return 0;
  return Number(row.activities?.[ABSENCES_COLUMN_ID] || 0);
};

export const getDayTotal = (row) => {
  if (!row || row.disabled) return 0;

  return Object.values(row.activities || {}).reduce((sum, value) => {
    const numberValue = Number(value || 0);
    return sum + numberValue;
  }, 0);
};

export const getWorkDuration = (row) => {
  if (!row || row.disabled) return 0;

  const total = getDayTotal(row);
  const absenceValue = getAbsencesColumnValue(row);

  return Math.max(0, total - absenceValue);
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

      const absenceValue = getAbsencesColumnValue(row);
      const workValue = getWorkDuration(row);

      totals.travail += workValue;

      if (row.type === CRA_DAY_TYPES.CONGE) {
        totals.conges += absenceValue;
        return totals;
      }

      if (row.type === CRA_DAY_TYPES.ABSENCE) {
        totals.absences += absenceValue;
        return totals;
      }

      if (row.type === CRA_DAY_TYPES.ARRET_MALADIE) {
        totals.arretsMaladie += absenceValue;
        return totals;
      }

      if (row.type === CRA_DAY_TYPES.RTT) {
        totals.rtt += absenceValue;
        return totals;
      }

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

export const isAbsencesColumnName = (name) => {
  const normalizedName = String(name || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');

  return [
    'absence',
    'absences',
    'conge',
    'conges',
    'rtt',
    'arret maladie',
    'arrets maladie',
  ].includes(normalizedName);
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
          const backendIds = column.backendIds || [];

          return (
            String(column.id) === String(rawColumnId) ||
            String(column.backendId) === String(rawColumnId) ||
            backendIds.map(String).includes(String(rawColumnId))
          );
        });

        if (matchedColumn) {
          const value = Number(entry.duree || 0);

          if (matchedColumn.id === ABSENCES_COLUMN_ID) {
            const previousValue = Number(activities[matchedColumn.id] || 0);
            activities[matchedColumn.id] = previousValue + value;
          } else {
            activities[matchedColumn.id] = value;
          }
        }
      }
    }

    const isAbsenceLikeDay = isAbsenceLikeType(existingDay?.type);

    if (
      isAbsenceLikeDay &&
      activities[ABSENCES_COLUMN_ID] === '' &&
      Number(existingDay?.duree || 0) > 0
    ) {
      activities[ABSENCES_COLUMN_ID] = Number(existingDay.duree);
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

  const sortedColumns = [...columns].sort(
    (a, b) => Number(a.orderIndex || 0) - Number(b.orderIndex || 0),
  );

  let absencesColumn = null;
  const normalColumns = [];

  sortedColumns.forEach((column, index) => {
    const name = column.nom || '';

    if (isAbsencesColumnName(name)) {
      if (!absencesColumn) {
        absencesColumn = {
          ...SPECIAL_ACTIVITY_COLUMNS.ABSENCES,
          backendId: column.id,
          backendIds: [column.id],
          orderIndex: -30,
        };
      } else {
        absencesColumn.backendIds = [
          ...(absencesColumn.backendIds || []),
          column.id,
        ];
      }

      return;
    }

    normalColumns.push({
      id: column.id,
      backendId: column.id,
      backendIds: [column.id],
      nom: name,
      orderIndex: column.orderIndex ?? index,
      specialType: null,
      locked: false,
    });
  });

  const normalizedColumns = absencesColumn
    ? [absencesColumn, ...normalColumns]
    : normalColumns;

  return normalizedColumns.length
    ? normalizedColumns
    : [createDefaultActivityColumn(0)];
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
  return Boolean(column?.specialType || column?.locked);
};

export const isOldSpecialColumn = (column) => {
  return (
    column?.id === 'special-absence' ||
    column?.id === 'special-rtt' ||
    column?.id === 'special-arret-maladie' ||
    column?.specialType === CRA_DAY_TYPES.ABSENCE ||
    column?.specialType === CRA_DAY_TYPES.RTT ||
    column?.specialType === CRA_DAY_TYPES.ARRET_MALADIE ||
    isAbsencesColumnName(column?.nom)
  );
};

export const shouldShowSpecialColumn = (rows) => {
  return rows.some((row) => !row.disabled && isAbsenceLikeType(row.type));
};

export const ensureSpecialActivityColumns = (columns, rows) => {
  const manualColumns = columns.filter((column) => !isOldSpecialColumn(column));
  const needsAbsencesColumn = shouldShowSpecialColumn(rows);

  if (!needsAbsencesColumn) {
    return manualColumns;
  }

  return [
    SPECIAL_ACTIVITY_COLUMNS.ABSENCES,
    ...manualColumns,
  ];
};

export const removeUnusedSpecialActivityColumns = (columns, rows) => {
  const needsAbsencesColumn = shouldShowSpecialColumn(rows);

  return columns.filter((column) => {
    if (column.id === ABSENCES_COLUMN_ID) {
      return needsAbsencesColumn;
    }

    return !isOldSpecialColumn(column);
  });
};

export const syncSpecialActivityColumns = (columns, rows) => {
  return ensureSpecialActivityColumns(columns, rows);
};

export const getSpecialColumnForType = (columns, type) => {
  if (isAbsenceLikeType(type)) {
    return columns.find((column) => column.id === ABSENCES_COLUMN_ID);
  }

  return null;
};