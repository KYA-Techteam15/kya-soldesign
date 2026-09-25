import type { ProjectViewModel } from '../../app/models/projectView';
import type { CalculationFacts } from '../../domain/completion';
import { assessDocumentReadiness, type DocumentIssue } from '../../app/models/documentReadiness';
import { latestVersion, nextVersionNumber } from '../../app/models/projectLifecycle';
import { dateLong } from '../../domain/format';
import { useProjects } from '../../store/project';
import { useSettings } from '../../store/settings';
import { useUi } from '../../store/ui';
import { useT } from '../../i18n';
import { useEntitlement } from '../../app/licensing/licenseStore';
import { LockMark } from '../../ui/LockMark';

/** Ce qui empêche d'émettre : les blocages du rapport et de la facture proforma, sans doublon. */
export function issueBlockers(project: ProjectViewModel, facts: CalculationFacts, companyName: string): readonly DocumentIssue[] {
  const all = (['rapport', 'proforma'] as const).flatMap((kind) => assessDocumentReadiness({ project, kind, facts, withPrices: true, companyName }).blockers);
  return all.filter((item, index) => all.findIndex((other) => other.code === item.code) === index);
}

/**
 * Émission du dossier (FR-009, FR-010). Émettre fige une version numérotée et met le dossier en
 * lecture seule ; les versions émises restent consultables et réimprimables.
 */
export function IssuePanel({ project, facts, onShowVersion }: {
  readonly project: ProjectViewModel;
  readonly facts: CalculationFacts;
  readonly onShowVersion: (versionNumber: number) => void;
}) {
  const t = useT();
  const lang = useUi((state) => state.lang);
  const { ask, notify } = useUi();
  const issue = useProjects((session) => session.issue);
  const revise = useProjects((session) => session.revise);
  const companyName = useSettings((state) => state.company.name);
  const locked = project.issue.locked;
  const canIssue = useEntitlement('lifecycle.issue');
  const next = nextVersionNumber(project);
  const blockers = locked ? [] : issueBlockers(project, facts, companyName);
  const latest = latestVersion(project);

  const confirmIssue = () => ask({
    title: t('issue.confirmTitle').replace('{n}', String(next)),
    message: t('issue.confirmMessage'),
    confirmLabel: t('issue.confirm'),
    onConfirm: () => {
      issue(project.id);
      notify({ kind: 'success', title: t('issue.issued').replace('{n}', String(next)) });
    },
  });

  return (
    <section className="out issue-panel">
      <div className="out-head">
        <span className="out-tag">{t('issue.tag')}</span>
        <h2 className="h-sec">{locked && latest ? t('issue.issuedTitle').replace('{n}', String(latest.number)) : latest ? t('issue.revisionTitle').replace('{n}', String(next)) : t('issue.neverIssued')}</h2>
        <span className="sep" />
        {locked
          ? <button className="btn" disabled={!canIssue} onClick={() => revise(project.id)}>{t('issue.revise').replace('{n}', String(next))}</button>
          : <button className="btn btn-primary" disabled={blockers.length > 0 || !canIssue} onClick={confirmIssue}>{t('issue.action').replace('{n}', String(next))}{!canIssue && <LockMark />}</button>}
      </div>
      <p className="issue-lead">
        {locked && latest
          ? t('issue.lockedLead').replace('{date}', dateLong(latest.issuedAt, lang))
          : !canIssue
            ? t('license.locked.issue')
            : blockers.length > 0
            ? <>{t('issue.blockedLead')} <span className="issue-blockers">{blockers.map((item) => t(item.messageKey)).join(' · ')}</span></>
            : t('issue.readyLead')}
      </p>
      {project.issue.versions.length > 0 && (
        <table className="tbl issue-versions">
          <caption className="label">{t('issue.versions')}</caption>
          <tbody>
            {[...project.issue.versions].reverse().map((version) => (
              <tr key={version.number}>
                <td><b>v{version.number}</b></td>
                <td>{dateLong(version.issuedAt, lang)}</td>
                <td>{version.reference ? `n° ${version.reference}` : '—'}</td>
                <td className="num"><button className="btn" onClick={() => onShowVersion(version.number)}>{t('issue.showDocuments')}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
