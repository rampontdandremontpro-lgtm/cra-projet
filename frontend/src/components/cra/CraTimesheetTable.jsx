import {
  CRA_DAY_TYPES,
  CRA_DAY_TYPE_LABELS,
  formatDateFr,
  getColumnTotal,
  getDayTotal,
} from '../../utils/craTimesheetUtils';

import '../../styles/cra/cra-timesheet.css';
import { useEffect, useRef, useState } from 'react';

function CraTimesheetTable({
  rows,
  setRows,
  activityColumns,
  setActivityColumns,
  readOnly = false,
}) {

    const tableScrollRef = useRef(null);
  const floatingScrollRef = useRef(null);
  const floatingContentRef = useRef(null);

  const [showFloatingScrollbar, setShowFloatingScrollbar] = useState(false);
  const [floatingScrollbarStyle, setFloatingScrollbarStyle] = useState({
    left: 0,
    width: 0,
  });

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
    if (activityColumns.length <= 1) return;

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
        if (index !== rowIndex) return row;

        const shouldClearActivities =
  value === CRA_DAY_TYPES.CONGE ||
  value === CRA_DAY_TYPES.ABSENCE ||
  value === CRA_DAY_TYPES.RTT;

        return {
          ...row,
          type: value,
          commentaire: value === CRA_DAY_TYPES.ABSENCE ? row.commentaire : '',
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
        if (index !== rowIndex) return row;
        if (row.disabled) return row;

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

    if (row.disabled) classes.push('timesheet-row-disabled');
    if (row.type === CRA_DAY_TYPES.CONGE) classes.push('timesheet-row-conge');
    if (row.type === CRA_DAY_TYPES.ABSENCE) classes.push('timesheet-row-absence');
    if (row.type === CRA_DAY_TYPES.RTT) classes.push('timesheet-row-rtt');

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
    if (row.isBeforeAssignment || row.isAfterAssignment) return 'Hors affectation';
    return 'Non saisissable';
  };

  const isActivityInputDisabled = (row) => {
    return (
      readOnly ||
      row.disabled ||
      row.type === CRA_DAY_TYPES.CONGE ||
      row.type === CRA_DAY_TYPES.ABSENCE ||
      row.type === CRA_DAY_TYPES.RTT
    );
  };

  return (
  <div className="timesheet-scroll-container">
    <div className="timesheet-scroll old-cra-timesheet" ref={tableScrollRef}>
      <table className="timesheet-table">
        <colgroup>
  <col className="timesheet-col-date" />
  <col className="timesheet-col-day" />
  <col className="timesheet-col-type" />

  {activityColumns.map((column) => (
    <col key={`col-${column.id}`} className="timesheet-col-activity" />
  ))}

  <col className="timesheet-col-total" />
</colgroup>
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
                  <textarea
  value={column.nom}
  title={column.nom}
  rows={column.nom.length > 14 ? 2 : 1}
  onFocus={(event) => event.target.select()}
  onChange={(event) =>
    updateActivityColumnName(column.id, event.target.value)
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
                    </select>
                  )}
                </td>

                {activityColumns.map((column, columnIndex) => (
                  <td key={`${row.date}-${column.id}`}>
                    {row.type === CRA_DAY_TYPES.ABSENCE &&
                    !row.disabled &&
                    columnIndex === 0 ? (
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
                    ) : row.type === CRA_DAY_TYPES.ABSENCE && !row.disabled ? (
                      <span className="timesheet-empty-cell"></span>
                    ) : (
                      <input
                        type="number"
                        min={row.type === CRA_DAY_TYPES.RTT ? '0.5' : '0.1'}
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
                          row.type === CRA_DAY_TYPES.ABSENCE ||
                          row.type === CRA_DAY_TYPES.RTT
                            ? ''
                            : '0'
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
    <td colSpan={3} className="timesheet-footer-label">
      TOTAL PAR ACTIVITÉ
    </td>

    {activityColumns.map((column) => (
      <td key={`total-${column.id}`} className="timesheet-footer-total-cell">
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