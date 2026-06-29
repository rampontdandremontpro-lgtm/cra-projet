import {
  CRA_DAY_TYPES,
  CRA_DAY_TYPE_LABELS,
  formatDateFr,
  getColumnTotal,
  getDayTotal,
  getSummaryTotals,
} from '../../utils/craTimesheetUtils';

import '../../styles/cra/cra-timesheet.css';

function CraTimesheetTable({
  rows,
  setRows,
  activityColumns,
  setActivityColumns,
  readOnly = false,
}) {
  const summaryTotals = getSummaryTotals(rows);

  const addActivityColumn = () => {
    const newColumn = {
      id: `local-${Date.now()}`,
      nom: `Activité ${activityColumns.length + 1}`,
      orderIndex: activityColumns.length,
    };

    setActivityColumns((previousColumns) => [...previousColumns, newColumn]);

    setRows((previousRows) =>
      previousRows.map((row) => ({
        ...row,
        activities: {
          ...(row.activities || {}),
          [newColumn.id]: '',
        },
      })),
    );
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
    if (activityColumns.length <= 1) {
      return;
    }

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
    setRows((previousRows) =>
      previousRows.map((row, index) => {
        if (index !== rowIndex) {
          return row;
        }

        const shouldClearActivities =
          value === CRA_DAY_TYPES.CONGE || value === CRA_DAY_TYPES.ABSENCE;

        return {
          ...row,
          type: value,
          commentaire:
            value === CRA_DAY_TYPES.ABSENCE ? row.commentaire : '',
          activities: shouldClearActivities
            ? Object.fromEntries(
                Object.keys(row.activities || {}).map((key) => [key, '']),
              )
            : row.activities,
        };
      }),
    );
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
        if (index !== rowIndex) {
          return row;
        }

        if (row.disabled) {
          return row;
        }

        if (
          row.type === CRA_DAY_TYPES.CONGE ||
          row.type === CRA_DAY_TYPES.ABSENCE
        ) {
          return row;
        }

        return {
          ...row,
          activities: {
            ...(row.activities || {}),
            [columnId]: value,
          },
        };
      }),
    );
  };

  const getRowClassName = (row) => {
    const classes = ['timesheet-row'];

    if (row.disabled) {
      classes.push('timesheet-row-disabled');
    }

    if (row.type === CRA_DAY_TYPES.CONGE) {
      classes.push('timesheet-row-conge');
    }

    if (row.type === CRA_DAY_TYPES.ABSENCE) {
      classes.push('timesheet-row-absence');
    }

    if (row.type === CRA_DAY_TYPES.RTT) {
      classes.push('timesheet-row-rtt');
    }

    const total = getDayTotal(row);

    if (row.type === CRA_DAY_TYPES.TRAVAIL && total > 1) {
      classes.push('timesheet-row-error');
    }

    if (row.type === CRA_DAY_TYPES.RTT && total !== 0 && total !== 0.5) {
      classes.push('timesheet-row-error');
    }

    return classes.join(' ');
  };

  const getDisabledReason = (row) => {
    if (row.isWeekend) return 'Week-end';
    if (row.isHoliday) return 'Jour férié';
    if (row.isBeforeAssignment) return 'Hors affectation';
    if (row.isAfterAssignment) return 'Hors affectation';
    return 'Non saisissable';
  };

  const isActivityInputDisabled = (row) => {
    return (
      readOnly ||
      row.disabled ||
      row.type === CRA_DAY_TYPES.CONGE ||
      row.type === CRA_DAY_TYPES.ABSENCE
    );
  };

  return (
    <div className="timesheet-wrapper">
      {!readOnly && (
        <div className="timesheet-toolbar">
          <div>
            <h3>Feuille CRA du mois</h3>
            <p>
              Saisis les durées dans les colonnes d’activité. Le total d’une
              journée de travail ne doit pas dépasser 1 jour.
            </p>
          </div>

          <button
            type="button"
            className="secondary-action-btn"
            onClick={addActivityColumn}
          >
            + Ajouter une activité
          </button>
        </div>
      )}

      <div className="timesheet-scroll">
        <table className="timesheet-table">
          <thead>
            <tr>
              <th className="timesheet-date-col">Date</th>
              <th className="timesheet-day-col">Jour</th>
              <th className="timesheet-type-col">Type</th>

              {activityColumns.map((column) => (
                <th key={column.id} className="timesheet-activity-col">
                  {readOnly ? (
                    <span>{column.nom}</span>
                  ) : (
                    <div className="timesheet-column-header">
                      <input
                        type="text"
                        value={column.nom}
                        onChange={(event) =>
                          updateActivityColumnName(
                            column.id,
                            event.target.value,
                          )
                        }
                        placeholder="Nom activité"
                      />

                      {activityColumns.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeActivityColumn(column.id)}
                          title="Supprimer cette activité"
                        >
                          ×
                        </button>
                      )}
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
                  <td>{formatDateFr(row.date)}</td>
                  <td>{row.jour}</td>

                  <td>
                    {row.disabled ? (
                      <span className="timesheet-disabled-label">
                        {getDisabledReason(row)}
                      </span>
                    ) : readOnly ? (
                      <span>{CRA_DAY_TYPE_LABELS[row.type]}</span>
                    ) : (
                      <select
                        value={row.type}
                        onChange={(event) =>
                          updateRowType(rowIndex, event.target.value)
                        }
                      >
                        <option value={CRA_DAY_TYPES.TRAVAIL}>Travail</option>
                        <option value={CRA_DAY_TYPES.CONGE}>Congé</option>
                        <option value={CRA_DAY_TYPES.ABSENCE}>Absence</option>
                        <option value={CRA_DAY_TYPES.RTT}>RTT</option>
                      </select>
                    )}
                  </td>

                  {activityColumns.map((column) => (
                    <td key={`${row.date}-${column.id}`}>
                      {row.type === CRA_DAY_TYPES.ABSENCE && !row.disabled ? (
                        <input
                          type="text"
                          value={row.commentaire || ''}
                          disabled={readOnly}
                          onChange={(event) =>
                            updateRowCommentaire(rowIndex, event.target.value)
                          }
                          placeholder="Motif absence"
                          className="timesheet-absence-input"
                        />
                      ) : (
                        <input
                          type="number"
                          min={
                            row.type === CRA_DAY_TYPES.RTT ? '0.5' : '0.1'
                          }
                          max={row.type === CRA_DAY_TYPES.RTT ? '0.5' : '1'}
                          step={row.type === CRA_DAY_TYPES.RTT ? '0.5' : '0.1'}
                          value={row.activities?.[column.id] || ''}
                          disabled={isActivityInputDisabled(row)}
                          onChange={(event) =>
                            updateActivityValue(
                              rowIndex,
                              column.id,
                              event.target.value,
                            )
                          }
                          placeholder={
                            row.disabled ||
                            row.type === CRA_DAY_TYPES.CONGE ||
                            row.type === CRA_DAY_TYPES.ABSENCE
                              ? ''
                              : '0.1'
                          }
                        />
                      )}
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
              <td colSpan="3">Total par activité</td>

              {activityColumns.map((column) => (
                <td key={`total-${column.id}`}>
                  {getColumnTotal(rows, column.id).toFixed(1)}
                </td>
              ))}

              <td>
                {(
                  summaryTotals.travail +
                  summaryTotals.conges +
                  summaryTotals.absences +
                  summaryTotals.rtt
                ).toFixed(1)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      <div className="timesheet-summary">
        <div>
          <span>Travail</span>
          <strong>{summaryTotals.travail.toFixed(1)} j</strong>
        </div>

        <div>
          <span>Congés</span>
          <strong>{summaryTotals.conges.toFixed(1)} j</strong>
        </div>

        <div>
          <span>Absences</span>
          <strong>{summaryTotals.absences.toFixed(1)} j</strong>
        </div>

        <div>
          <span>RTT</span>
          <strong>{summaryTotals.rtt.toFixed(1)} j</strong>
        </div>
      </div>
    </div>
  );
}

export default CraTimesheetTable;