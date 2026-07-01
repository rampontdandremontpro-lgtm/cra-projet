import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Sidebar from '../../components/layout/Sidebar';
import CraTimesheetTable from '../../components/cra/CraTimesheetTable';

import {
  downloadCraPdf,
  getCraById,
  refuseCraByClient,
  validateCraByClient,
} from '../../services/craApi';
import { getHolidaysByYear } from '../../services/holidayApi';

import {
  MONTH_NAMES,
  generateRowsFromExistingCra,
  getSummaryTotals,
} from '../../utils/craTimesheetUtils';

import '../../styles/dashboard.css';
import '../../styles/cra.css';

export default function ClientCraDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [cra, setCra] = useState(null);
  const [activityColumns, setActivityColumns] = useState([]);
  const [rows, setRows] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [observation, setObservation] = useState('');
  const [toast, setToast] = useState(null);

  const canValidate = cra?.statut === 'SOUMIS_CLIENT';

  const summaryTotals = useMemo(() => getSummaryTotals(rows), [rows]);

  const totalSaisi =
  summaryTotals.travail +
  summaryTotals.conges +
  summaryTotals.absences +
  summaryTotals.arretsMaladie +
  summaryTotals.rtt;

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

      const data = await getCraById(id);

      let holidayDates = [];

      try {
        const holidays = await getHolidaysByYear(Number(data.annee));
        holidayDates = holidays.map((holiday) =>
          String(holiday.date).split('T')[0],
        );
      } catch {
        holidayDates = [];
      }

      const normalized = generateRowsFromExistingCra({
        cra: data,
        assignment: null,
        holidayDates,
      });

      setCra(data);
