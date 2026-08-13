import { engine } from '../../engine';
import { dateFr, fmt } from '../../domain/format';
import type { Project } from '../../domain/types';

export type DocKind = 'rapport' | 'offre' | 'proforma' | 'dossier_exec';

const TITLES: Record<DocKind, { pre: string; strong: string; sub: string }> = {
  rapport: {
    pre: 'Rapport ',
    strong: 'technique & commercial',
    sub: 'Installation solaire photovoltaïque autonome',
  },
  offre: {
    pre: 'Offre ',
    strong: 'technique',
    sub: 'Document interne — non destiné au client',
  },
  proforma: {
    pre: 'Facture ',
    strong: 'proforma',
    sub: 'Valable 30 jours à compter de la date d’édition',
  },
  dossier_exec: {
    pre: 'Dossier ',
    strong: 'd’exécution',
    sub: 'Édition KYA — plans et nomenclature de pose',
  },
};

/**
 * Le livrable imprimé. C'est le seul objet que verra le client final : c'est ici,
 * et seulement ici, que la marque est forte (critère C6). Conçu pour l'impression
 * A4 (critère D4) — `@media print` dans `print.css`.
 */
export function ReportA4({ project, kind }: { project: Project; kind: DocKind }) {
  const v = engine.verdict(project);
  const z = engine.size(project);
  const c = engine.costing(project);
  const life = engine.lifecycle(project);
  const balance = engine.loadBalance(project);
  const t = TITLES[kind];
  const d = project.details;

  const groups = [
    { label: 'Éclairage', match: /clairage/i },
    { label: 'Chaîne du froid', match: /frigo|réfrigérat|congélat/i },
    { label: 'Équipements médicaux', match: /oxyg|autoclave|microscope|centrifug/i },
    { label: 'Confort thermique', match: /ventilat|clim/i },
    { label: 'Bureautique et liaison', match: /ordinat|imprim|routeur|vsat|télévis|chargeur/i },
    { label: 'Pompage', match: /pompe/i },
  ];
  const allLines = [...balance.classic, ...balance.inductive];
  const grouped = groups
    .map((g) => {
      const lines = allLines.filter((l) => g.match.test(l.name));
      return {
        label: g.label,
        count: lines.reduce((n, l) => n + l.qty, 0),
        real: lines.reduce((s, l) => s + l.realPower, 0),
        energy: lines.reduce((s, l) => s + l.energy, 0),
      };
    })
    .filter((g) => g.count > 0);
  const ungrouped = allLines.filter((l) => !groups.some((g) => g.match.test(l.name)));
  if (ungrouped.length > 0) {
    grouped.push({
      label: 'Autres postes',
      count: ungrouped.reduce((n, l) => n + l.qty, 0),
      real: ungrouped.reduce((s, l) => s + l.realPower, 0),
      energy: ungrouped.reduce((s, l) => s + l.energy, 0),
    });
  }

  return (
    <div className="a4-stack">
      {/* ============================ PAGE 1 ============================ */}
      <article className="a4">
        <div className="a4-brand">
          <div className="a4-logo">
            <i />
            KYA<span>-SolDesign</span>
          </div>
          <div className="a4-who">
            Étude réalisée par {d.followerName || '—'}
            <br />
            {d.projectLocation || '—'}
            <br />
            Édité le {dateFr(d.projectDate)}
          </div>
        </div>
        <div className="a4-rule" />

        <h1 className="a4-title">
          {t.pre}
          <b>{t.strong}</b>
        </h1>
        <div className="a4-sub">{t.sub}</div>

        <dl className="a4-meta">
          <div>
            <dt>Client</dt>
            <dd>
              {d.clientName || '—'}
              <small>{d.clientTel || ''}</small>
            </dd>
          </div>
          <div>
            <dt>Projet</dt>
            <dd>
              {project.name}
              <small>n° {d.projectNumber || '—'} · {d.applicationType}</small>
            </dd>
          </div>
          <div>
            <dt>Site</dt>
            <dd>
              {project.site.region || '—'}, {project.site.country || '—'}
              <small>
                {fmt(project.site.latitude, 4)} · {fmt(project.site.longitude, 4)}
              </small>
            </dd>
          </div>
          <div>
            <dt>Ressource solaire</dt>
            <dd>
              {fmt(project.site.irradiation, 2)} kWh/m²/j
              <small>
                inclinaison {fmt(project.site.tilt, 0)}° · azimut {fmt(project.site.azimuth, 0)}°
              </small>
            </dd>
          </div>
        </dl>

        <div className="a4-headline">
          <div>
            <h2>
              Système autonome de {fmt((z.pvArray?.obtainedW ?? 0) / 1000, 2)} kWc et{' '}
              {fmt(v.storageKwh, 0)} kWh de stockage
            </h2>
            <p>
              Couvre {fmt(balance.dailyEnergyWh / 1000, 2)} kWh consommés chaque jour, avec
              une indisponibilité résiduelle de {fmt(v.lpsp, 1)} % du besoin annuel.
            </p>
          </div>
          {/* Sceau neutre : le SVI est un rapport de prix à présenter, pas un
              tampon d'échec. Le rouge rendait indéfendable un dossier qui
              évite pourtant plusieurs tonnes de CO₂. */}
          <div className="a4-seal">
            <b>{fmt(v.svi, 2)}</b>
            <span>
              SVI ·{' '}
              {v.viable
                ? `${fmt((1 - v.svi) * 100, 0)} % sous le réseau`
                : `${fmt((v.svi - 1) * 100, 0)} % au-dessus du réseau`}
            </span>
          </div>
        </div>

        <h3 className="a4-sec">Besoins recensés sur site</h3>
        <table className="a4-tbl">
          <thead>
            <tr>
              <th>Poste</th>
              <th>Appareils</th>
              <th>P. réelle (W)</th>
              <th>Énergie (Wh/j)</th>
              <th>Part</th>
            </tr>
          </thead>
          <tbody>
            {grouped.map((g) => (
              <tr key={g.label}>
                <td>{g.label}</td>
                <td>{g.count}</td>
                <td>{fmt(g.real)}</td>
                <td>{fmt(g.energy)}</td>
                <td>{fmt((g.energy / balance.dailyEnergyWh) * 100, 1)} %</td>
              </tr>
            ))}
            <tr className="total">
              <td>Total</td>
              <td>{fmt(allLines.reduce((n, l) => n + l.qty, 0))}</td>
              <td>{fmt(balance.realPowerW)}</td>
              <td>{fmt(balance.dailyEnergyWh)}</td>
              <td>100 %</td>
            </tr>
            <tr className="sub">
              <td>Puissance de pointe appelée (démarrages inclus)</td>
              <td colSpan={4}>{fmt(balance.peakPowerW)} W</td>
            </tr>
          </tbody>
        </table>

        <h3 className="a4-sec">Système préconisé</h3>
        <table className="a4-tbl">
          <thead>
            <tr>
              <th>Composant</th>
              <th>Référence</th>
              <th>Configuration</th>
              <th>Qté</th>
              <th>Obtenu</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                Modules photovoltaïques
                <small>{z.module?.maker} · {z.module?.module_type}</small>
              </td>
              <td className="ref">{z.module?.code ?? '—'}</td>
              <td>{z.pvArray?.series} S × {z.pvArray?.parallel} P</td>
              <td>{z.pvArray?.count ?? 0}</td>
              <td>{fmt(z.pvArray?.obtainedW ?? 0)} Wc</td>
            </tr>
            <tr>
              <td>
                Parc de batteries
                <small>{z.battery?.maker} · {z.battery?.technology} · DoD {fmt(z.battery?.max_dod ?? 0)} %</small>
              </td>
              <td className="ref">{z.battery?.code ?? '—'}</td>
              <td>{z.bank?.series} S × {z.bank?.parallel} P</td>
              <td>{z.bank?.count ?? 0}</td>
              <td>{fmt(z.bank?.obtainedAh ?? 0)} Ah</td>
            </tr>
            <tr>
              <td>
                Onduleurs hybrides
                <small>{z.inverter?.maker} · {z.inverter?.inverter_type}</small>
              </td>
              <td className="ref">{z.inverter?.code ?? '—'}</td>
              <td>en parallèle</td>
              <td>{z.inverters?.count ?? 0}</td>
              <td>{fmt(z.inverters?.obtainedW ?? 0)} W</td>
            </tr>
            <tr>
              <td>
                Câblage et protections
                <small>3 segments · fusibles gPV et disjoncteurs</small>
              </td>
              <td className="ref">
                {engine.cables(project).map((x) => fmt(x.normalizedSection, 0)).join(' / ')} mm²
              </td>
              <td>{fmt(project.cables.reduce((s, x) => s + x.length, 0))} m</td>
              <td>—</td>
              <td>—</td>
            </tr>
          </tbody>
        </table>

        <h3 className="a4-sec">Performance attendue</h3>
        <dl className="a4-kpis">
          <div>
            <dt>Production annuelle</dt>
            <dd>{fmt(v.annualProductionKwh)}<span className="u">kWh</span></dd>
          </div>
          <div>
            <dt>Coût du kWh produit</dt>
            <dd>{fmt(v.lcoeActualized)}<span className="u">FCFA</span></dd>
          </div>
          <div>
            <dt>Fiabilité SRI</dt>
            <dd>{fmt(v.sri, 2)}<span className="u">/ 1</span></dd>
          </div>
          <div>
            <dt>CO₂ évité sur {fmt(project.assumptions.projectLifetime)} ans</dt>
            <dd>{fmt(v.co2AvoidedKg / 1000)}<span className="u">t</span></dd>
          </div>
        </dl>

        <div className="a4-spacer" />
        <div className="a4-foot">
          <span>KYA-SolDesign · {t.strong} · projet {d.projectNumber || '—'}</span>
          <span>Page 1 / 2</span>
        </div>
      </article>

      {/* ============================ PAGE 2 ============================ */}
      <article className="a4">
        <div className="a4-brand">
          <div className="a4-logo">
            <i />
            KYA<span>-SolDesign</span>
          </div>
          <div className="a4-who">
            Projet {d.projectNumber || '—'} · {project.site.region}
            <br />
            Offre valable {project.costing.offerValidity} jours
          </div>
        </div>
        <div className="a4-rule" />

        <h3 className="a4-sec">Chiffrage</h3>
        <table className="a4-tbl">
          <thead>
            <tr>
              <th>Poste</th>
              <th>Qté</th>
              <th>P.U. (FCFA)</th>
              <th>Montant HT</th>
            </tr>
          </thead>
          <tbody>
            {c.lines.map((l) => (
              <tr key={l.key}>
                <td>{l.label}</td>
                <td>{fmt(l.quantity)}</td>
                <td>{fmt(l.totalSale / Math.max(l.quantity, 1))}</td>
                <td>{fmt(l.totalSale)}</td>
              </tr>
            ))}
            <tr className="total">
              <td colSpan={3}>Total HT</td>
              <td>{fmt(c.totalSaleHt)}</td>
            </tr>
            <tr className="sub">
              <td colSpan={3}>TVA {fmt(project.costing.tvaPercent)} %</td>
              <td>{fmt(c.tvaAmount)}</td>
            </tr>
            <tr className="grand">
              <td colSpan={3}>Total TTC</td>
              <td>{fmt(c.totalTtc)}</td>
            </tr>
            <tr className="sub">
              <td colSpan={3}>
                Acompte à la commande — {fmt(project.costing.downPaymentPercent)} %
              </td>
              <td>{fmt(c.downPayment)}</td>
            </tr>
            <tr className="sub">
              <td colSpan={3}>Solde à la mise en service</td>
              <td>{fmt(c.balanceDue)}</td>
            </tr>
          </tbody>
        </table>

        <h3 className="a4-sec">Ce que l’installation coûtera</h3>
        <dl className="a4-kpis">
          <div>
            <dt>Prix du watt-crête</dt>
            <dd>{fmt(c.wattPeakPrice)}<span className="u">FCFA</span></dd>
          </div>
          <div>
            <dt>Coût sur {fmt(project.assumptions.projectLifetime)} ans</dt>
            <dd>{fmt(life.totalLifecycleCost / 1e6, 1)}<span className="u">MFCFA</span></dd>
          </div>
          <div>
            {/* Entretien et remplacements : ce que le client paiera après la
                facture. C'est l'écart entre `total_lifecycle_cost` et
                l'investissement initial. */}
            <dt>Après la mise en service</dt>
            <dd>
              {fmt((life.totalLifecycleCost - c.totalTtc) / 1e6, 1)}
              <span className="u">MFCFA</span>
            </dd>
          </div>
          <div>
            {/* `compute_diesel_equivalent` ne chiffre qu'un prix d'achat, hors
                carburant. La ligne « économie sur la durée de vie » qui le
                retranchait du cycle de vie solaire comparait un investissement
                à un coût d'exploitation : elle a été retirée. */}
            <dt>Groupe électrogène comparable, à l’achat</dt>
            <dd>{fmt(life.dieselEquivalentCost / 1e6, 1)}<span className="u">MFCFA</span></dd>
          </div>
        </dl>

        <h3 className="a4-sec">Conditions et hypothèses</h3>
        <div className="a4-cond">
          <p><b>Validité de l’offre :</b> {project.costing.offerValidity} jours à compter du {dateFr(d.projectDate)}.</p>
          <p><b>Délai de livraison :</b> {project.costing.deliveryTime} jours après réception de l’acompte.</p>
          <p><b>Garantie :</b> {project.costing.productWarranty} mois sur l’ensemble de l’installation.</p>
          <p>
            <b>Durées de vie retenues :</b> {fmt(project.assumptions.pvLifetime)} ans pour les
            modules, {fmt(project.assumptions.batteryLifetime)} ans pour les batteries,{' '}
            {fmt(project.assumptions.inverterLifetime)} ans pour les onduleurs.
          </p>
          <p>
            <b>Hypothèses de calcul :</b> performance ratio {fmt(project.assumptions.systemPr)} %,
            rendement onduleur {fmt(project.assumptions.inverterYield)} %, rendement batterie{' '}
            {fmt(project.assumptions.batteryYield)} %, profondeur de décharge{' '}
            {fmt(project.assumptions.batteryDod)} %, taux d’actualisation{' '}
            {fmt(project.assumptions.actualizationRate)} %.
          </p>
          <p>
            <b>Référence de comparaison :</b> tarif réseau de {fmt(project.assumptions.lcoeGrid)}{' '}
            FCFA/kWh, facteur d’émission {fmt(project.assumptions.emissionFactor, 2)} kgCO₂/kWh.
          </p>
        </div>

        <div className="a4-sign">
          <div>Pour KYA-SolDesign — {d.followerName || '—'}</div>
          <div>Pour le client — lu et approuvé, cachet et signature</div>
        </div>

        <div className="a4-spacer" />
        <div className="a4-foot">
          <span>
            Dimensionnement établi selon la méthode SRI / SVI · toutes les hypothèses sont
            reprises ci-dessus
          </span>
          <span>Page 2 / 2</span>
        </div>
      </article>
    </div>
  );
}
