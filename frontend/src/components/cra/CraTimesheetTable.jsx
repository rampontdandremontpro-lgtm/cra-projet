import { useEffect, useRef, useState } from 'react';

import {
  ABSENCES_COLUMN_ID,
  CRA_DAY_TYPES,
  CRA_DAY_TYPE_LABELS,
  formatDateFr,
  getColumnTotal,
  getDayTotal,
  isAbsenceLikeType,
  isSpecialActivityColumn,
  syncSpecialActivityColumns,
} from '../../utils/craTimesheetUtils';

import '../../styles/cra/cra-timesheet.css';

function CraTimesheetTable({
  rows,
  setRows,
  activityColumns,
  setActivityColumns,
  readOnly = false,
  hideReadOnlyControls = false,
}) {
  const tableScrollRef = useRef(null);
  const floatingScrollRef = useRef(null);
  const floatingContentRef = useRef(null);

  const [showFloatingScrollbar, setShowFloatingScrollbar] = useState(false);
  const [floatingScrollbarStyle, setFloatingScrollbarStyle] = useState({
    left: 0,
    width: 0,
  });

  const WORK_DURATION_OPTIONS = [
    '0.1',
    '0.2',
    '0.3',
    '0.4',
    '0.5',
    '0.6',
    '0.7',
    '0.8',
    '0.9',
    '1',
  ];

  const SPECIAL_DURATION_OPTIONS = ['0.5', '1'];

  const [quickFill, setQuickFill] = useState({
  columnId: '',
  duration: '1',
  startDate: '',
  endDate: '',
  absenceType: CRA_DAY_TYPES.CONGE,
  absenceReason: '',
});

useEffect(() => {
  if (readOnly) return;

  const enabledRows = rows.filter((row) => !row.disabled);
  if (!enabledRows.length) return;

  setQuickFill((previousQuickFill) => {
    const firstNormalColumn = activityColumns.find(
      (column) => !isSpecialActivityColumn(column),
    );

    return {
      ...previousQuickFill,
      columnId:
        previousQuickFill.columnId ||
        firstNormalColumn?.id ||
        ABSENCES_COLUMN_ID,
      startDate: previousQuickFill.startDate || enabledRows[0].date,
      endDate:
        previousQuickFill.endDate ||
        enabledRows[enabledRows.length - 1].date,
    };
  });
}, [readOnly, rows, activityColumns]);

const [quickFillSnapshot, setQuickFillSnapshot] = useState(null);

  useEffect(() => {
    const tableScroll = tableScrollRef.current;
    const floatingScroll = floatingScrollRef.current;
    const floatingContent = floatingContentRef.current;

    if (!tableScroll || !floatingScroll || !floatingContent) return;

    let animationFrameId = null;

    const updateFloatingScrollbar = () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      animationFrameId = requestAnimationFrame(() => {
        const rect = tableScroll.getBoundingClientRect();

        const hasHorizontalScroll =
          tableScroll.scrollWidth > tableScroll.clientWidth + 5;

        const tableIsVisible =
          rect.top < window.innerHeight && rect.bottom > 80;

        const realScrollbarIsVisible =
          rect.bottom <= window.innerHeight && rect.bottom > 0;

        const shouldShow =
          hasHorizontalScroll && tableIsVisible && !realScrollbarIsVisible;

        floatingContent.style.width = `${tableScroll.scrollWidth}px`;
        floatingScroll.scrollLeft = tableScroll.scrollLeft;

        setFloatingScrollbarStyle({
          left: `${rect.left}px`,
          width: `${rect.width}px`,
        });

        setShowFloatingScrollbar(shouldShow);
      });
    };

    const syncFromTable = () => {
      floatingScroll.scrollLeft = tableScroll.scrollLeft;
    };

    const syncFromFloating = () => {
      tableScroll.scrollLeft = floatingScroll.scrollLeft;
    };

    updateFloatingScrollbar();

    tableScroll.addEventListener('scroll', syncFromTable);
    floatingScroll.addEventListener('scroll', syncFromFloating);
    window.addEventListener('scroll', updateFloatingScrollbar, true);
    window.addEventListener('resize', updateFloatingScrollbar);

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }

      tableScroll.removeEventListener('scroll', syncFromTable);
      floatingScroll.removeEventListener('scroll', syncFromFloating);
      window.removeEventListener('scroll', updateFloatingScrollbar, true);
      window.removeEventListener('resize', updateFloatingScrollbar);
    };
  }, [activityColumns.length, rows.length]);

  const syncColumnsAndRows = (nextRows) => {
  const syncedColumns = syncSpecialActivityColumns(
    activityColumns,
    nextRows,
  );

  setActivityColumns(syncedColumns);

  return nextRows.map((row) => {
    const nextActivities = {};

    syncedColumns.forEach((column) => {
      if (column.id === ABSENCES_COLUMN_ID) {
        nextActivities[column.id] =
          row.activities?.[ABSENCES_COLUMN_ID] ||
          row.activities?.['special-absence'] ||
          row.activities?.['special-rtt'] ||
          row.activities?.['special-arret-maladie'] ||
          '';

        return;
      }

      nextActivities[column.id] = row.activities?.[column.id] ?? '';
    });

    return {
      ...row,
      activities: nextActivities,
    };
  });
};

  const updateActivityColumnName = (columnId, value) => {
    setActivityColumns((previousColumns) =>
      previousColumns.map((column) =>
        column.id === columnId
          ? {
              ...column,
              nom: value,
            }
          : column,
      ),
    );
  };

  const removeActivityColumn = (columnId) => {
    const columnToRemove = activityColumns.find(
      (column) => column.id === columnId,
    );

    if (!columnToRemove || columnToRemove.locked) return;

    const normalColumns = activityColumns.filter(
      (column) => !isSpecialActivityColumn(column),
    );

    if (normalColumns.length <= 1) return;

    setActivityColumns((previousColumns) =>
      previousColumns.filter((column) => column.id !== columnId),
    );

    setRows((previousRows) =>
      previousRows.map((row) => {
        const nextActivities = { ...(row.activities || {}) };
        delete nextActivities[columnId];

        return {
          ...row,
          activities: nextActivities,
        };
      }),
    );
  };

  const updateRowType = (rowIndex, value) => {
  setRows((previousRows) => {
    const nextRows = previousRows.map((row, index) => {
      if (index !== rowIndex) return row;

      const nextActivities = {};

      Object.keys(row.activities || {}).forEach((key) => {
        nextActivities[key] = '';
      });

      if (isAbsenceLikeType(value)) {
        nextActivities[ABSENCES_COLUMN_ID] = '1';
      }

      return {
        ...row,
        type: value,
        commentaire:
          value === CRA_DAY_TYPES.ABSENCE ? row.commentaire : '',
        activities: nextActivities,
      };
    });

    return syncColumnsAndRows(nextRows);
  });
};

  const updateRowCommentaire = (rowIndex, value) => {
    setRows((previousRows) =>
      previousRows.map((row, index) =>
        index === rowIndex
          ? {
              ...row,
              commentaire: value,
            }
          : row,
      ),
    );
  };

  const updateActivityValue = (rowIndex, columnId, value) => {
  setRows((previousRows) =>
    previousRows.map((row, index) => {
      if (index !== rowIndex) return row;
      if (row.disabled) return row;

      const nextActivities = {
        ...(row.activities || {}),
        [columnId]: value,
      };

      if (columnId === ABSENCES_COLUMN_ID && Number(value) === 1) {
        activityColumns.forEach((column) => {
          if (!isSpecialActivityColumn(column)) {
            nextActivities[column.id] = '';
          }
        });
      }

      return {
        ...row,
        activities: nextActivities,
      };
    }),
  );
};

  const getRowClassName = (row) => {
    const classes = ['timesheet-row'];

    if (row.disabled) classes.push('timesheet-row-disabled');
    if (row.isHoliday) classes.push('timesheet-row-holiday');

    if (row.type === CRA_DAY_TYPES.CONGE) {
      classes.push('timesheet-row-conge');
    }

    if (
      row.type === CRA_DAY_TYPES.ABSENCE ||
      row.type === CRA_DAY_TYPES.ARRET_MALADIE
    ) {
      classes.push('timesheet-row-absence');
    }

    if (row.type === CRA_DAY_TYPES.RTT) {
      classes.push('timesheet-row-rtt');
    }

    const total = getDayTotal(row);

    if (!row.disabled && total > 1) {
      classes.push('timesheet-row-error');
    }

    return classes.join(' ');
  };

  const getDisabledReason = (row) => {
    if (row.isHoliday) return 'Jour férié';
    if (row.isWeekend) return 'Week-end';
    if (row.isBeforeAssignment || row.isAfterAssignment) {
      return 'Hors affectation';
    }

    return 'Non saisissable';
  };

  const isActivityInputDisabled = (row, column) => {
    if (readOnly || row.disabled) return true;

    if (isSpecialActivityColumn(column)) {
      return !isAbsenceLikeType(row.type);
    }

    return ![
      CRA_DAY_TYPES.TRAVAIL,
      CRA_DAY_TYPES.CONGE,
      CRA_DAY_TYPES.ABSENCE,
      CRA_DAY_TYPES.RTT,
      CRA_DAY_TYPES.ARRET_MALADIE,
    ].includes(row.type);
  };

  const renderAbsencesCell = (row, rowIndex, column) => {
  if (row.disabled || !isAbsenceLikeType(row.type)) {
    return <span className="timesheet-empty-cell"></span>;
  }

  if (readOnly && hideReadOnlyControls) {
    const value = row.activities?.[column.id];

    if (!value) {
      return <span className="timesheet-empty-cell"></span>;
    }

    if (row.type === CRA_DAY_TYPES.ABSENCE) {
      return (
        <div className="timesheet-readonly-special-cell">
          <span className="timesheet-readonly-reason">
            {row.commentaire || '-'}
          </span>
          <span className="timesheet-readonly-duration">
            {value}
          </span>
        </div>
      );
    }

    return (
      <span className="timesheet-readonly-duration">
        {value}
      </span>
    );
  }

  if (row.type === CRA_DAY_TYPES.ABSENCE) {
    return (
      <div className="timesheet-special-cell">
        <input
          type="text"
          value={row.commentaire || ''}
          disabled={readOnly}
          onChange={(event) =>
            updateRowCommentaire(rowIndex, event.target.value)
          }
          placeholder="Motif"
          className="timesheet-special-reason-input"
        />

        <select
          value={row.activities?.[column.id] || ''}
          disabled={readOnly}
          onChange={(event) =>
            updateActivityValue(rowIndex, column.id, event.target.value)
          }
          className="timesheet-special-duration-select"
        >
          <option value="0.5">0.5</option>
          <option value="1">1</option>
        </select>
      </div>
    );
  }

  return (
    <select
      value={row.activities?.[column.id] || ''}
      disabled={readOnly}
      onChange={(event) =>
        updateActivityValue(rowIndex, column.id, event.target.value)
      }
      className="timesheet-special-duration-select"
    >
      <option value="0.5">0.5</option>
      <option value="1">1</option>
    </select>
  );
};

  const renderActivityCell = (row, rowIndex, column) => {
  if (row.disabled) {
    return <span className="timesheet-empty-cell"></span>;
  }

  if (isSpecialActivityColumn(column)) {
    return renderAbsencesCell(row, rowIndex, column);
  }

  if (
    ![
      CRA_DAY_TYPES.TRAVAIL,
      CRA_DAY_TYPES.CONGE,
      CRA_DAY_TYPES.ABSENCE,
      CRA_DAY_TYPES.RTT,
      CRA_DAY_TYPES.ARRET_MALADIE,
    ].includes(row.type)
  ) {
    return <span className="timesheet-empty-cell"></span>;
  }

  if (isAbsenceLikeType(row.type)) {
    const absencesValue = Number(row.activities?.[ABSENCES_COLUMN_ID] || 0);

    if (absencesValue === 1) {
      return <span className="timesheet-empty-cell"></span>;
    }

    if (absencesValue !== 0.5) {
      return <span className="timesheet-empty-cell"></span>;
    }
  }

  if (readOnly && hideReadOnlyControls) {
    const value = row.activities?.[column.id];

    return (
      <span className="timesheet-readonly-duration">
        {value !== '' && value !== null && value !== undefined ? value : '-'}
      </span>
    );
  }

  const durationOptions =
    row.type === CRA_DAY_TYPES.TRAVAIL
      ? WORK_DURATION_OPTIONS
      : ['0.5'];

  return (
    <select
      value={row.activities?.[column.id] || ''}
      disabled={isActivityInputDisabled(row, column)}
      onChange={(event) =>
        updateActivityValue(rowIndex, column.id, event.target.value)
      }
      className="timesheet-duration-select"
    >
      <option value="">0</option>

      {durationOptions.map((duration) => (
        <option key={duration} value={duration}>
          {duration}
        </option>
      ))}
    </select>
  );
};

