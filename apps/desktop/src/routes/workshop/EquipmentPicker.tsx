/**
 * Choix d'une référence, avec son effet montré avant la validation.
 *
 * L'ancien sélecteur affichait quarante lignes filtrées par texte : on lisait
 * un code et deux caractéristiques, on validait, et on découvrait ensuite que
 * la réserve avait basculé à -8 % ou que la chaîne sortait de la plage MPPT.
 * Le moteur étant pur, on peut simuler chaque candidat sur une copie du projet
 * et afficher la configuration qui en résulte — nombre d'unités, réserve,
 * contraintes rompues — avant d'écrire quoi que ce soit.
 */

import { useMemo, useState } from 'react';
import { engine } from '../../engine';
import { fmt, signed } from '../../domain/format';
import { batteries, inverters, modules } from '../../data/reference';
import { Dialog } from '../../ui/Dialog';
import type { Project } from '../../domain/types';

export type Kind = 'module' | 'battery' | 'inverter';

const TITLE: Record<Kind, string> = {
  module: 'Choisir un module',
  battery: 'Choisir une batterie',
  inverter: 'Choisir un onduleur',
};

/** Ce que devient le projet si l'on retient ce candidat. */
interface Outcome {
  id: string;
  code: string;
  maker: string;
  detail: string;
  /** Caractéristiques propres, deux au plus : ce qui distingue la référence. */
  specs: string;
  count: number;
  config: string;
  reserve: number;
  /** Contraintes que ce candidat rompt et que l'état courant tenait. */
  broken: string[];
  /** Contraintes actuellement rompues que ce candidat répare. */
  fixed: string[];
  current: boolean;
}

function tone(percent: number): string {
  if (percent < 0) return 'short';
  if (percent < 5) return 'tight';
  if (percent > 20) return 'over';
  return 'ok';
}

