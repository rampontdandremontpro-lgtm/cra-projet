import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Sidebar from '../../components/layout/Sidebar';
import { useAuth } from '../../context/AuthContext';
import { getMyActiveAssignment } from '../../services/collaboratorAssignmentApi';
import { createCra, submitCra } from '../../services/craApi';

import {
  buildDateFromDay,
  calculateCraTotals,
  createEmptyCraDay,
  getDayFromDate,
  getLastDayOfMonth,
} from '../../utils/craUtils';

import '../../styles/cra.css';
import '../../styles/dashboard.css';

const months = [
  { value: 1, label: 'Janvier' },
  { value: 2, label: 'Février' },
  { value: 3, label: 'Mars' },
  { value: 4, label: 'Avril' },
  { value: 5, label: 'Mai' },
  { value: 6, label: 'Juin' },
  { value: 7, label: 'Juillet' },
  { value: 8, label: 'Août' },
  { value: 9, label: 'Septembre' },
  { value: 10, label: 'Octobre' },
  { value: 11, label: 'Novembre' },
  { value: 12, label: 'Décembre' },
];

const getDateParts = (dateString) => {
  const datePart = dateString.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);

  return {
    year,
    month,
    day,
  };
};

const getAssignmentLabel = (assignment) => {
  if (!assignment?.service) {
    return 'Aucune affectation active';
  }

  return [assignment.service.company?.nom, assignment.service.nom]
    .filter(Boolean)
    .join(' - ');
};

const getDefaultPeriodFromAssignment = (startDate) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const start = getDateParts(startDate);

  const assignmentIsInFuture =
    start.year > currentYear ||
    (start.year === currentYear && start.month > currentMonth);

  if (assignmentIsInFuture) {
    return {
      mois: start.month,
      annee: start.year,
    };
  }

  return {
    mois: currentMonth,
    annee: currentYear,
  };
};

const isPeriodBeforeAssignment = (mois, annee, assignment) => {
  if (!assignment?.startDate) return false;

  const start = getDateParts(assignment.startDate);

  if (annee < start.year) return true;
  if (annee === start.year && mois < start.month) return true;

  return false;
};