const updateQuickFill = (field, value) => {
  setQuickFill((previousQuickFill) => ({
    ...previousQuickFill,
    [field]: value,
  }));
};

const isRowInQuickFillRange = (row) => {
  if (!quickFill.startDate || !quickFill.endDate) return false;

  return row.date >= quickFill.startDate && row.date <= quickFill.endDate;
};

const cloneRows = (rowsToClone) =>
  rowsToClone.map((row) => ({
    ...row,
    activities: {
      ...(row.activities || {}),
    },
  }));

const applyQuickFill = () => {
  if (!quickFill.columnId || !quickFill.duration) return;

  setRows((previousRows) => {
    setQuickFillSnapshot(cloneRows(previousRows));

    const nextRows = previousRows.map((row) => {
      if (row.disabled || !isRowInQuickFillRange(row)) {
        return row;
      }

      let nextActivities = {
        ...(row.activities || {}),
      };

      if (quickFill.columnId === ABSENCES_COLUMN_ID) {
        activityColumns.forEach((column) => {
          if (!isSpecialActivityColumn(column)) {
            nextActivities[column.id] = '';
          }
        });

        nextActivities[ABSENCES_COLUMN_ID] = quickFill.duration;

        return {
          ...row,
          type: quickFill.absenceType,
          commentaire:
            quickFill.absenceType === CRA_DAY_TYPES.ABSENCE
              ? quickFill.absenceReason
              : '',
          activities: nextActivities,
        };
      }

      if (isAbsenceLikeType(row.type)) {
        nextActivities = {
          ...nextActivities,
          [ABSENCES_COLUMN_ID]: '',
        };

        activityColumns.forEach((column) => {
          nextActivities[column.id] = '';
        });
      }

      if (Number(quickFill.duration) === 1) {
        activityColumns.forEach((column) => {
          if (!isSpecialActivityColumn(column)) {
            nextActivities[column.id] = '';
          }
        });

        nextActivities[ABSENCES_COLUMN_ID] = '';
      }

      nextActivities[quickFill.columnId] = quickFill.duration;

      return {
        ...row,
        type: CRA_DAY_TYPES.TRAVAIL,
        commentaire: '',
        activities: nextActivities,
      };
    });

    return syncColumnsAndRows(nextRows);
  });
};

