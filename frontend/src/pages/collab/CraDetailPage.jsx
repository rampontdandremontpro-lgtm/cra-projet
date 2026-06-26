import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import Sidebar from '../../components/layout/Sidebar';
import {
  deleteCra,
  getCraById,
  getCraPdf,
  submitCra,
  updateCra,
} from '../../services/craApi';

import {
  buildDateFromDay,
  calculateCraTotals,
  createEmptyCraDay,
  getDayFromDate,
  getLastDayOfMonth,
  getMonthName,
  getStatusLabel,
} from '../../utils/craUtils';

import '../../styles/dashboard.css';
import '../../styles/cra.css';

export default function CraDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [cra, setCra] = useState(null);
  const [jours, setJours] = useState([]);
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

      setCra(data);
      setJours(data.jours || data.days || []);
    } catch (err) {
      console.error(err);
      setError('Impossible de charger le CRA.');
    } finally {
      setLoading(false);
    }
  };

  const editable =
    cra?.statut === 'BROUILLON' ||
    cra?.statut === 'REFUSE_CLIENT' ||
    cra?.statut === 'REFUSE_ADMIN';

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

  const handleDayNumberChange = (index, value) => {
    if (!value) {
      handleDayChange(index, 'date', '');
      return;
    }

    const day = Number(value);
    const lastDay = getLastDayOfMonth(cra.annee, cra.mois);

    if (day < 1 || day > lastDay) return;

    handleDayChange(index, 'date', buildDateFromDay(day, cra.mois, cra.annee));
  };

  const addDay = () => {
    setJours([...jours, createEmptyCraDay()]);
  };

  const removeDay = (index) => {
    if (jours.length === 1) {
      setError('Le CRA doit contenir au moins une ligne.');
      return;
    }

    setJours(jours.filter((_, i) => i !== index));
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

    const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');

    const currentDays = [...jours];

    try {
      await updateCra(id, buildPayload());

      const refreshedCra = await getCraById(id);

      const refreshedDays =
        refreshedCra.jours?.length > 0
          ? refreshedCra.jours
          : refreshedCra.days?.length > 0
            ? refreshedCra.days
            : currentDays;

      setCra(refreshedCra);
      setJours(refreshedDays);

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
    setSaving(true);
    setError('');
    setSuccess('');

    const currentDays = [...jours];

    try {
      await updateCra(id, buildPayload());

      const refreshedCra = await getCraById(id);

      const refreshedDays =
        refreshedCra.jours?.length > 0
          ? refreshedCra.jours
          : refreshedCra.days?.length > 0
            ? refreshedCra.days
            : currentDays;

      setCra(refreshedCra);
      setJours(refreshedDays);

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
      setError("Impossible d'ouvrir le PDF.");
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
                <h2>Saisie des activités</h2>

                {editable && (
                  <button
                    type="button"
                    className="add-line-btn"
                    onClick={addDay}
                  >
                    + Ajouter une ligne
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
                  <div className="cra-form-row" key={jour.id || index}>
                    <div className="date-composer">
                      <select
                        value={getDayFromDate(jour.date)}
                        disabled={!editable}
                        onChange={(e) =>
                          handleDayNumberChange(index, e.target.value)
                        }
                        required
                      >
                        <option value="">jj</option>

                        {Array.from(
                          { length: getLastDayOfMonth(cra.annee, cra.mois) },
                          (_, i) => i + 1,
                        ).map((day) => (
                          <option key={day} value={day}>
                            {String(day).padStart(2, '0')}
                          </option>
                        ))}
                      </select>

                      <span>
                        / {String(cra.mois).padStart(2, '0')} / {cra.annee}
                      </span>
                    </div>

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

                    {editable ? (
                      <button
                        type="button"
                        className="delete-line-btn"
                        onClick={() => removeDay(index)}
                      >
                        🗑
                      </button>
                    ) : (
                      <span></span>
                    )}
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
                    Voir le PDF
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

              {cra.motif_refus_client && (
                <p className="refusal-message">
                  Motif client : {cra.motif_refus_client}
                </p>
              )}

              {cra.motif_refus_admin && (
                <p className="refusal-message">
                  Motif admin : {cra.motif_refus_admin}
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