export default function CraCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const now = new Date();

  const [assignment, setAssignment] = useState(null);
  const [assignmentLoading, setAssignmentLoading] = useState(true);

  const [form, setForm] = useState({
    mois: now.getMonth() + 1,
    annee: now.getFullYear(),
    jours: [createEmptyCraDay()],
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAssignment();
  }, []);

  useEffect(() => {
    if (!error) return;

    const timer = setTimeout(() => setError(''), 5000);
    return () => clearTimeout(timer);
  }, [error]);

  const loadAssignment = async () => {
    try {
      const data = await getMyActiveAssignment();

      setAssignment(data);

      const defaultPeriod = getDefaultPeriodFromAssignment(data.startDate);

      setForm({
        mois: defaultPeriod.mois,
        annee: defaultPeriod.annee,
        jours: [createEmptyCraDay()],
      });
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          "Impossible de récupérer l'affectation active.",
      );
    } finally {
      setAssignmentLoading(false);
    }
  };

  const totals = useMemo(() => calculateCraTotals(form.jours), [form.jours]);

  const handleMonthChange = (e) => {
    const mois = Number(e.target.value);

    if (isPeriodBeforeAssignment(mois, form.annee, assignment)) {
      setError(
        'Tu ne peux pas créer un CRA avant la date de début de ton affectation.',
      );
      return;
    }

    setForm({
      ...form,
      mois,
      jours: [createEmptyCraDay()],
    });
  };

  const handleDayChange = (index, field, value) => {
    const updatedDays = [...form.jours];

    updatedDays[index] = {
      ...updatedDays[index],
      [field]: field === 'duree' ? Number(value) : value,
    };

    setForm({ ...form, jours: updatedDays });
  };

  const handleDayNumberChange = (index, value) => {
    if (!value) {
      handleDayChange(index, 'date', '');
      return;
    }

    const day = Number(value);
    const lastDay = getLastDayOfMonth(form.annee, form.mois);

    if (day < 1 || day > lastDay) return;

    handleDayChange(
      index,
      'date',
      buildDateFromDay(day, form.mois, form.annee),
    );
  };

  const addDay = () => {
    setForm({
      ...form,
      jours: [...form.jours, createEmptyCraDay()],
    });
  };

  const removeDay = (index) => {
    if (form.jours.length === 1) {
      setError('Le CRA doit contenir au moins une ligne.');
      return;
    }

    setForm({
      ...form,
      jours: form.jours.filter((_, i) => i !== index),
    });
  };

  const validateBeforeSave = () => {
    if (!assignment) {
      setError(
        "Impossible de créer un CRA : aucune affectation active n'a été trouvée.",
      );
      return false;
    }

    if (isPeriodBeforeAssignment(form.mois, form.annee, assignment)) {
      setError(
        'Tu ne peux pas créer un CRA avant la date de début de ton affectation.',
      );
      return false;
    }

    const hasAtLeastOneDate = form.jours.some((jour) => jour.date);

    if (!hasAtLeastOneDate) {
      setError('Ajoute au moins une journée dans le CRA.');
      return false;
    }

    return true;
  };

  const saveDraft = async () => {
    setError('');

    if (!validateBeforeSave()) return;

    setLoading(true);

    try {
      await createCra(form);
      navigate('/mes-cra');
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          "Impossible d'enregistrer le brouillon.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitCra = async (e) => {
    e.preventDefault();
    setError('');

    if (!validateBeforeSave()) return;

    setLoading(true);

    try {
      const createdCra = await createCra(form);
      await submitCra(createdCra.id);

      navigate('/mes-cra');
    } catch (err) {
      console.error(err);

      setError(
        err.response?.data?.message ||
          'Impossible de soumettre le CRA. Vérifie les jours déclarés.',
      );
    } finally {
      setLoading(false);
    }
  };

  const isMonthDisabled = (month) => {
    return isPeriodBeforeAssignment(month, form.annee, assignment);
  };

  return (
    <div className="dashboard-page">
      <Sidebar />

      <main className="dashboard-content">
        <div className="cra-page-title">
          <p className="breadcrumb">Mes CRA / Nouveau CRA</p>
          <h1>CRA — Nouveau</h1>
        </div>

        <form onSubmit={handleSubmitCra} className="cra-create-layout">
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
                    value={`${user?.prenom || ''} ${user?.nom || ''}`}
                    disabled
                    readOnly
                  />
                </label>

                <label>
                  Affectation
                  <input
                    type="text"
                    value={
                      assignmentLoading
                        ? 'Chargement...'
                        : getAssignmentLabel(assignment)
                    }
                    disabled
                    readOnly
                  />
                </label>

                <label>
                  Mois
                  <select
                    name="mois"
                    value={form.mois}
                    onChange={handleMonthChange}
                    disabled={assignmentLoading || !assignment}
                  >
                    {months.map((month) => (
                      <option
                        key={month.value}
                        value={month.value}
                        disabled={isMonthDisabled(month.value)}
                      >
                        {month.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  Année
                  <input
                    type="text"
                    value={form.annee}
                    disabled
                    readOnly
                  />
                </label>
              </div>
            </section>

            <section className="cra-main-card">
              <div className="cra-section-header">
                <h2>Saisie des activités</h2>

                <button
                  type="button"
                  className="add-line-btn"
                  onClick={addDay}
                  disabled={assignmentLoading || !assignment}
                >
                  + Ajouter une ligne
                </button>
              </div>

              <div className="cra-form-table">
                <div className="cra-form-head">
                  <span>Date</span>
                  <span>Type</span>
                  <span>Durée</span>
                  <span>Commentaire</span>
                  <span></span>
                </div>

                {form.jours.map((jour, index) => (
                  <div className="cra-form-row" key={index}>
                    <div className="date-composer">
                      <select
                        value={getDayFromDate(jour.date)}
                        onChange={(e) =>
                          handleDayNumberChange(index, e.target.value)
                        }
                        disabled={assignmentLoading || !assignment}
                        required
                      >
                        <option value="">jj</option>

                        {Array.from(
                          { length: getLastDayOfMonth(form.annee, form.mois) },
                          (_, i) => i + 1,
                        ).map((day) => (
                          <option key={day} value={day}>
                            {String(day).padStart(2, '0')}
                          </option>
                        ))}
                      </select>

                      <span>
                        / {String(form.mois).padStart(2, '0')} / {form.annee}
                      </span>
                    </div>

                    <select
                      className={`type-select type-${jour.type.toLowerCase()}`}
                      value={jour.type}
                      onChange={(e) =>
                        handleDayChange(index, 'type', e.target.value)
                      }
                      disabled={assignmentLoading || !assignment}
                    >
                      <option value="TRAVAIL">Travail</option>
                      <option value="CONGE">Congé</option>
                      <option value="ABSENCE">Absence</option>
                      <option value="RTT">RTT</option>
                    </select>

                    <select
                      value={jour.duree}
                      onChange={(e) =>
                        handleDayChange(index, 'duree', e.target.value)
                      }
                      disabled={assignmentLoading || !assignment}
                    >
                      <option value={1}>1 jour</option>
                      <option value={0.5}>0.5 jour</option>
                    </select>

                    <input
                      type="text"
                      placeholder="Ajouter un commentaire..."
                      value={jour.commentaire}
                      onChange={(e) =>
                        handleDayChange(index, 'commentaire', e.target.value)
                      }
                      disabled={assignmentLoading || !assignment}
                    />

                    <button
                      type="button"
                      className="delete-line-btn"
                      onClick={() => removeDay(index)}
                      disabled={assignmentLoading || !assignment}
                    >
                      🗑
                    </button>
                  </div>
                ))}
              </div>

              {error && <div className="cra-error">{error}</div>}

              <div className="cra-form-actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={saveDraft}
                  disabled={loading || assignmentLoading || !assignment}
                >
                  Enregistrer brouillon
                </button>

                <button
                  type="submit"
                  className="primary-btn"
                  disabled={loading || assignmentLoading || !assignment}
                >
                  {loading ? 'Envoi...' : 'Soumettre le CRA'}
                </button>
              </div>
            </section>
          </div>

          <aside className="cra-side-panel">
            <section className="side-card">
              <h3>Statut</h3>
              <strong className="status-draft">Brouillon</strong>
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
        </form>
      </main>
    </div>
  );
}