import { useState } from 'react';
import { useProject } from './Stub';
import { useProjects } from '../../store/project';
import { useUi } from '../../store/ui';
import { StepHead } from '../../ui/Flow';
import { fmt } from '../../domain/format';
import { useGridNav } from '../../ui/useGridNav';
import type { Granularity, LoadSource, NamedProfile } from '../../app/models/projectView';
import { useCalculationState } from '../../app/CalculationProvider';
import { CapabilityNotice } from '../../ui/CapabilityNotice';

const MODES: { key: LoadSource; label: string }[] = [
  /* Chaque onglet nomme la manière dont on renseigne la consommation, pas la
     forme du résultat : « Profil horaire » décrivait ce qu'on obtient, alors
     que le choix porte sur ce qu'on saisit. */
  { key: 'equipments', label: 'Recenser les appareils' },
  { key: 'hourly', label: 'Saisir heure par heure' },
  { key: 'meter', label: 'Partir de la facture' },
];

const GRANULARITIES: { key: Granularity; label: string; n: string; hint: string }[] = [
  { key: 'annual', label: 'Annuel', n: '1', hint: 'Un seul profil pour toute l’année' },
  { key: 'weekly', label: 'Hebdomadaire', n: '2', hint: 'Semaine et week-end séparés' },
  { key: 'daily', label: 'Journalier', n: '7', hint: 'Un profil par jour de la semaine' },
  { key: 'monthly', label: 'Mensuel', n: '12', hint: 'Un profil par mois' },
  { key: 'periodic', label: 'Périodes', n: 'N', hint: 'Périodes saisonnières personnalisées' },
  { key: 'combined', label: 'Combiné', n: '×', hint: 'Hebdomadaire × périodes, jusqu’à 12 profils' },
];

