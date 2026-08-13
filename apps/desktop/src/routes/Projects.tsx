import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { TopBar } from '../shell/TopBar';
import { StatusBar } from '../shell/StatusBar';
import { useProjects } from '../store/project';
import { useUi } from '../store/ui';
import { useT } from '../i18n';
import { relativeFr } from '../domain/format';

export function ProjectsRoute() {
  const t = useT();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const projects = useProjects((s) => s.projects);
  const remove = useProjects((s) => s.remove);
  const ask = useUi((s) => s.ask);
  const notify = useUi((s) => s.notify);

  const needle = q.trim().toLowerCase();
  const shown = projects.filter(
    (p) =>
      !needle ||
      p.name.toLowerCase().includes(needle) ||
      p.details.clientName.toLowerCase().includes(needle) ||
      p.details.projectNumber.toLowerCase().includes(needle),
  );

  return (
    <div className="page">
      <TopBar back="/accueil" />
      <div className="page-body">
        <div className="page-inner">
          <div className="rowline">
            <h1 className="page-title">{t('home.allProjects')}</h1>
            <span className="sep" />
            <input
              className="hdr-search"
              style={{ width: 240 }}
              placeholder={t('g.search')}
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <span className="label">{shown.length} projet(s)</span>
          </div>

          {shown.length === 0 ? (
            <div className="empty">
              <b>Aucun projet trouvé</b>
              {needle
                ? 'Aucun dossier ne correspond à cette recherche.'
                : 'Créez votre premier projet.'}
            </div>
          ) : (
            <div className="proj-list">
              {shown.map((p) => (
                <div key={p.id} className="proj-row">
                  <button
                    style={{ textAlign: 'left' }}
                    onClick={() => nav(`/projet/${p.id}/atelier/projet`)}
                  >
                    <b>{p.name}</b>
                    <small>
                      {p.details.clientName || 'Client non renseigné'} · n°{' '}
                      {p.details.projectNumber || '—'}
                    </small>
                  </button>
                  <span className="when">{relativeFr(p.updatedAt)}</span>
                  <button
                    className="btn"
                    onClick={() =>
                      ask({
                        title: 'Supprimer ce projet ?',
                        message: `« ${p.name} » sera définitivement retiré de la liste.`,
                        confirmLabel: t('g.delete'),
                        danger: true,
                        onConfirm: () => {
                          remove(p.id);
                          notify({ kind: 'success', title: 'Projet supprimé' });
                        },
                      })
                    }
                  >
                    {t('g.delete')}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      <StatusBar />
    </div>
  );
}