export function EquipmentPicker({
  kind,
  project,
  onPick,
  onClose,
}: {
  kind: Kind;
  project: Project;
  onPick: (id: string) => void;
  onClose: () => void;
}) {
  const [q, setQ] = useState('');
  const [only, setOnly] = useState(true);

  const current =
    kind === 'module'
      ? project.selection.moduleId
      : kind === 'battery'
        ? project.selection.batteryId
        : project.selection.inverterId;

  const needle = q.trim().toLowerCase();

  /**
   * Référence de comparaison : les contraintes déjà rompues aujourd'hui. Sans
   * elle, le filtre écartait toutes les références dès qu'une seule contrainte
   * du dossier n'était pas tenue — y compris quand elle ne dépendait pas du
   * composant qu'on est en train de choisir.
   */
  const baseFailed = useMemo(
    () => new Set(engine.size(project).constraints.filter((c) => !c.satisfied).map((c) => c.id)),
    [project],
  );

  /**
   * Vingt simulations complètes par frappe seraient coûteuses ; le filtre
   * textuel réduit d'abord, et `useMemo` évite de refaire le travail à chaque
   * rendu. C'est le prix à payer pour montrer une conséquence plutôt qu'une
   * fiche technique.
   */
  const rows = useMemo<Outcome[]>(() => {
    const match = (...f: string[]) =>
      !needle || f.some((x) => x.toLowerCase().includes(needle));

    const simulate = (
      id: string,
    ): { count: number; config: string; reserve: number; broken: string[]; fixed: string[] } => {
      const draft: Project = {
        ...project,
        selection: { ...project.selection, [`${kind}Id`]: id } as Project['selection'],
      };
      const z = engine.size(draft);
      const failed = z.constraints.filter((c) => !c.satisfied);
      const broken = failed.filter((c) => !baseFailed.has(c.id)).map((c) => c.label);
      const fixed = z.constraints
        .filter((c) => c.satisfied && baseFailed.has(c.id))
        .map((c) => c.label);
      if (kind === 'module' && z.pvArray) {
        return {
          count: z.pvArray.count,
          config: `${z.pvArray.series}S × ${z.pvArray.parallel}P`,
          reserve: z.pvArray.reservePercent,
          broken,
          fixed,
        };
      }
      if (kind === 'battery' && z.bank) {
        return {
          count: z.bank.count,
          config: `${z.bank.series}S × ${z.bank.parallel}P`,
          reserve: z.bank.reservePercent,
          broken,
          fixed,
        };
      }
      if (kind === 'inverter' && z.inverters) {
        return {
          count: z.inverters.count,
          config: `${z.inverters.count} en parallèle`,
          reserve: z.inverters.reservePercent,
          broken,
          fixed,
        };
      }
      return { count: 0, config: '—', reserve: 0, broken, fixed };
    };

    const build = (
      id: string,
      code: string,
      maker: string,
      detail: string,
      specs: string,
    ): Outcome => ({
      id,
      code,
      maker,
      detail,
      specs,
      current: id === current,
      ...simulate(id),
    });

    /**
     * La référence en cours vient toujours en tête, même si l'ordre du
     * catalogue l'aurait reléguée au-delà de la coupe : sans elle, on compare
     * des candidats à un point de repère absent de l'écran.
     */
    const head = <T extends { id: string }>(list: T[]): T[] => {
      const i = list.findIndex((x) => x.id === current);
      if (i <= 0) return list.slice(0, 24);
      return [list[i]!, ...list.filter((_, j) => j !== i).slice(0, 23)];
    };

    if (kind === 'module') {
      return head(modules.filter((m) => match(m.code, m.maker, m.module_type))).map((m) =>
        build(m.id, m.code, m.maker, m.module_type, `${fmt(m.power)} Wc · ${fmt(m.voc_stc, 1)} V`),
      );
    }
    if (kind === 'battery') {
      return head(batteries.filter((b) => match(b.code, b.maker, b.technology))).map((b) =>
        build(b.id, b.code, b.maker, b.technology, `${fmt(b.capacity)} Ah · ${fmt(b.voltage)} V`),
      );
    }
    return head(inverters.filter((i) => match(i.code, i.maker, i.inverter_type))).map((i) =>
      build(
        i.id,
        i.code,
        i.maker,
        i.inverter_type,
        `${fmt(i.nominal_power / 1000, 1)} kW · ${fmt(i.nominal_dc_voltage)} Vdc`,
      ),
    );
  }, [kind, needle, project, current, baseFailed]);

  const shown = only ? rows.filter((r) => r.broken.length === 0 || r.current) : rows;
  const hidden = rows.length - shown.length;

  return (
    <Dialog
      title={TITLE[kind]}
      lead="chaque ligne montre la configuration obtenue, pas seulement la fiche"
      wide
      onClose={onClose}
      footer={
        <>
          <label className="dlg-check">
            <input
              type="checkbox"
              checked={only}
              onChange={(e) => setOnly(e.target.checked)}
            />
            Masquer les références qui rompent une contrainte de plus qu’aujourd’hui
            {hidden > 0 && <span className="label"> · {hidden} masquée(s)</span>}
          </label>
          <button className="btn btn-ghost" onClick={onClose}>
            Fermer
          </button>
        </>
      }
    >
      <input
        className="dlg-search"
        autoFocus
        placeholder="Filtrer par code, fabricant ou technologie…"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      <div className="pick-list">
        {shown.map((r) => (
          <button
            key={r.id}
            className={`pick-row ${r.current ? 'on' : ''}`}
            onClick={() => onPick(r.id)}
          >
            <span className="pick-id">
              <b>{r.code}</b>
              <small>
                {r.maker} · {r.detail}
              </small>
            </span>
            <span className="pick-spec">{r.specs}</span>
            <span className="pick-conf">
              <b>{r.count}</b>
              <small>{r.config}</small>
            </span>
            <span className={`res res-${tone(r.reserve)} pick-res`}>
              {signed(r.reserve)}
              <span className="unit">%</span>
            </span>
            {/* La cellule existe toujours, pour que les colonnes ne dansent
                pas d'une ligne à l'autre ; elle ne porte un badge que quand
                il apprend quelque chose. */}
            <span className="pick-state">
              {r.current ? (
                <span className="badge ok">retenu</span>
              ) : r.broken.length > 0 ? (
                <span className="badge bad" title={r.broken.join(' · ')}>
                  rompt {r.broken.length}
                </span>
              ) : r.fixed.length > 0 ? (
                <span className="badge ok" title={r.fixed.join(' · ')}>
                  répare {r.fixed.length}
                </span>
              ) : null}
            </span>
          </button>
        ))}
        {shown.length === 0 && (
          <div className="empty" style={{ margin: 0 }}>
            <b>Aucune référence ne fait mieux</b>
            Décochez le filtre pour voir les candidats écartés et ce qu’ils rompent.
          </div>
        )}
      </div>
    </Dialog>
  );
}
