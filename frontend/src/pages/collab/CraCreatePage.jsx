import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import CraTimesheetTable from '../../components/cra/CraTimesheetTable';
import { useAuth } from '../../context/AuthContext';
import { getMyActiveAssignment } from '../../services/collaboratorAssignmentApi';
import { createCra, submitCra } from '../../services/craApi';
import { getHolidaysByYear } from '../../services/holidayApi';
import Sidebar from '../../components/layout/Sidebar';
import {
  CRA_DAY_TYPES,
  MONTH_NAMES,
  buildCraPayloadFromTimesheet,
  createDefaultActivityColumn,
  generateMonthRows,
  getDayTotal,
  getSummaryTotals,
  isSpecialActivityColumn 
} from '../../utils/craTimesheetUtils';

import '../../styles/dashboard.css';
import '../../styles/cra.css';

function CraCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const MAX_ACTIVITY_COLUMNS = 7;

  const today = new Date();
const todayIso = today.toISOString().split('T')[0];

const [mois, setMois] = useState(today.getMonth() + 1);
const [annee, setAnnee] = useState(today.getFullYear());

  const [assignment, setAssignment] = useState(null);
  const [holidayDates, setHolidayDates] = useState([]);

  const [activityColumns, setActivityColumns] = useState([
    createDefaultActivityColumn(0),
  ]);

  const [rows, setRows] = useState([]);
  const [toast, setToast] = useState(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const summaryTotals = useMemo(() => getSummaryTotals(rows), [rows]);

  const totalSaisi =
  summaryTotals.travail +
  summaryTotals.conges +
  summaryTotals.absences +
  summaryTotals.arretsMaladie +
  summaryTotals.rtt;

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadHolidays();
  }, [annee]);

  useEffect(() => {
  if (assignment) {
    regenerateRows();
  }
}, [mois, annee, assignment, holidayDates]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      setError('');

      const activeAssignment = await getMyActiveAssignment();
      setAssignment(activeAssignment);

      const assignmentStartDate = activeAssignment?.startDate
  ? String(activeAssignment.startDate).split('T')[0]
  : null;

if (assignmentStartDate && todayIso < assignmentStartDate) {
  const [startYear, startMonth] = assignmentStartDate.split('-');

  setMois(Number(startMonth));
  setAnnee(Number(startYear));
}
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Impossible de récupérer ton affectation active.",
      );
    } finally {
      setLoading(false);
    }
  };

  const loadHolidays = async () => {
    try {
      const holidays = await getHolidaysByYear(annee);
      const dates = holidays.map((holiday) =>
        String(holiday.date).split('T')[0],
      );

      setHolidayDates(dates);
    } catch {
      setHolidayDates([]);
    }
  };

  const regenerateRows = () => {
    const generatedRows = generateMonthRows({
      mois: Number(mois),
      annee: Number(annee),
      assignment,
      holidayDates,
      activityColumns,
      existingDays: rows,
    });

    setRows(generatedRows);
  };

  const showToast = (type, message) => {
  setToast({ type, message });

  window.setTimeout(() => {
    setToast(null);
  }, 3500);
};

  const addActivityColumn = () => {
  const manualActivityCount = activityColumns.filter(
    (column) => !isSpecialActivityColumn(column),
  ).length;

  if (manualActivityCount >= MAX_ACTIVITY_COLUMNS) {
    showToast('error', 'Tu peux ajouter au maximum 7 activités.');
    return;
  }

  const newColumn = {
    id: `local-${Date.now()}`,
    nom: '',
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

  const validateTimesheet = () => {
    const cleanColumns = activityColumns.map((column) => ({
      ...column,
      nom: column.nom.trim(),
    }));

    if (cleanColumns.some((column) => !column.nom)) {
      return 'Chaque colonne d’activité doit avoir un nom.';
    }

    for (const row of rows) {
      if (row.disabled) continue;

      const total = getDayTotal(row);

      if (row.type === CRA_DAY_TYPES.TRAVAIL && total > 1) {
        return `Le total du ${row.date} ne peut pas dépasser 1 jour.`;
      }

      if (
        row.type === CRA_DAY_TYPES.ABSENCE &&
        !String(row.commentaire || '').trim()
      ) {
        return `Le motif d’absence est obligatoire pour le ${row.date}.`;
      }

      for (const value of Object.values(row.activities || {})) {
        if (value === '' || value === null || value === undefined) continue;

        const numberValue = Number(value);

        if (Number.isNaN(numberValue)) {
          return `Une durée saisie le ${row.date} est invalide.`;
        }

        if (row.type === CRA_DAY_TYPES.TRAVAIL) {
          if (numberValue < 0.1 || numberValue > 1) {
            return `Pour le ${row.date}, une activité doit être entre 0.1 et 1 jour.`;
          }
        }
      }
    }

    return '';
  };

  const buildPayload = () => {
    return buildCraPayloadFromTimesheet({
      mois,
      annee,
      activityColumns: activityColumns.map((column, index) => ({
        ...column,
        nom: column.nom.trim(),
        orderIndex: index,
      })),
      rows,
    });
  };

  const handleSaveDraft = async () => {
  try {
    setSaving(true);
    setError('');
    setSuccess('');

    await createCra(buildPayload());

    showToast('success', 'CRA enregistré en brouillon.');

    window.setTimeout(() => {
      navigate('/mes-cra');
    }, 700);
  } catch (err) {
    showToast(
      'error',
      err.response?.data?.message || "Impossible d'enregistrer le CRA.",
    );
  } finally {
    setSaving(false);
  }
};

  const handleSaveAndSubmit = async () => {
  try {
    setSaving(true);
    setError('');
    setSuccess('');

    const validationError = validateTimesheet();

    if (validationError) {
      showToast('error', validationError);
      return;
    }

    const createdCra = await createCra(buildPayload());
    await submitCra(createdCra.id);

    showToast('success', 'CRA soumis au client.');

    window.setTimeout(() => {
      navigate('/mes-cra');
    }, 700);
  } catch (err) {
    showToast(
      'error',
      err.response?.data?.message || 'Impossible de soumettre le CRA.',
    );
  } finally {
    setSaving(false);
  }
};
  const getServiceLabel = () => {
    if (assignment?.service) {
      return [assignment.service.company?.nom, assignment.service.nom]
        .filter(Boolean)
        .join(' - ');
    }

    return 'Affectation active';
  };

  const getCollaboratorName = () => {
    return [user?.prenom, user?.nom].filter(Boolean).join(' ') || '-';
  };

    if (loading) {
    return (
      <div className="dashboard-page">
        <Sidebar />

        <main className="dashboard-content">
          <div className="cra-page">
            <p>Chargement du CRA...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <Sidebar />

      <main className="dashboard-content">
        <div className="cra-page">
          <div className="cra-page-title">
            <h1>
              Nouveau CRA — {MONTH_NAMES[mois]} {annee}
            </h1>
          </div>

          <div className="cra-create-layout">
            <div>
              <div className="cra-main-card">
                <div className="cra-section-header">
                  <h2>Informations générales</h2>
                </div>

                <div className="cra-info-grid">
                  <div>
                    <label>Collaborateur</label>
                    <input type="text" value={getCollaboratorName()} disabled />
                  </div>

                  <div>
                    <label>Service / Client</label>
                    <textarea
  value={getServiceLabel()}
  disabled
  readOnly
  rows={2}
  className="cra-readonly-textarea"
/>
                  </div>

                  <div>
                    <label>Mois</label>
                    <select
                      value={mois}
                      onChange={(event) => setMois(Number(event.target.value))}
                    >
                      {MONTH_NAMES.map((monthName, index) =>
                        index === 0 ? null : (
                          <option key={monthName} value={index}>
                            {monthName}
                          </option>
                        ),
                      )}
                    </select>
                  </div>

                  <div>
                    <label>Année</label>
                    <input
                      type="number"
                      value={annee}
                      min="2025"
                      onChange={(event) => setAnnee(Number(event.target.value))}
                    />
                  </div>
                </div>
              </div>

              <div className="cra-main-card">
                <div className="cra-section-header">
                  <div>
                    <h2>Saisie des activités</h2>
                    <p className="cra-helper-text">
                      Les week-ends et jours hors affectation sont
                      grisés automatiquement.
                    </p>
                  </div>

                  <div className="cra-header-actions">
                    <button
                      type="button"
                      className="add-line-btn"
                      onClick={addActivityColumn}
                      disabled={saving}
                    >
                      + Ajouter une activité
                    </button>
                  </div>
                </div>

                <CraTimesheetTable
                  rows={rows}
                  setRows={setRows}
                  activityColumns={activityColumns}
                  setActivityColumns={setActivityColumns}
                />

                <div className="cra-form-actions">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => navigate('/mes-cra')}
                    disabled={saving}
                  >
                    Annuler
                  </button>

                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={handleSaveDraft}
                    disabled={saving}
                  >
                    {saving ? 'Enregistrement...' : 'Enregistrer en brouillon'}
                  </button>

                  <button
                    type="button"
                    className="primary-btn"
                    onClick={handleSaveAndSubmit}
                    disabled={saving}
                  >
                    {saving ? 'Soumission...' : 'Soumettre CRA'}
                  </button>
                </div>
              </div>
            </div>

            <aside className="cra-side-panel">
              <div className="side-card">
                <h3>Statut</h3>
                <span className="status-side status-draft">Brouillon</span>
              </div>

              <div className="side-card">
                <h3>Résumé du mois</h3>

                <div className="summary-line blue">
                  <span>Jours travaillés</span>
                  <strong>{summaryTotals.travail.toFixed(1)}</strong>
                </div>

                <div className="summary-line green">
                  <span>Congés</span>
                  <strong>{summaryTotals.conges.toFixed(1)}</strong>
                </div>

                <div className="summary-line red">
  <span>Absences</span>
  <strong>{summaryTotals.absences.toFixed(1)}</strong>
</div>

<div className="summary-line red">
  <span>Arrêts maladie</span>
  <strong>{summaryTotals.arretsMaladie.toFixed(1)}</strong>
</div>

<div className="summary-line purple">
  <span>RTT</span>
  <strong>{summaryTotals.rtt.toFixed(1)}</strong>
</div>

                <div className="summary-total">
                  <span>Total saisi</span>
                  <strong>{totalSaisi.toFixed(1)} jour(s)</strong>
                </div>
              </div>

              <div className="side-card">
                <h3>Types d’activité</h3>
                <div className="legend-line blue">Travail</div>
<div className="legend-line green">Congé</div>
<div className="legend-line red">Absence</div>
<div className="legend-line red">Arrêt maladie</div>
<div className="legend-line purple">RTT</div>
              </div>
            </aside>
          </div>
        </div>
        {toast && (
  <div className={`cra-toast cra-toast-${toast.type}`}>
    {toast.message}
  </div>
)}
      </main>
    </div>
  );
}

export default CraCreatePage;