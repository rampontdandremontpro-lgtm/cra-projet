import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Sidebar from '../../components/layout/Sidebar';
import { getMyActiveAssignment } from '../../services/collaboratorAssignmentApi';
import {
  deleteCra,
  downloadCraPdf,
  getCraById,
  submitCra,
  updateCra,
} from '../../services/craApi';
import { getHolidaysByYear } from '../../services/holidayApi';

import {
  calculateCraTotals,
  getLastDayOfMonth,
  getMonthName,
  getStatusLabel,
} from '../../utils/craUtils';

import '../../styles/dashboard.css';
import '../../styles/cra.css';

const normalizeDate = (dateString) => {
  return String(dateString).split('T')[0];
};

const buildDate = (year, month, day) => {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(
    2,
    '0',
  )}`;
};

const formatDate = (dateString) => {
  const [year, month, day] = normalizeDate(dateString).split('-');
  return `${day}/${month}/${year}`;
};

const isWeekend = (year, month, day) => {
  const date = new Date(year, month - 1, day);
  const dayOfWeek = date.getDay();

  return dayOfWeek === 0 || dayOfWeek === 6;
};

const isDateInsideAssignment = (dateString, assignment) => {
  if (!assignment?.startDate) return true;

  const date = normalizeDate(dateString);
  const startDate = normalizeDate(assignment.startDate);
  const endDate = assignment.endDate ? normalizeDate(assignment.endDate) : null;

  if (date < startDate) return false;
  if (endDate && date > endDate) return false;

  return true;
};

const canEditCra = (statut) => {
  return (
    statut === 'BROUILLON' ||
    statut === 'REFUSE_CLIENT' ||
    statut === 'REFUSE_ADMIN'
  );
};

const generateWorkingDays = (
  mois,
  annee,
  assignment,
  holidayDates,
  existingDays = [],
) => {
  const holidaysSet = new Set(holidayDates.map(normalizeDate));
  const existingDaysByDate = new Map();

  existingDays.forEach((day) => {
    if (day.date) {
      existingDaysByDate.set(normalizeDate(day.date), day);
    }
  });

  const lastDay = getLastDayOfMonth(annee, mois);
  const days = [];

  for (let day = 1; day <= lastDay; day += 1) {
    const dateString = buildDate(annee, mois, day);

    if (isWeekend(annee, mois, day)) continue;
    if (holidaysSet.has(dateString)) continue;
    if (!isDateInsideAssignment(dateString, assignment)) continue;

    const existingDay = existingDaysByDate.get(dateString);

    days.push({
      id: existingDay?.id,
      date: dateString,
      type: existingDay?.type || 'TRAVAIL',
      duree: Number(existingDay?.duree || 1),
      commentaire: existingDay?.commentaire || '',
    });
  }

  return days;
};

export default function CraDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [cra, setCra] = useState(null);
  const [jours, setJours] = useState([]);
  const [assignment, setAssignment] = useState(null);
  const [holidayDates, setHolidayDates] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadCra();
  }, [id]);

  useEffect(() => {
    if (!error && !success) return;

    const timer = setTimeout(() => {
      setError('');
      setSuccess('');
    }, 5000);

    return () => clearTimeout(timer);
  }, [error, success]);

  const loadCra = async () => {
    try {
      const data = await getCraById(id);
      const currentDays = data.jours || data.days || [];

      setCra(data);

      if (canEditCra(data.statut)) {
        const activeAssignment = await getMyActiveAssignment();
        const holidays = await getHolidaysByYear(data.annee);
        const dates = holidays.map((holiday) => holiday.date);

        setAssignment(activeAssignment);
        setHolidayDates(dates);

        const generatedDays = generateWorkingDays(
          data.mois,
          data.annee,
          activeAssignment,
          dates,
          currentDays,
        );

        setJours(generatedDays);
      } else {
        setJours(currentDays);
      }
    } catch (err) {
      console.error(err);
      setError('Impossible de charger le CRA.');
    } finally {
      setLoading(false);
    }
  };

  const editable = canEditCra(cra?.statut);

  const totals = useMemo(() => calculateCraTotals(jours), [jours]);

  const getServiceLabel = () => {
    if (cra?.client?.nom) {
      return cra.client.nom;
    }

    if (cra?.service) {
      return [cra.service.company?.nom, cra.service.nom]
        .filter(Boolean)
        .join(' - ');
    }

    return '-';
  };

  const handleDayChange = (index, field, value) => {
    const updatedDays = [...jours];

    updatedDays[index] = {
      ...updatedDays[index],
      [field]: field === 'duree' ? Number(value) : value,
    };

    setJours(updatedDays);
  };

  const reloadWorkingDays = async () => {
    if (!cra) return;

    try {
      let currentAssignment = assignment;
      let currentHolidayDates = holidayDates;

      if (!currentAssignment) {
        currentAssignment = await getMyActiveAssignment();
        setAssignment(currentAssignment);
      }

      if (currentHolidayDates.length === 0) {
        const holidays = await getHolidaysByYear(cra.annee);
        currentHolidayDates = holidays.map((holiday) => holiday.date);
        setHolidayDates(currentHolidayDates);
      }

      const generatedDays = generateWorkingDays(
        cra.mois,
        cra.annee,
        currentAssignment,
        currentHolidayDates,
        jours,
      );

      setJours(generatedDays);
      setSuccess('Jours ouvrés rechargés avec succès.');
    } catch (err) {
      console.error(err);
      setError('Impossible de recharger les jours ouvrés.');
    }
  };

  const buildPayload = () => ({
    mois: cra.mois,
    annee: cra.annee,
    jours: jours.map((jour) => ({
      date: jour.date,
      type: jour.type,
      duree: Number(jour.duree),
      commentaire: jour.commentaire || '',
    })),
  });

  const validateBeforeSave = () => {
    if (jours.length === 0) {
      setError('Le CRA doit contenir au moins une journée.');
      return false;
    }

    return true;
  };

  const handleSave = async () => {
    if (!validateBeforeSave()) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await updateCra(id, buildPayload());

      const refreshedCra = await getCraById(id);
      const refreshedDays = refreshedCra.jours || refreshedCra.days || jours;

      const generatedDays = generateWorkingDays(
        refreshedCra.mois,
        refreshedCra.annee,
        assignment,
        holidayDates,
        refreshedDays,
      );

      setCra(refreshedCra);
      setJours(generatedDays);

      setSuccess('CRA enregistré avec succès.');
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message || "Impossible d'enregistrer le CRA.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!validateBeforeSave()) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      await updateCra(id, buildPayload());
      await submitCra(id);

      navigate('/mes-cra');
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          'Impossible de soumettre le CRA. Vérifie les jours déclarés.',
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Voulez-vous vraiment supprimer ce brouillon ?')) return;

    try {
      await deleteCra(id);
      navigate('/mes-cra');
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message || 'Impossible de supprimer le CRA.',
      );
    }
  };

  const handlePdf = async () => {
    try {
      await downloadCraPdf(cra);
    } catch (err) {
      console.error(err);
      setError("Impossible de télécharger le PDF.");
    }
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <Sidebar />

        <main className="dashboard-content">
          <p className="empty-text">Chargement du CRA...</p>
        </main>
      </div>
    );
  }

  if (!cra) {
    return (
      <div className="dashboard-page">
        <Sidebar />

        <main className="dashboard-content">
          <p className="empty-text">CRA introuvable.</p>
        </main>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <Sidebar />

      <main className="dashboard-content">
        <div className="cra-page-title">
          <p className="breadcrumb">Mes CRA / Détail CRA</p>

          <h1>
            CRA — {getMonthName(cra.mois)} {cra.annee}
          </h1>
        </div>

        <div className="cra-create-layout">
          <div>
            <section className="cra-main-card">
              <div className="cra-section-header">
                <h2>Informations générales</h2>
              </div>

              <div className="cra-info-grid">
                <label>
                  Collaborateur
                  <input
                    type="text"
                    value={`${cra.collaborateur?.prenom || ''} ${
                      cra.collaborateur?.nom || ''
                    }`}
                    disabled
                    readOnly
                  />
                </label>

                <label>
                  Service / Client
                  <input
                    type="text"
                    value={getServiceLabel()}
                    disabled
                    readOnly
                  />
                </label>

                <label>
                  Mois
                  <input
                    type="text"
                    value={getMonthName(cra.mois)}
                    disabled
                    readOnly
                  />
                </label>

                <label>
                  Année
                  <input type="text" value={cra.annee} disabled readOnly />
                </label>
              </div>
            </section>

            <section className="cra-main-card">
              <div className="cra-section-header">
                <div>
                  <h2>Saisie des activités</h2>

                  {editable && (
                    <p className="cra-helper-text">
                      Les jours ouvrés du mois sont générés automatiquement.
                    </p>
                  )}
                </div>

                {editable && (
                  <button
                    type="button"
                    className="add-line-btn"
                    onClick={reloadWorkingDays}
                  >
                    Recharger les jours ouvrés
                  </button>
                )}
              </div>

              <div className="cra-form-table">
                <div className="cra-form-head">
                  <span>Date</span>
                  <span>Type</span>
                  <span>Durée</span>
                  <span>Commentaire</span>
                  <span></span>
                </div>

                {jours.map((jour, index) => (
                  <div className="cra-form-row" key={jour.date}>
                    <strong>{formatDate(jour.date)}</strong>

                    <select
                      className={`type-select type-${jour.type.toLowerCase()}`}
                      value={jour.type}
                      disabled={!editable}
                      onChange={(e) =>
                        handleDayChange(index, 'type', e.target.value)
                      }
                    >
                      <option value="TRAVAIL">Travail</option>
                      <option value="CONGE">Congé</option>
                      <option value="ABSENCE">Absence</option>
                      <option value="RTT">RTT</option>
                    </select>

                    <select
                      value={jour.duree}
                      disabled={!editable}
                      onChange={(e) =>
                        handleDayChange(index, 'duree', e.target.value)
                      }
                    >
                      <option value={1}>1 jour</option>
                      <option value={0.5}>0.5 jour</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Ajouter un commentaire..."
                      value={jour.commentaire || ''}
                      disabled={!editable}
                      onChange={(e) =>
                        handleDayChange(index, 'commentaire', e.target.value)
                      }
                    />

                    <span></span>
                  </div>
                ))}
              </div>

              {error && <div className="cra-error">{error}</div>}
              {success && <div className="cra-success">{success}</div>}

              <div className="cra-form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => navigate('/mes-cra')}
                >
                  Retour
                </button>

                {!editable && (
                  <button
                    type="button"
                    className="primary-btn"
                    onClick={handlePdf}
                  >
                    Télécharger le PDF
                  </button>
                )}

                {editable && cra.statut === 'BROUILLON' && (
                  <button
                    type="button"
                    className="delete-draft-btn"
                    onClick={handleDelete}
                  >
                    Supprimer
                  </button>
                )}

                {editable && (
                  <>
                    <button
                      type="button"
                      className="secondary-btn"
                      onClick={handleSave}
                      disabled={saving}
                    >
                      {saving ? 'Enregistrement...' : 'Enregistrer'}
                    </button>

                    <button
                      type="button"
                      className="primary-btn"
                      onClick={handleSubmit}
                      disabled={saving}
                    >
                      {saving ? 'Soumission...' : 'Soumettre le CRA'}
                    </button>
                  </>
                )}
              </div>
            </section>
          </div>

          <aside className="cra-side-panel">
            <section className="side-card">
              <h3>Statut</h3>

              <strong
                className={`status-side status-${cra.statut.toLowerCase()}`}
              >
                {getStatusLabel(cra.statut)}
              </strong>

              {(cra.motif_refus_client || cra.motifRefusClient) && (
                <p className="refusal-message">
                  Motif client : {cra.motif_refus_client || cra.motifRefusClient}
                </p>
              )}

              {(cra.motif_refus_admin || cra.motifRefusAdmin) && (
                <p className="refusal-message">
                  Motif admin : {cra.motif_refus_admin || cra.motifRefusAdmin}
                </p>
              )}
            </section>

            <section className="side-card">
              <h3>Résumé du mois</h3>

              <div className="summary-line blue">
                <span>Jours travaillés</span>
                <strong>{totals.travail}</strong>
              </div>

              <div className="summary-line green">
                <span>Congés</span>
                <strong>{totals.conge}</strong>
              </div>

              <div className="summary-line red">
                <span>Absences</span>
                <strong>{totals.absence}</strong>
              </div>

              <div className="summary-line purple">
                <span>RTT</span>
                <strong>{totals.rtt}</strong>
              </div>

              <div className="summary-total">
                Total saisi <strong>{totals.total} jour(s)</strong>
              </div>
            </section>

            <section className="side-card">
              <h3>Types d’activité</h3>

              <div className="legend-line blue">Travail</div>
              <div className="legend-line green">Congé</div>
              <div className="legend-line red">Absence</div>
              <div className="legend-line purple">RTT</div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}