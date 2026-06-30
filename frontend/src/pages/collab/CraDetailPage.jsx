import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Sidebar from '../../components/layout/Sidebar';
import CraTimesheetTable from '../../components/cra/CraTimesheetTable';

import { getMyActiveAssignment } from '../../services/collaboratorAssignmentApi';
import {
  downloadCraPdf,
  getCraById,
  submitCra,
  updateCra,
  deleteCra
} from '../../services/craApi';
import { getHolidaysByYear } from '../../services/holidayApi';

import {
  ABSENCES_COLUMN_ID,
  CRA_DAY_TYPES,
  MONTH_NAMES,
  buildCraPayloadFromTimesheet,
  generateRowsFromExistingCra,
  getDayTotal,
  getSummaryTotals,
  isAbsenceLikeType,
  isSpecialActivityColumn,
} from '../../utils/craTimesheetUtils';

import '../../styles/dashboard.css';
import '../../styles/cra.css';

function CraDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const MAX_ACTIVITY_COLUMNS = 7;

  const [cra, setCra] = useState(null);
  const [mois, setMois] = useState('');
  const [annee, setAnnee] = useState('');

  const [assignment, setAssignment] = useState(null);
  const [holidayDates, setHolidayDates] = useState([]);

  const [activityColumns, setActivityColumns] = useState([]);
  const [rows, setRows] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [toast, setToast] = useState(null);

  const summaryTotals = useMemo(() => getSummaryTotals(rows), [rows]);

  const totalSaisi =
  summaryTotals.travail +
  summaryTotals.conges +
  summaryTotals.absences +
  summaryTotals.arretsMaladie +
  summaryTotals.rtt;

  const isEditable =
    cra?.statut === 'BROUILLON' ||
    cra?.statut === 'REFUSE_CLIENT' ||
    cra?.statut === 'REFUSE_ADMIN';

  useEffect(() => {
    loadCra();
  }, [id]);

  const showToast = (type, message) => {
    setToast({ type, message });

    window.setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  const loadCra = async () => {
    try {
      setLoading(true);

      const craData = await getCraById(id);
      const activeAssignment = await getMyActiveAssignment();

      setCra(craData);
      setMois(Number(craData.mois));
      setAnnee(Number(craData.annee));
      setAssignment(activeAssignment);

      const holidays = await getHolidaysByYear(Number(craData.annee));
      const dates = holidays.map((holiday) =>
        String(holiday.date).split('T')[0],
      );

      setHolidayDates(dates);

      const normalized = generateRowsFromExistingCra({
        cra: craData,
        assignment: activeAssignment,
        holidayDates: dates,
      });

      setActivityColumns(normalized.activityColumns);
      setRows(normalized.rows);
    } catch (err) {
      showToast(
        'error',
        err.response?.data?.message || 'Impossible de charger le CRA.',
      );
    } finally {
      setLoading(false);
    }
  };

  const regenerateRows = async (nextMois = mois, nextAnnee = annee) => {
    if (!cra || !assignment) return;

    try {
      const holidays = await getHolidaysByYear(Number(nextAnnee));
      const dates = holidays.map((holiday) =>
        String(holiday.date).split('T')[0],
      );

      setHolidayDates(dates);

      const normalized = generateRowsFromExistingCra({
        cra: {
          ...cra,
          mois: Number(nextMois),
          annee: Number(nextAnnee),
          days: rows,
          activityColumns,
        },
        assignment,
        holidayDates: dates,
      });

      setRows(normalized.rows);
    } catch {
      const normalized = generateRowsFromExistingCra({
        cra: {
          ...cra,
          mois: Number(nextMois),
          annee: Number(nextAnnee),
          days: rows,
          activityColumns,
        },
        assignment,
        holidayDates,
      });

      setRows(normalized.rows);
    }
  };

  const handleChangeMois = (value) => {
    const nextMois = Number(value);
    setMois(nextMois);
    regenerateRows(nextMois, annee);
  };

  const handleChangeAnnee = (value) => {
    const nextAnnee = Number(value);
    setAnnee(nextAnnee);
    regenerateRows(mois, nextAnnee);
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
  const manualColumns = activityColumns.filter(
    (column) => !isSpecialActivityColumn(column),
  );

  const emptyManualColumn = manualColumns.some(
    (column) => !String(column.nom || '').trim(),
  );

  if (emptyManualColumn) {
    return 'Chaque colonne d’activité doit avoir un nom avant la soumission.';
  }

  const isHalfOrFullDuration = (value) => {
    const numberValue = Number(value);
    return numberValue === 0.5 || numberValue === 1;
  };

  for (const row of rows) {
    if (row.disabled) continue;

    const total = getDayTotal(row);

    if (total <= 0) {
      return `Une durée est obligatoire pour le ${row.date}.`;
    }

    if (total > 1) {
      return `Le total du ${row.date} ne peut pas dépasser 1 jour.`;
    }

    const absencesValue = Number(row.activities?.[ABSENCES_COLUMN_ID] || 0);

    if (isAbsenceLikeType(row.type)) {
      if (!isHalfOrFullDuration(absencesValue)) {
        return `Pour le ${row.date}, la colonne Absences doit être à 0.5 ou 1.`;
      }

      if (
        row.type === CRA_DAY_TYPES.ABSENCE &&
        !String(row.commentaire || '').trim()
      ) {
        return `Le motif d’absence est obligatoire pour le ${row.date}.`;
      }
    }

    for (const column of activityColumns) {
      const value = row.activities?.[column.id];

      if (value === '' || value === null || value === undefined) {
        continue;
      }

      const numberValue = Number(value);

      if (Number.isNaN(numberValue)) {
        return `Une durée saisie le ${row.date} est invalide.`;
      }

      if (isSpecialActivityColumn(column)) {
        if (!isHalfOrFullDuration(numberValue)) {
          return `Pour le ${row.date}, la durée Absences doit être à 0.5 ou 1.`;
        }

        continue;
      }

      if (row.type === CRA_DAY_TYPES.TRAVAIL) {
        if (numberValue < 0.1 || numberValue > 1) {
          return `Pour le ${row.date}, une activité doit être entre 0.1 et 1 jour.`;
        }
      }

      if (isAbsenceLikeType(row.type)) {
        if (!isHalfOrFullDuration(numberValue)) {
          return `Pour le ${row.date}, une activité associée à une absence doit être à 0.5 ou 1.`;
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

      const payload = buildPayload();
      await updateCra(cra.id, payload);

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

      const validationError = validateTimesheet();

      if (validationError) {
        showToast('error', validationError);
        return;
      }

      const payload = buildPayload();
      const updatedCra = await updateCra(cra.id, payload);

      await submitCra(updatedCra.id);

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

  const handleDownloadPdf = async () => {
    try {
      await downloadCraPdf(cra);
    } catch (err) {
      showToast(
        'error',
        err.response?.data?.message || 'Impossible de télécharger le PDF.',
      );
    }
  };

  const handleDeleteCra = async () => {
  const confirmDelete = window.confirm(
    'Voulez-vous vraiment supprimer ce CRA ? Cette action est définitive.',
  );

  if (!confirmDelete) return;

  try {
    setSaving(true);

    await deleteCra(cra.id);

    showToast('success', 'CRA supprimé avec succès.');

    window.setTimeout(() => {
      navigate('/mes-cra');
    }, 700);
  } catch (err) {
    showToast(
      'error',
      err.response?.data?.message || 'Impossible de supprimer ce CRA.',
    );
  } finally {
    setSaving(false);
  }
};

  const getStatusLabel = () => {
    const labels = {
      BROUILLON: 'Brouillon',
      SOUMIS_CLIENT: 'Soumis au client',
      REFUSE_CLIENT: 'Refusé par le client',
      VALIDE_CLIENT: 'Validé par le client',
      REFUSE_ADMIN: 'Refusé par l’admin',
      VALIDE_ADMIN: 'Validé par l’admin',
      ARCHIVE: 'Archivé',
    };

    return labels[cra?.statut] || cra?.statut || '-';
  };

  const getStatusClassName = () => {
    if (cra?.statut === 'BROUILLON') return 'status-draft';
    if (cra?.statut?.includes('REFUSE')) return 'status-refused';
    if (cra?.statut?.includes('VALIDE')) return 'status-approved';
    if (cra?.statut === 'SOUMIS_CLIENT') return 'status-pending';

    return 'status-draft';
  };

  const getServiceLabel = () => {
    if (cra?.service) {
      return [cra.service.company?.nom, cra.service.nom]
        .filter(Boolean)
        .join(' - ');
    }

    return '-';
  };

  const getCollaboratorName = () => {
    return [cra?.collaborateur?.prenom, cra?.collaborateur?.nom]
      .filter(Boolean)
      .join(' ');
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

  if (!cra) {
    return (
      <div className="dashboard-page">
        <Sidebar />

        <main className="dashboard-content">
          <div className="cra-page">
            <p>CRA introuvable.</p>
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
              CRA — {MONTH_NAMES[mois]} {annee}
            </h1>
          </div>

          {cra.motifRefusClient && (
            <div className="refusal-message">
              <strong>Motif de refus client :</strong> {cra.motifRefusClient}
            </div>
          )}

          {cra.motifRefusAdmin && (
            <div className="refusal-message">
              <strong>Motif de refus admin :</strong> {cra.motifRefusAdmin}
            </div>
          )}

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
                      disabled={!isEditable || saving}
                      onChange={(event) => handleChangeMois(event.target.value)}
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
                      disabled={!isEditable || saving}
                      onChange={(event) => handleChangeAnnee(event.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="cra-main-card">
                <div className="cra-section-header">
                  <div>
                    <h2>
                      {isEditable
                        ? 'Modifier les activités'
                        : 'Activités du mois'}
                    </h2>
                    <p className="cra-helper-text">
                      Les week-ends et jours hors affectation sont
                      grisés automatiquement.
                    </p>
                  </div>

                  {isEditable && (
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
                  )}
                </div>

                <CraTimesheetTable
                  rows={rows}
                  setRows={setRows}
                  activityColumns={activityColumns}
                  setActivityColumns={setActivityColumns}
                  readOnly={!isEditable}
                />

                <div className="cra-form-actions">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={() => navigate('/mes-cra')}
                    disabled={saving}
                  >
                    Retour
                  </button>

                  {!isEditable && (
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={handleDownloadPdf}
                      disabled={saving}
                    >
                      Télécharger PDF
                    </button>
                  )}

                  {isEditable && (
                    <>
                    <button
                    type="button"
                    className="delete-draft-btn"
                    onClick={handleDeleteCra}
                    disabled={saving}
                    >
                      Supprimer
                      
                      </button>
                      <button
                        type="button"
                        className="secondary-btn"
                        onClick={handleSaveDraft}
                        disabled={saving}
                      >
                        {saving
                          ? 'Enregistrement...'
                          : 'Enregistrer en brouillon'}
                      </button>

                      <button
                        type="button"
                        className="primary-btn"
                        onClick={handleSaveAndSubmit}
                        disabled={saving}
                      >
                        {saving ? 'Soumission...' : 'Enregistrer et soumettre'}
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            <aside className="cra-side-panel">
              <div className="side-card">
                <h3>Statut</h3>
                <span className={`status-side ${getStatusClassName()}`}>
                  {getStatusLabel()}
                </span>
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

export default CraDetailPage;