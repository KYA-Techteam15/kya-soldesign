import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import { TopBar } from '../../shell/TopBar';
import { StatusBar } from '../../shell/StatusBar';
import { VerdictPanel } from '../../shell/VerdictPanel';
import { VerdictTab } from '../../shell/VerdictTab';
import { MoreBelow } from '../../shell/MoreBelow';
import { StepNext } from '../../ui/Flow';
import { useProjects } from '../../store/project';
import { useUi } from '../../store/ui';
import { useT } from '../../i18n';
import { sectionStates } from '../../domain/completion';
import { referenceCounts } from '../../data/reference';
import { engine } from '../../engine';
import { readiness } from '../../domain/readiness';

/**
 * Les 8 étapes de l'atelier. Aucun ordre n'est imposé (critère A4).
 *
 * Le dossier client ferme la liste : ce n'est pas un mode à part, c'est
 * l'aboutissement du travail, et l'utilisateur doit garder le verdict sous les
 * yeux au moment de décider s'il remet le document.
 */
export const SECTIONS = [
  { slug: 'projet', key: 'ws.section.projet' },
  { slug: 'site', key: 'ws.section.site' },
  { slug: 'besoins', key: 'ws.section.besoins' },
  { slug: 'hypotheses', key: 'ws.section.hypotheses' },
  { slug: 'materiel', key: 'ws.section.materiel' },
  { slug: 'protections', key: 'ws.section.protections' },
  { slug: 'chiffrage', key: 'ws.section.chiffrage' },
  { slug: 'dossier', key: 'ws.section.dossier' },
] as const;

export function WorkshopLayout() {
  const { id } = useParams();
  const nav = useNavigate();
  const t = useT();
  const projects = useProjects((s) => s.projects);
  const open = useProjects((s) => s.open);
  const verdictCollapsed = useUi((s) => s.verdictCollapsed);
  const toggleVerdict = useUi((s) => s.toggleVerdict);
  const { pathname } = useLocation();
  const centerRef = useRef<HTMLElement>(null);
  const project = projects.find((p) => p.id === id) ?? null;

  useEffect(() => {
    if (id) open(id);
  }, [id, open]);

  /* L'étape des besoins se lit avec le profil sous les yeux : arriver là
     avec le panneau replié rouvre celui-ci. */
  const onLoads = pathname.endsWith('/besoins');
  useEffect(() => {
    if (onLoads && verdictCollapsed) toggleVerdict();
  }, [onLoads, verdictCollapsed, toggleVerdict]);

  if (!project) {
    return (
      <div className="page">
        <TopBar back="/accueil" />
        <div className="page-body">
          <div className="page-inner">
            <div className="empty">
              <b>Projet introuvable</b>
              Il a peut-être été supprimé.{' '}
              <button className="linkish" onClick={() => nav('/accueil')}>
                Retour à l’accueil
              </button>
            </div>
          </div>
        </div>
        <StatusBar />
      </div>
    );
  }

  const lang = useUi((s) => s.lang);
  const states = sectionStates(project, lang);
  /* L'encoche porte le SVI, mais seulement s'il existe : avant le
     prédimensionnement, le moteur en fabrique un à partir de zéros. */
  const gates = readiness(project);
  const runs = useUi((s) => s.runs)[project.id];
  const hasVerdict = gates.presizing.ready && Boolean(runs?.presizedOnce);
  const v = hasVerdict ? engine.verdict(project) : null;

  return (
    <div className={`app ${verdictCollapsed ? 'verdict-off' : ''}`}>
      {/* Plus de bouton « Dossier client » : le dossier est la huitième étape
          du rail. Un raccourci qui double une étape visible n'ajoute rien et
          suggère deux endroits différents pour la même chose. */}
      <TopBar project={project} back="/accueil" />

      <div className="main">
        <nav className="pane pane-left">
          <div className="tree-group">
            <h2 className="h-sec">{t('ws.folder')}</h2>
          </div>
          <ul className="tree">
            {SECTIONS.map((s) => {
              const st = states[s.slug];
              return (
                <li key={s.slug}>
                  <NavLink
                    to={`/projet/${project.id}/atelier/${s.slug}`}
                    className={({ isActive }) =>
                      `nav-item ${isActive ? 'on' : ''}`
                    }
                    title={
                      st.missing.length > 0
                        ? `${t('ws.toComplete')} : ${st.missing.join(', ')}`
                        : t('ws.complete')
                    }
                  >
                    <i className={`st st-${st.level}`} />
                    <span className="nav-rank">{SECTIONS.indexOf(s) + 1}</span>
                    <span className="nav-label">{t(s.key)}</span>
                    <span className="nav-meta">{st.meta}</span>
                  </NavLink>
                </li>
              );
            })}
          </ul>

          {/* La liste des scénarios de couverture a disparu avec eux : le
              moteur ne dimensionne qu'un système, celui qui couvre tout le
              besoin. Les couvertures partielles n'étaient qu'un produit en
              croix appliqué au résultat, sans simulation propre. */}
          <div className="tree-group" style={{ marginTop: 16 }}>
            <h2 className="h-sec">Base matériel</h2>
          </div>
          <div className="tree-sub" style={{ paddingLeft: 16 }}>
            <div>
              <span>Modules</span>
              <span>{referenceCounts.modules}</span>
            </div>
            <div>
              <span>Batteries</span>
              <span>{referenceCounts.batteries}</span>
            </div>
            <div>
              <span>Onduleurs</span>
              <span>{referenceCounts.inverters}</span>
            </div>
          </div>
        </nav>

        <main className="pane pane-center pinned" ref={centerRef}>
          <Outlet context={project} />
          <MoreBelow containerRef={centerRef} />
          <StepNext />
        </main>

        {!verdictCollapsed && <VerdictPanel project={project} />}
      </div>

      {verdictCollapsed && (
        <VerdictTab svi={v ? v.svi : null} viable={v ? v.viable : false} />
      )}

      <StatusBar currency={project.currency} />
    </div>
  );
}