export function SectionBesoins() {
  const project = useProject();
  const update = useProjects((s) => s.update);
  const notify = useUi((s) => s.notify);
  const [showGranularity, setShowGranularity] = useState(false);
  const [filter, setFilter] = useState('');

  const profile = project.load.profiles.find(
    (p) => p.id === project.load.activeProfileId,
  )!;
  const calculation = useCalculationState(project.id, 'sizing', project.updatedAt);

  const mutateProfile = (fn: (p: NamedProfile) => void) =>
    update((draft) => {
      const p = draft.load.profiles.find((x) => x.id === draft.load.activeProfileId);
      if (p) fn(p);
    });

  const num = (v: string) => {
    const parsed = Number.parseFloat(v.replace(',', '.').replace(/\s/g, ''));
    return Number.isFinite(parsed) ? parsed : 0;
  };

  /**
   * Un seul mode pilote le calcul à la fois. Basculer sans le dire ferait croire
   * à une perte de travail : on l'annonce, et on reporte ce qui est reportable.
   */
  const switchMode = (next: LoadSource) => {
    if (next === profile.source) return;
    mutateProfile((p) => {
      p.source = next;
    });
    const said: Record<LoadSource, string> = {
      equipments: 'La liste d’appareils pilote désormais le calcul.',
      hourly: 'Le profil horaire saisi est désormais la source active.',
      meter: 'L’estimation depuis la facture pilote désormais le calcul.',
    };
    notify({ kind: 'info', title: 'Source de calcul changée', detail: said[next] });
  };

  const addClassic = () =>
    mutateProfile((p) =>
      p.classic.push({
        id: `c-${Date.now()}`,
        name: 'Nouvel appareil',
        qty: 1,
        unitPower: 100,
        yield: 0.9,
        opHours: 4,
      }),
    );
  const addInductive = () =>
    mutateProfile((p) =>
      p.inductive.push({
        id: `i-${Date.now()}`,
        name: 'Nouveau moteur',
        qty: 1,
        unitPower: 500,
        yield: 0.85,
        startupCoef: 3,
        opHours: 2,
      }),
    );

  const CLASSIC_COLS = ['name', 'qty', 'unitPower', 'yield', 'opHours'] as const;
  const INDUCT_COLS = ['name', 'qty', 'unitPower', 'yield', 'startupCoef', 'opHours'] as const;

  const classicGrid = useGridNav({
    rowCount: profile.classic.length,
    colCount: CLASSIC_COLS.length,
    addRow: addClassic,
    getCell: (r, c) => String(profile.classic[r]?.[CLASSIC_COLS[c]] ?? ''),
    setCell: (r, c, v) =>
      mutateProfile((p) => {
        const row = p.classic[r];
        if (!row) return;
        const key = CLASSIC_COLS[c];
        if (key === 'name') row.name = v;
        else (row[key] as number) = num(v);
      }),
  });

  const inductGrid = useGridNav({
    rowCount: profile.inductive.length,
    colCount: INDUCT_COLS.length,
    addRow: addInductive,
    getCell: (r, c) => String(profile.inductive[r]?.[INDUCT_COLS[c]] ?? ''),
    setCell: (r, c, v) =>
      mutateProfile((p) => {
        const row = p.inductive[r];
        if (!row) return;
        const key = INDUCT_COLS[c];
        if (key === 'name') row.name = v;
        else (row[key] as number) = num(v);
      }),
  });

  const needle = filter.trim().toLowerCase();
  const keep = (name: string) => !needle || name.toLowerCase().includes(needle);
  const visibleClassic = profile.classic
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => keep(e.name));
  const visibleInductive = profile.inductive
    .map((e, i) => ({ e, i }))
    .filter(({ e }) => keep(e.name));

  return (
    <div className="sheet">
      <StepHead
        slug="besoins"
        aside={
          <>
            <div className="seg" role="tablist">
              {MODES.map((m) => (
                <button
                  key={m.key}
                  role="tab"
                  aria-selected={profile.source === m.key}
                  onClick={() => switchMode(m.key)}
                >
                  {m.label}
                </button>
              ))}
            </div>
            <button className="btn" onClick={() => setShowGranularity(true)}>
              Profils : {GRANULARITIES.find((g) => g.key === project.load.granularity)?.label}
            </button>
          </>
        }
      />

      {profile.source === 'equipments' && (
        <div style={{ display: 'grid', gap: 'var(--sp-4)' }}>
          <section>
            <div className="tbl-title">
              <h2 className="h-sec">Appareils classiques</h2>
              <span className="label">
                {profile.classic.length} lignes
                {filter && ` · ${visibleClassic.length} filtrées`}
              </span>
              <input
                /* Champ de filtre : il attend une frappe, pas un clic. */
                className="hdr-search"
                style={{ width: 160 }}
                placeholder="Filtrer par nom…"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              />
              <span className="sep" />
              <span className="label">colonnes grisées = calculées</span>
              <button
                className="btn"
                onClick={() =>
                  notify({
                    kind: 'info',
                    title: 'Collage depuis Excel',
                    detail:
                      'Copiez une plage dans le tableur, cliquez une cellule du tableau, puis Ctrl V. Les lignes manquantes sont créées.',
                  })
                }
              >
                Aide au collage
              </button>
            </div>
            <div
              className="tbl-wrap"
              ref={classicGrid.ref}
              onKeyDown={classicGrid.onKeyDown}
              onPaste={classicGrid.onPaste}
            >
              <table className="tbl t-classic">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Qté</th>
                    <th>P. unit.<span className="unit">W</span></th>
                    <th>Rend.</th>
                    <th>Heures</th>
                    <th className="derived">P. totale<span className="unit">W</span></th>
                    <th className="derived">P. réelle<span className="unit">W</span></th>
                    <th className="derived">E. totale<span className="unit">Wh</span></th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {visibleClassic.map(({ e, i }) => {
                    return (
                      <tr key={e.id}>
                        <td className="name">
                          <input className="cell-in" data-r={i} data-c={0} aria-label="Nom" value={e.name}
                            onChange={(ev) => mutateProfile((p) => { p.classic[i].name = ev.target.value; })} />
                        </td>
                        <td>
                          <input className="cell-in" data-r={i} data-c={1} aria-label="Quantité" value={e.qty}
                            onChange={(ev) => mutateProfile((p) => { p.classic[i].qty = num(ev.target.value); })} />
                        </td>
                        <td>
                          <input className="cell-in" data-r={i} data-c={2} aria-label="Puissance unitaire" value={e.unitPower}
                            onChange={(ev) => mutateProfile((p) => { p.classic[i].unitPower = num(ev.target.value); })} />
                        </td>
                        <td>
                          <input className="cell-in" data-r={i} data-c={3} aria-label="Rendement" value={fmt(e.yield, 2)}
                            onChange={(ev) => mutateProfile((p) => { p.classic[i].yield = num(ev.target.value); })} />
                        </td>
                        <td>
                          <input className="cell-in" data-r={i} data-c={4} aria-label="Heures d'usage" value={fmt(e.opHours, e.opHours % 1 ? 1 : 0)}
                            onChange={(ev) => mutateProfile((p) => { p.classic[i].opHours = num(ev.target.value); })} />
                        </td>
                        <td className="derived num">—</td>
                        <td className="derived num">—</td>
                        <td className="derived num">—</td>
                        <td>
                          <button className="rowdel" title="Supprimer la ligne"
                            onClick={() => mutateProfile((p) => { p.classic.splice(i, 1); })}>
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={5}>Sous-total classiques</td>
                    <td className="num">—</td>
                    <td className="num">—</td>
                    <td className="num">—</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
              <div className="addrow">
                <button
                  className="btn"
                  onClick={addClassic}
                >
                  + Ajouter une ligne
                </button>
                <span className="sep" />
                <span className="kbd">Entrée</span> nouvelle ligne ·{' '}
                <span className="kbd">Ctrl D</span> recopier vers le bas ·{' '}
                <span className="kbd">Ctrl V</span> coller une plage Excel
              </div>
            </div>
          </section>

          <section>
            <div className="tbl-title">
              <h2 className="h-sec">Appareils inductifs</h2>
              <span className="label">
                {profile.inductive.length} lignes
                {filter && ` · ${visibleInductive.length} filtrées`} · coefficient de
                démarrage appliqué à la pointe
              </span>
            </div>
            <div
              className="tbl-wrap"
              ref={inductGrid.ref}
              onKeyDown={inductGrid.onKeyDown}
              onPaste={inductGrid.onPaste}
            >
              <table className="tbl t-induct">
                <thead>
                  <tr>
                    <th>Nom</th>
                    <th>Qté</th>
                    <th>P. unit.<span className="unit">W</span></th>
                    <th>Rend.</th>
                    <th>Coef. dém.</th>
                    <th>Heures</th>
                    <th className="derived">P. totale<span className="unit">W</span></th>
                    <th className="derived">P. réelle<span className="unit">W</span></th>
                    <th className="derived">E. totale<span className="unit">Wh</span></th>
                    <th aria-label="Actions" />
                  </tr>
                </thead>
                <tbody>
                  {visibleInductive.map(({ e, i }) => {
                    return (
                      <tr key={e.id}>
                        <td className="name">
                          <input className="cell-in" data-r={i} data-c={0} aria-label="Nom" value={e.name}
                            onChange={(ev) => mutateProfile((p) => { p.inductive[i].name = ev.target.value; })} />
                        </td>
                        <td>
                          <input className="cell-in" data-r={i} data-c={1} aria-label="Quantité" value={e.qty}
                            onChange={(ev) => mutateProfile((p) => { p.inductive[i].qty = num(ev.target.value); })} />
                        </td>
                        <td>
                          <input className="cell-in" data-r={i} data-c={2} aria-label="Puissance unitaire" value={e.unitPower}
                            onChange={(ev) => mutateProfile((p) => { p.inductive[i].unitPower = num(ev.target.value); })} />
                        </td>
                        <td>
                          <input className="cell-in" data-r={i} data-c={3} aria-label="Rendement" value={fmt(e.yield, 2)}
                            onChange={(ev) => mutateProfile((p) => { p.inductive[i].yield = num(ev.target.value); })} />
                        </td>
                        <td>
                          <input className="cell-in" data-r={i} data-c={4} aria-label="Coefficient de démarrage" value={fmt(e.startupCoef, 1)}
                            onChange={(ev) => mutateProfile((p) => { p.inductive[i].startupCoef = num(ev.target.value); })} />
                        </td>
                        <td>
                          <input className="cell-in" data-r={i} data-c={5} aria-label="Heures d'usage" value={e.opHours}
                            onChange={(ev) => mutateProfile((p) => { p.inductive[i].opHours = num(ev.target.value); })} />
                        </td>
                        <td className="derived num">—</td>
                        <td className="derived num">—</td>
                        <td className="derived num">—</td>
                        <td>
                          <button className="rowdel" title="Supprimer la ligne"
                            onClick={() => mutateProfile((p) => { p.inductive.splice(i, 1); })}>
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={6}>Sous-total inductifs</td>
                    <td className="num">—</td>
                    <td className="num">—</td>
                    <td className="num">—</td>
                    <td />
                  </tr>
                  <tr>
                    <td colSpan={6}>Total besoins</td>
                    <td className="num">—</td>
                    <td className="num">—</td>
                    <td className="num">—</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
              <div className="addrow">
                <button
                  className="btn"
                  onClick={addInductive}
                >
                  + Ajouter une ligne
                </button>
                <span className="sep" />
                <button
                  className="btn"
                  onClick={() =>
                    notify({
                      kind: 'info',
                      title: 'Ajustement des heures',
                      detail: 'Répartition des heures d’usage sur la journée — à venir.',
                    })
                  }
                >
                  Ajuster les heures…
                </button>
              </div>
            </div>
          </section>
        </div>
      )}

      {profile.source === 'hourly' && (
        <section>
          <div className="tbl-title">
            <h2 className="h-sec">Profil horaire saisi</h2>
            <span className="label">puissance nominale, kW · 24 valeurs</span>
            <span className="sep" />
            <button className="btn" onClick={() => notify({ kind: 'info', title: 'Édition en masse', detail: 'Appliquer une valeur de telle heure à telle heure — à venir.' })}>
              Édition en masse…
            </button>
            <button className="btn" onClick={() => notify({ kind: 'info', title: 'Import Excel', detail: 'Import et export du profil horaire — à venir.' })}>
              Importer
            </button>
          </div>
          {[0, 12].map((offset) => (
            <div className="hourgrid" key={offset} style={{ marginBottom: 'var(--sp-3)' }}>
              {profile.hourly.slice(offset, offset + 12).map((h) => (
                <div key={h.hour}>
                  <span>{String(h.hour).padStart(2, '0')}</span>
                  <input
                    className="cell-in"
                    aria-label={`Puissance à ${h.hour} h`}
                    value={fmt(h.realPower, 2)}
                    onChange={(ev) =>
                      mutateProfile((p) => { p.hourly[h.hour].realPower = num(ev.target.value); })
                    }
                  />
                </div>
              ))}
            </div>
          ))}
          <CapabilityNotice capability="sizing" state={calculation} compact />
        </section>
      )}

      {profile.source === 'meter' && profile.meter && (
        <section>
          <div className="tbl-title">
            <h2 className="h-sec">Estimation depuis la facture d'électricité</h2>
          </div>
          <div className="form-rows">
            <label>
              <span>Énergie mensuelle</span>
              <span className="uf">
                <input value={profile.meter.monthlyEnergy}
                  onChange={(e) => mutateProfile((p) => { p.meter!.monthlyEnergy = num(e.target.value); })} />
                <span className="uf-unit">kWh</span>
              </span>
            </label>
            <label>
              <span>Ampérage du compteur</span>
              <span className="uf">
                <input value={profile.meter.meterAmperage}
                  onChange={(e) => mutateProfile((p) => { p.meter!.meterAmperage = num(e.target.value); })} />
                <span className="uf-unit">A</span>
              </span>
            </label>
            <label>
              <span>Type de réseau</span>
              <select
                value={profile.meter.networkType}
                onChange={(e) =>
                  mutateProfile((p) => {
                    p.meter!.networkType = e.target.value as 'single_phase' | 'three_phase';
                  })
                }
              >
                <option value="single_phase">Monophasé</option>
                <option value="three_phase">Triphasé</option>
              </select>
            </label>
            <label>
              <span>Pointe du matin</span>
              <span className="rf">
                <input value={profile.meter.morningPeakStart}
                  onChange={(e) => mutateProfile((p) => { p.meter!.morningPeakStart = e.target.value; })} />
                <span className="rf-sep" aria-hidden="true">→</span>
                <input value={profile.meter.morningPeakEnd}
                  onChange={(e) => mutateProfile((p) => { p.meter!.morningPeakEnd = e.target.value; })} />
              </span>
            </label>
            <label>
              <span>Pointe du soir</span>
              <span className="rf">
                <input value={profile.meter.eveningPeakStart}
                  onChange={(e) => mutateProfile((p) => { p.meter!.eveningPeakStart = e.target.value; })} />
                <span className="rf-sep" aria-hidden="true">→</span>
                <input value={profile.meter.eveningPeakEnd}
                  onChange={(e) => mutateProfile((p) => { p.meter!.eveningPeakEnd = e.target.value; })} />
              </span>
            </label>
            <label>
              <span>Importance de la pointe</span>
              <input value={fmt(profile.meter.peakImportance, 2)}
                onChange={(e) => mutateProfile((p) => { p.meter!.peakImportance = num(e.target.value); })} />
            </label>
            <label>
              <span>Facteur de qualité cible</span>
              <input value={fmt(profile.meter.targetQualityFactor, 2)}
                onChange={(e) => mutateProfile((p) => { p.meter!.targetQualityFactor = num(e.target.value); })} />
            </label>
          </div>
        </section>
      )}

      {showGranularity && (
        <div className="scrim" onClick={() => setShowGranularity(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <header>Granularité des profils</header>
            <div className="body">
              <div className="proj-list">
                {GRANULARITIES.map((g) => (
                  <button
                    key={g.key}
                    className="proj-row"
                    onClick={() => {
                      update((d) => { d.load.granularity = g.key; });
                      setShowGranularity(false);
                      notify({ kind: 'success', title: `Granularité : ${g.label}` });
                    }}
                  >
                    <span>
                      <b>{g.label}</b>
                      <small>{g.hint}</small>
                    </span>
                    <span className="when">{g.n}</span>
                    <span className="badge">
                      {project.load.granularity === g.key ? 'actif' : ''}
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <footer>
              <button className="btn btn-ghost" onClick={() => setShowGranularity(false)}>
                Fermer
              </button>
            </footer>
          </div>
        </div>
      )}

      {profile.source === 'equipments' && (
        <CapabilityNotice capability="sizing" state={calculation} compact />
      )}

    </div>
  );
}