const cancelQuickFill = () => {
  if (!quickFillSnapshot) return;

  setRows(syncColumnsAndRows(cloneRows(quickFillSnapshot)));
  setQuickFillSnapshot(null);
};

  return (
    <div className="timesheet-scroll-container">
      {!readOnly && (
  <div className="timesheet-quick-fill">
    <div className="quick-fill-header">
      <h3>Remplissage rapide</h3>
      <p>Appliquer une durée sur plusieurs jours en une seule fois.</p>
    </div>

    <div className="quick-fill-grid">
      <label>
        Colonne
        <select
          value={quickFill.columnId}
          onChange={(event) =>
            updateQuickFill('columnId', event.target.value)
          }
        >
          <option value={ABSENCES_COLUMN_ID}>Absences</option>

          {activityColumns
            .filter((column) => !isSpecialActivityColumn(column))
            .map((column) => (
              <option key={column.id} value={column.id}>
                {column.nom || 'Nom activité'}
              </option>
            ))}
        </select>
      </label>

      {quickFill.columnId === ABSENCES_COLUMN_ID && (
        <>
          <label>
            Type
            <select
              value={quickFill.absenceType}
              onChange={(event) =>
                updateQuickFill('absenceType', event.target.value)
              }
            >
              <option value={CRA_DAY_TYPES.CONGE}>Congé</option>
              <option value={CRA_DAY_TYPES.ABSENCE}>Absence</option>
              <option value={CRA_DAY_TYPES.RTT}>RTT</option>
              <option value={CRA_DAY_TYPES.ARRET_MALADIE}>
                Arrêt maladie
              </option>
            </select>
          </label>

          {quickFill.absenceType === CRA_DAY_TYPES.ABSENCE && (
            <label>
              Motif
              <input
                type="text"
                value={quickFill.absenceReason}
                onChange={(event) =>
                  updateQuickFill('absenceReason', event.target.value)
                }
                placeholder="Ex : RDV médical"
              />
            </label>
          )}
        </>
      )}

      <label className="quick-fill-duration-field">
        Durée
        <select
          value={quickFill.duration}
          onChange={(event) =>
            updateQuickFill('duration', event.target.value)
          }
        >
          {(quickFill.columnId === ABSENCES_COLUMN_ID
            ? SPECIAL_DURATION_OPTIONS
            : WORK_DURATION_OPTIONS
          ).map((duration) => (
            <option key={duration} value={duration}>
              {duration}
            </option>
          ))}
        </select>
      </label>

      <label className="quick-fill-date-field">
        Du
        <input
          type="date"
          value={quickFill.startDate}
          onChange={(event) =>
            updateQuickFill('startDate', event.target.value)
          }
        />
      </label>

      <label className="quick-fill-date-field">
        Au
        <input
          type="date"
          value={quickFill.endDate}
          onChange={(event) =>
            updateQuickFill('endDate', event.target.value)
          }
        />
      </label>

      <div className="quick-fill-actions">
        <button
          type="button"
          className="quick-fill-btn"
          onClick={applyQuickFill}
        >
          Appliquer
        </button>

        <button
          type="button"
          className="quick-fill-cancel-btn"
          onClick={cancelQuickFill}
          disabled={!quickFillSnapshot}
        >
          Annuler
        </button>
      </div>
    </div>
  </div>
)}
      <div className="timesheet-scroll old-cra-timesheet" ref={tableScrollRef}>
        <table className="timesheet-table">
          <colgroup>
            <col className="timesheet-col-day" />
            <col className="timesheet-col-date" />
            <col className="timesheet-col-type" />

            {activityColumns.map((column) => (
              <col key={`col-${column.id}`} className="timesheet-col-activity" />
            ))}

            <col className="timesheet-col-total" />
          </colgroup>

          <thead>
            <tr>
              <th className="timesheet-day-col">Jour</th>
              <th className="timesheet-date-col">Date</th>
              <th className="timesheet-type-col">Type</th>

              {activityColumns.map((column) => (
                <th key={column.id} className="timesheet-activity-col">
                  {readOnly || column.locked ? (
                    <span className="timesheet-locked-header">
                      {column.nom || 'Nom activité'}
                    </span>
                  ) : (
                    <div className="timesheet-column-header">
                      <textarea
                        value={column.nom}
                        title={column.nom}
                        rows={column.nom.length > 14 ? 2 : 1}
                        onFocus={(event) => event.target.select()}
                        onChange={(event) =>
                          updateActivityColumnName(
                            column.id,
                            event.target.value,
                          )
                        }
                        placeholder="Nom activité"
                      />

                      <button
                        type="button"
                        onClick={() => removeActivityColumn(column.id)}
                        title="Supprimer cette activité"
                      >
                        ×
                      </button>
                    </div>
                  )}
                </th>
              ))}

              <th className="timesheet-total-col">Total</th>
            </tr>
          </thead>

          <tbody>
            {rows.map((row, rowIndex) => {
              const rowTotal = getDayTotal(row);

              return (
                <tr key={row.date} className={getRowClassName(row)}>
                  <td className="timesheet-day-cell">{row.jour}</td>
<td className="timesheet-date-cell">{formatDateFr(row.date)}</td>

                  <td className="timesheet-type-cell">
                    {row.disabled ? (
                      <span className="timesheet-disabled-label">
                        {getDisabledReason(row)}
                      </span>
                    ) : readOnly ? (
  <span className={`type-select timesheet-readonly-type type-${row.type.toLowerCase()}`}>
    {CRA_DAY_TYPE_LABELS[row.type] || row.type}
  </span>
) : (
                      <select
                        className={`type-select type-${row.type.toLowerCase()}`}
                        value={row.type}
                        onChange={(event) =>
                          updateRowType(rowIndex, event.target.value)
                        }
                      >
                        <option value={CRA_DAY_TYPES.TRAVAIL}>Travail</option>
                        <option value={CRA_DAY_TYPES.CONGE}>Congé</option>
                        <option value={CRA_DAY_TYPES.ABSENCE}>Absence</option>
                        <option value={CRA_DAY_TYPES.RTT}>RTT</option>
                        <option value={CRA_DAY_TYPES.ARRET_MALADIE}>
                          Arrêt maladie
                        </option>
                      </select>
                    )}
                  </td>

                  {activityColumns.map((column) => (
                    <td key={`${row.date}-${column.id}`}>
                      {renderActivityCell(row, rowIndex, column)}
                    </td>
                  ))}

                  <td className="timesheet-total-cell">
                    {row.disabled ? '-' : rowTotal.toFixed(1)}
                  </td>
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr>
              <td colSpan={3} className="timesheet-footer-label">
                TOTAL PAR ACTIVITÉ
              </td>

              {activityColumns.map((column) => (
                <td
                  key={`total-${column.id}`}
                  className="timesheet-footer-total-cell"
                >
                  {getColumnTotal(rows, column.id).toFixed(1)}
                </td>
              ))}

              <td className="timesheet-footer-grand-total">
                {rows
                  .reduce((sum, row) => sum + getDayTotal(row), 0)
                  .toFixed(1)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div
        className={`timesheet-floating-scrollbar ${
          showFloatingScrollbar ? 'visible' : ''
        }`}
        ref={floatingScrollRef}
        style={floatingScrollbarStyle}
      >
        <div ref={floatingContentRef}></div>
      </div>
    </div>
  );
}

export default CraTimesheetTable;