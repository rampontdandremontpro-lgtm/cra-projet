import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import Sidebar from '../../components/layout/Sidebar';
import { checkCra, createCra, submitCra } from '../../services/craApi';
import { getAssignedClients } from '../../services/usersApi';

import '../../styles/cra.css';
import '../../styles/dashboard.css';

export default function CraCreatePage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [clients, setClients] = useState([]);
  const [form, setForm] = useState({
    collaborateur_id: user?.id || null,
    client_id: '',
    mois: currentMonth,
    annee: currentYear,
    jours: [{ date: '', type: 'TRAVAIL', duree: 1, commentaire: '' }],
  });

  const [loading, setLoading] = useState(false);
  const [clientsLoading, setClientsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    const loadClients = async () => {
      if (!user?.id) return;

      try {
        setClientsLoading(true);

        const data = await getAssignedClients(user.id);
        setClients(data);

        setForm((prev) => ({
          ...prev,
          collaborateur_id: user.id,
          client_id: data.length > 0 ? data[0].id : '',
        }));
      } catch (err) {
        console.error(err);
        setError('Impossible de récupérer les clients assignés.');
      } finally {
        setClientsLoading(false);
      }
    };

    loadClients();
  }, [user]);

  const totals = useMemo(() => {
    return form.jours.reduce(
      (acc, jour) => {
        const duree = Number(jour.duree || 0);

        acc.total += duree;
        if (jour.type === 'TRAVAIL') acc.travail += duree;
        if (jour.type === 'CONGE') acc.conge += duree;
        if (jour.type === 'ABSENCE') acc.absence += duree;
        if (jour.type === 'RTT') acc.rtt += duree;

        return acc;
      },
      { total: 0, travail: 0, conge: 0, absence: 0, rtt: 0 }
    );
  }, [form.jours]);

  const handleMonthChange = (e) => {
    const mois = Number(e.target.value);

    setForm({
      ...form,
      mois,
      annee: currentYear,
      jours: [{ date: '', type: 'TRAVAIL', duree: 1, commentaire: '' }],
    });
  };

  const handleClientChange = (e) => {
    setForm({
      ...form,
      client_id: Number(e.target.value),
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

  const getLastDayOfMonth = () => {
    return new Date(form.annee, form.mois, 0).getDate();
  };

  const getDayFromDate = (date) => {
    if (!date) return '';
    return Number(date.split('-')[2]);
  };

  const handleDayNumberChange = (index, value) => {
    if (!value) {
      handleDayChange(index, 'date', '');
      return;
    }

    const day = Number(value);

    if (day < 1 || day > getLastDayOfMonth()) return;

    const month = String(form.mois).padStart(2, '0');
    const formattedDay = String(day).padStart(2, '0');

    handleDayChange(index, 'date', `${form.annee}-${month}-${formattedDay}`);
  };

  const addDay = () => {
    setForm({
      ...form,
      jours: [
        ...form.jours,
        { date: '', type: 'TRAVAIL', duree: 1, commentaire: '' },
      ],
    });
  };

  const removeDay = (index) => {
    setForm({
      ...form,
      jours: form.jours.filter((_, i) => i !== index),
    });
  };

  const validateBeforeSave = () => {
    if (!form.client_id) {
      setError("Aucun client n'est assigné à ce collaborateur.");
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
          "Impossible d'enregistrer le brouillon."
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
      await checkCra(form);

      const createdCra = await createCra(form);
      await submitCra(createdCra.id);

      navigate('/mes-cra');
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          'Impossible de soumettre le CRA. Vérifie les jours déclarés.'
      );
    } finally {
      setLoading(false);
    }
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
                  Client
                  <select
                    value={form.client_id}
                    onChange={handleClientChange}
                    disabled={clientsLoading || clients.length === 0}
                  >
                    {clientsLoading ? (
                      <option value="">Chargement...</option>
                    ) : clients.length === 0 ? (
                      <option value="">Aucun client assigné</option>
                    ) : (
                      clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.nom}
                        </option>
                      ))
                    )}
                  </select>
                </label>

                <label>
                  Mois
                  <select name="mois" value={form.mois} onChange={handleMonthChange}>
                    <option value={1}>Janvier</option>
                    <option value={2}>Février</option>
                    <option value={3}>Mars</option>
                    <option value={4}>Avril</option>
                    <option value={5}>Mai</option>
                    <option value={6}>Juin</option>
                    <option value={7}>Juillet</option>
                    <option value={8}>Août</option>
                    <option value={9}>Septembre</option>
                    <option value={10}>Octobre</option>
                    <option value={11}>Novembre</option>
                    <option value={12}>Décembre</option>
                  </select>
                </label>

                <label>
                  Année
                  <input type="text" value={currentYear} disabled readOnly />
                </label>
              </div>
            </section>

            <section className="cra-main-card">
              <div className="cra-section-header">
                <h2>Saisie des activités</h2>

                <button type="button" className="add-line-btn" onClick={addDay}>
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
                        required
                      >
                        <option value="">jj</option>

                        {Array.from(
                          { length: getLastDayOfMonth() },
                          (_, i) => i + 1
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
                    />

                    <button
                      type="button"
                      className="delete-line-btn"
                      onClick={() => removeDay(index)}
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
                  disabled={loading}
                >
                  Enregistrer brouillon
                </button>

                <button type="submit" className="primary-btn" disabled={loading}>
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