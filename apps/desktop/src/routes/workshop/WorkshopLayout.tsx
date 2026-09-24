import { NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { latestVersion, nextVersionNumber } from '../../app/models/projectLifecycle';
import type { ProjectViewModel } from '../../app/models/projectView';
import { dateLong } from '../../domain/format';
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
import { useCatalog } from '../../app/CatalogProvider';
import { useCalculationState } from '../../app/CalculationProvider';
import type { PresizingOutputV1 } from '@ksd/engine';
import { useCalculationFacts } from '../../app/calculation/useCalculationFacts';
import { createEmptyProjectFile, projectFileToView } from '../../app/models/projectAdapters';

/** Projet neutre : les hooks de faits s'appellent avant de savoir si le projet existe. */
const PLACEHOLDER_PROJECT = projectFileToView(createEmptyProjectFile('00000000-0000-4000-8000-000000000000', 'standalone-all-in-one', '2026-01-01T00:00:00.000Z', '—'));

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

/**
 * Où en est le dossier : émis (lecture seule, « Créer une révision ») ou en révision (la version
 * émise reste consultable). Rien pour un dossier jamais émis.
 */
function LifecycleBanner({ project, onDossier }: { readonly project: ProjectViewModel; readonly onDossier: boolean }) {
  const t = useT();
  const lang = useUi((s) => s.lang);
  const revise = useProjects((s) => s.revise);
  const nav = useNavigate();
  const latest = latestVersion(project);
  if (latest === null) return null;
  const next = String(nextVersionNumber(project));
  if (project.issue.locked) {
    return (
      <div className="alert info lifecycle-banner" role="note">
        <div><b>{t('issue.bannerIssued').replace('{n}', String(latest.number)).replace('{date}', dateLong(latest.issuedAt, lang))}</b> {t('issue.bannerReadOnly')}</div>
        <button className="btn" onClick={() => revise(project.id)}>{t('issue.revise').replace('{n}', next)}</button>
      </div>
    );
  }
  return (
    <div className="alert lifecycle-banner is-revision" role="note">
      <div><b>{t('issue.bannerRevision').replace('{n}', next)}</b> {t('issue.bannerRevisionLead').replace('{n}', String(latest.number))}</div>
      {!onDossier && <button className="btn" onClick={() => nav(`/projet/${project.id}/atelier/dossier`)}>{t('issue.bannerOpenDossier')}</button>}
    </div>
  );
}

export function WorkshopLayout() {
  const { id } = useParams();
  const nav = useNavigate();
  const t = useT();
  const projects = useProjects((s) => s.projects);
  const open = useProjects((s) => s.open);
  const validationError = useProjects((s) => (id === undefined ? undefined : s.validationErrors[id]));
  const lang = useUi((s) => s.lang);
  const verdictPreference = useUi((s) => s.verdictPreference);
  const centerRef = useRef<HTMLElement>(null);
  const { summary } = useCatalog();
  const project = projects.find((p) => p.id === id) ?? null;
  const { facts } = useCalculationFacts(project ?? PLACEHOLDER_PROJECT);
  const presizing = useCalculationState<PresizingOutputV1>(project?.id ?? '', 'presizing', project?.updatedAt ?? '');
  const onDossier = useLocation().pathname.endsWith('/dossier');

  useEffect(() => {
    if (id) open(id);
  }, [id, open]);

  /* Sans prédimensionnement, le panneau n'a rien à dire : il reste replié.
     Un choix explicite de l'utilisateur l'emporte et reste mémorisé. */
  const verdictCollapsed = verdictPreference === null ? project?.lastCalculation == null : verdictPreference === 'collapsed';

  if (!project) {
    return (
      <div className="page">
        <TopBar back="/accueil" />
        <div className="page-body">
          <div className="page-inner">
            <div className="empty">
              <b>{t('workshop.projectMissing')}</b>
              {t('workshop.projectMissingHelp')}{' '}
              <button className="linkish" onClick={() => nav('/accueil')}>
                {t('workshop.backHome')}
              </button>
            </div>
          </div>
        </div>
        <StatusBar />
      </div>
    );
  }

  const states = sectionStates(project, lang, facts);
  const hasNotices = Boolean(validationError) || project.issue.versions.length > 0;
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
                    {st.meta && <span className="nav-meta">{st.meta}</span>}
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
            <h2 className="h-sec">{t('workshop.catalogBase')}</h2>
          </div>
          <div className="tree-sub" style={{ paddingLeft: 16 }}>
            <div>
              <span>{t('workshop.modules')}</span>
              <span>{summary?.accepted['pv-module'] ?? '—'}</span>
            </div>
            <div>
              <span>{t('workshop.batteries')}</span>
              <span>{summary?.accepted.battery ?? '—'}</span>
            </div>
            <div>
              <span>{t('workshop.inverters')}</span>
              <span>{summary?.accepted.inverter ?? '—'}</span>
            </div>
          </div>
        </nav>

        <main className={`pane pane-center pinned ${hasNotices ? 'has-notices' : ''}`} ref={centerRef}>
          {/* Les avis tiennent dans une rangée à eux, au-dessus de la feuille qui défile. */}
          {hasNotices && (
            <div className="pane-notices">
              {validationError && <div className="alert warn" role="alert"><div><b>{t('workshop.notSaved')}</b> {t('workshop.notSavedHelp')} <code>{validationError}</code></div></div>}
              <LifecycleBanner project={project} onDossier={onDossier} />
            </div>
          )}
          {/* Dossier émis : chaque étape se lit, rien ne se modifie. L'étape 8 reste active pour
              consulter et réimprimer les documents. */}
          {project.issue.locked && !onDossier
            ? <fieldset className="ro-lock" disabled><Outlet context={project} /></fieldset>
            : <Outlet context={project} />}
          <MoreBelow containerRef={centerRef} />
          <StepNext />
        </main>

        {!verdictCollapsed && <VerdictPanel project={project} />}
      </div>

      {verdictCollapsed && (
        <VerdictTab
          svi={presizing.status === 'ready' ? presizing.envelope.output.selected.svi : null}
          viable={presizing.status === 'ready' && presizing.envelope.output.viable}
        />
      )}

      <StatusBar currency={project.currency} />
    </div>
  );
}