setActivityColumns(normalized.activityColumns);
setRows(normalized.rows);
setObservation(
  data.motifRefusClient ||
    data.motif_refus_client ||
    data.motifRefusAdmin ||
    data.motif_refus_admin ||
    data.motifRefus ||
    data.motif_refus ||
    '',
);
    } catch (err) {
      showToast(
        'error',
        err.response?.data?.message || 'Impossible de charger le CRA.',
      );
    } finally {
      setLoading(false);
    }
  };

  const getMonthName = (monthNumber) => {
    return MONTH_NAMES[Number(monthNumber)] || '-';
  };

  const getStatusLabel = (statut) => {
    const labels = {
      SOUMIS_CLIENT: 'À valider',
      VALIDE_CLIENT: 'Validé client',
      REFUSE_CLIENT: 'Refusé client',
      VALIDE_ADMIN: 'Validé admin',
      REFUSE_ADMIN: 'Refusé admin',
      ARCHIVE: 'Archivé',
    };

    return labels[statut] || statut || '-';
  };

  const getStatusClassName = () => {
  if (cra?.statut === 'SOUMIS_CLIENT') return 'status-soumis_client';
  if (cra?.statut === 'VALIDE_CLIENT') return 'status-valide_client';
  if (cra?.statut === 'VALIDE_ADMIN') return 'status-valide_admin';
  if (cra?.statut === 'REFUSE_CLIENT') return 'status-refuse_client';
  if (cra?.statut === 'REFUSE_ADMIN') return 'status-refuse_admin';
  if (cra?.statut === 'ARCHIVE') return 'status-valide_admin';

  return 'status-brouillon';
};

  const getCollaboratorName = () => {
    return [cra?.collaborateur?.prenom, cra?.collaborateur?.nom]
      .filter(Boolean)
      .join(' ');
  };

  const getServiceLabel = () => {
    if (!cra?.service) return '-';

    return [cra.service.company?.nom, cra.service.nom]
      .filter(Boolean)
      .join(' - ');
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

  const handleValidate = async () => {
    const confirmValidation = window.confirm(
      `Valider le CRA de ${getCollaboratorName()} pour ${getMonthName(
        cra.mois,
      )} ${cra.annee} ?`,
    );

    if (!confirmValidation) return;

    try {
      setSaving(true);

      await validateCraByClient(cra.id);

      showToast('success', 'CRA validé avec succès.');

      window.setTimeout(() => {
        navigate('/client/historique');
      }, 700);
    } catch (err) {
      showToast(
        'error',
        err.response?.data?.message || 'Impossible de valider ce CRA.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleRefuse = async () => {
    if (!observation.trim()) {
      showToast('error', 'Le motif de refus est obligatoire.');
      return;
    }

    const confirmRefusal = window.confirm(
      `Refuser le CRA de ${getCollaboratorName()} pour ${getMonthName(
        cra.mois,
      )} ${cra.annee} ?`,
    );

    if (!confirmRefusal) return;

    try {
      setSaving(true);

      await refuseCraByClient(cra.id, observation.trim());

      showToast('success', 'CRA refusé avec succès.');

      window.setTimeout(() => {
        navigate('/client/historique');
      }, 700);
    } catch (err) {
      showToast(
        'error',
        err.response?.data?.message || 'Impossible de refuser ce CRA.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (canValidate) {
      navigate('/client/cra-a-valider');
      return;
    }

    navigate('/client/historique');
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <Sidebar />

        <main className="dashboard-content client-cra-detail">
          <p className="empty-text">Chargement du CRA...</p>
        </main>
      </div>
    );
  }

  if (!cra) {
    return (
      <div className="dashboard-page">
        <Sidebar />

        <main className="dashboard-content client-cra-detail">
          <p className="empty-text">CRA introuvable.</p>

          {toast && (
            <div className={`cra-toast cra-toast-${toast.type}`}>
              {toast.message}
            </div>
          )}
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <Sidebar />

      <main className="dashboard-content client-cra-detail">
        <div className="cra-page">
          <div className="cra-page-title">
            <p className="breadcrumb">Espace client / Détail CRA</p>

            <h1>
              CRA — {getMonthName(cra.mois)} {cra.annee}
            </h1>
          </div>

          <div className="cra-create-layout">
            <div>
              <section className="cra-main-card">
                <div className="cra-section-header">
                  <h2>Validation du CRA</h2>
                </div>

                <div className="cra-info-grid">
                  <div>
                    <label>Collaborateur</label>
                    <input
                      type="text"
                      value={getCollaboratorName()}
                      disabled
                      readOnly
                    />
                  </div>

                  <div>
                    <label>Entreprise</label>
                    <input
                      type="text"
                      value={cra.service?.company?.nom || '-'}
                      disabled
                      readOnly
                    />
                  </div>

                  <div>
                    <label>Service</label>
                    <input
                      type="text"
                      value={getServiceLabel()}
                      disabled
                      readOnly
                    />
                  </div>

                  <div>
                    <label>Période</label>
                    <input
                      type="text"
                      value={`${getMonthName(cra.mois)} ${cra.annee}`}
                      disabled
                      readOnly
                    />
                  </div>
                </div>
              </section>

              <section className="cra-main-card">
                <div className="cra-section-header">
                  <div>
                    <h2>Tableau des activités déclarées</h2>
                    <p className="cra-helper-text">
                      Lecture du CRA soumis par le collaborateur.
                    </p>
                  </div>

                  <button
                    type="button"
                    className="add-line-btn"
                    onClick={handleDownloadPdf}
                    disabled={saving}
                  >
                    Télécharger PDF
                  </button>
                </div>

                <CraTimesheetTable
  rows={rows}
  setRows={setRows}
  activityColumns={activityColumns}
  setActivityColumns={setActivityColumns}
  readOnly
  hideReadOnlyControls
/>
              </section>

              <section className="cra-main-card client-observation-card">
                <div className="cra-section-header">
  <h2>
    {cra.statut === 'REFUSE_CLIENT'
      ? 'Motif du refus client'
      : cra.statut === 'REFUSE_ADMIN'
        ? 'Motif du refus admin'
        : 'Observations du client'}
  </h2>
</div>
                <div style={{ padding: '24px' }}>
                  <textarea
                    value={observation}
                    onChange={(event) => setObservation(event.target.value)}
                    disabled={!canValidate || saving}
                    placeholder={
  canValidate
    ? 'Ajoutez une observation ou un motif de refus...'
    : observation
      ? ''
      : 'Le CRA a déjà été traité.'
}
                    rows={5}
                    style={{
                      width: '100%',
                      resize: 'vertical',
                      border: '1px solid #cbd5e1',
                      borderRadius: '12px',
                      padding: '14px',
                      fontFamily: 'inherit',
                    }}
                  />
                </div>

                <div className="cra-form-actions">
                  <button
                    type="button"
                    className="secondary-btn"
                    onClick={handleBack}
                    disabled={saving}
                  >
                    Retour
                  </button>

                  {canValidate && (
                    <>
                      <button
                        type="button"
                        className="primary-btn"
                        onClick={handleValidate}
                        disabled={saving}
                      >
                        {saving ? 'Validation...' : 'Valider le CRA'}
                      </button>

                      <button
                        type="button"
                        className="delete-draft-btn"
                        onClick={handleRefuse}
                        disabled={saving}
                      >
                        {saving ? 'Refus...' : 'Refuser le CRA'}
                      </button>
                    </>
                  )}
                </div>
              </section>
            </div>

            <aside className="cra-side-panel">
              <div className="side-card">
                <h3>Statut</h3>
                <span className={`status-side ${getStatusClassName()}`}>
                  {getStatusLabel(cra.statut)}
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