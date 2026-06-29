import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import CraTimesheetTable from '../../components/cra/CraTimesheetTable';
import { getMyActiveAssignment } from '../../services/collaboratorAssignmentApi';
import { createCra, submitCra } from '../../services/craApi';
import { getHolidaysByYear } from '../../services/holidayApi';
import {
  CRA_DAY_TYPES,
  MONTH_NAMES,
  buildCraPayloadFromTimesheet,
  createDefaultActivityColumn,
  generateMonthRows,
  getDayTotal,
} from '../../utils/craTimesheetUtils';

function CraCreatePage() {
  const navigate = useNavigate();

  const today = new Date();

  const [mois, setMois] = useState(today.getMonth() + 1);
  const [annee, setAnnee] = useState(today.getFullYear());

  const [assignment, setAssignment] = useState(null);
  const [holidayDates, setHolidayDates] = useState([]);

  const [activityColumns, setActivityColumns] = useState([
    createDefaultActivityColumn(0),
  ]);

  const [rows, setRows] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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
        ? new Date(activeAssignment.startDate)
        : null;

      if (assignmentStartDate && assignmentStartDate > today) {
        setMois(assignmentStartDate.getMonth() + 1);
        setAnnee(assignmentStartDate.getFullYear());
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
    });

    setRows(generatedRows);
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
      if (row.disabled) {
        continue;
      }

      const total = getDayTotal(row);

      if (row.type === CRA_DAY_TYPES.TRAVAIL && total > 1) {
        return `Le total du ${row.date} ne peut pas dépasser 1 jour.`;
      }

      if (row.type === CRA_DAY_TYPES.RTT && total !== 0 && total !== 0.5) {
        return `La RTT du ${row.date} doit être vide ou égale à 0.5 jour.`;
      }

      if (
        row.type === CRA_DAY_TYPES.ABSENCE &&
        !String(row.commentaire || '').trim()
      ) {
        return `Le motif d’absence est obligatoire pour le ${row.date}.`;
      }

      for (const value of Object.values(row.activities || {})) {
        if (value === '' || value === null || value === undefined) {
          continue;
        }

        const numberValue = Number(value);

        if (Number.isNaN(numberValue)) {
          return `Une durée saisie le ${row.date} est invalide.`;
        }

        if (row.type === CRA_DAY_TYPES.TRAVAIL) {
          if (numberValue < 0.1 || numberValue > 1) {
            return `Pour le ${row.date}, une activité doit être entre 0.1 et 1 jour.`;
          }
        }

        if (row.type === CRA_DAY_TYPES.RTT && numberValue !== 0.5) {
          return `Pour le ${row.date}, une RTT doit être égale à 0.5 jour.`;
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

      const validationError = validateTimesheet();

      if (validationError) {
        setError(validationError);
        return;
      }

      await createCra(buildPayload());

      setSuccess('CRA enregistré en brouillon.');
      navigate('/collaborateur/cra');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Impossible d'enregistrer le CRA.",
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
        setError(validationError);
        return;
      }

      const createdCra = await createCra(buildPayload());

      await submitCra(createdCra.id);

      setSuccess('CRA soumis au client.');
      navigate('/collaborateur/cra');
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Impossible de soumettre le CRA.",
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="cra-page">
        <p>Chargement du CRA...</p>
      </div>
    );
  }

  return (
    <div className="cra-page">
      <div className="cra-page-title">
        <div>
          <h1>Nouveau CRA</h1>
          <p>
            Crée ton compte-rendu d’activité mensuel avec les activités du mois.
          </p>
        </div>
      </div>

      {error && <div className="cra-error">{error}</div>}
      {success && <div className="cra-success">{success}</div>}

      <div className="cra-main-card">
        <div className="section-header">
          <div>
            <h2>Période du CRA</h2>
            <p>
              Les week-ends, jours fériés et jours hors affectation sont grisés
              automatiquement.
            </p>
          </div>
        </div>

        <div className="cra-form-grid">
          <div className="form-group">
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

          <div className="form-group">
            <label>Année</label>
            <input
              type="number"
              value={annee}
              min="2025"
              onChange={(event) => setAnnee(Number(event.target.value))}
            />
          </div>

          <div className="form-group">
            <label>Service</label>
            <input
              type="text"
              value={
                assignment?.service?.nom
                  ? `${assignment.service.nom}${
                      assignment.service.company?.nom
                        ? ` - ${assignment.service.company.nom}`
                        : ''
                    }`
                  : 'Affectation active'
              }
              disabled
            />
          </div>
        </div>

        <div className="cra-form-actions">
          <button
            type="button"
            className="secondary-action-btn"
            onClick={regenerateRows}
            disabled={saving}
          >
            Recharger les jours du mois
          </button>
        </div>
      </div>

      <div className="cra-main-card">
        <CraTimesheetTable
          rows={rows}
          setRows={setRows}
          activityColumns={activityColumns}
          setActivityColumns={setActivityColumns}
        />
      </div>

      <div className="cra-main-card">
        <div className="cra-form-actions">
          <button
            type="button"
            className="secondary-action-btn"
            onClick={() => navigate('/collaborateur/cra')}
            disabled={saving}
          >
            Annuler
          </button>

          <button
            type="button"
            className="secondary-action-btn"
            onClick={handleSaveDraft}
            disabled={saving}
          >
            {saving ? 'Enregistrement...' : 'Enregistrer en brouillon'}
          </button>

          <button
            type="button"
            className="primary-action-btn"
            onClick={handleSaveAndSubmit}
            disabled={saving}
          >
            {saving ? 'Soumission...' : 'Enregistrer et soumettre'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default CraCreatePage;