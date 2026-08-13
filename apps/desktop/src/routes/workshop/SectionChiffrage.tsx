import { useState } from 'react';
import { useProject } from './Stub';
import { useProjects } from '../../store/project';
import { engine } from '../../engine';
import { fmt, signed } from '../../domain/format';
import { NumField } from '../../ui/Field';
import { StepHead } from '../../ui/Flow';
import { Prov } from '../../ui/Prov';
import { Dialog } from '../../ui/Dialog';
import type { Project } from '../../domain/types';

/**
 * Les cinq postes annexes, décrits une fois.
 *
 * Chacun porte un prix et une marge dans le modèle — `cabling_price` et
 * `cabling_profit_margin_percent` côté Python. Nos champs n'exposaient que le
 * prix : le tableau affichait « 30 % » sur des lignes dont personne ne pouvait
 * toucher la marge.
 */
const ACCESSORIES = [
  { key: 'cabling', label: 'Câblage' },
  { key: 'electricalBox', label: 'Coffret électrique' },
  { key: 'supports', label: 'Supports' },
  { key: 'transport', label: 'Transport' },
  { key: 'installation', label: 'Installation' },
] as const;

/**
 * Un prix qui vient d'ailleurs.
 *
 * `_create_main_equipments_section` porte en clair la mention « (Prices defined
 * at pre-sizing) » : les prix du matériel principal y sont des `DSLabel` en
 * lecture seule, et seule la marge est un spinbox. Nos six champs alignaient
 * prix et marge sur un pied d'égalité, ce qui laissait croire que le prix se
 * décidait ici.
 */
function MainCost({
  role,
  quantity,
  unitPrice,
  margin,
  onMargin,
  onPrice,
}: {
  role: string;
  quantity: number;
  unitPrice: number;
  margin: number;
  onMargin: (v: number) => void;
  onPrice: (v: number) => void;
}) {
  return (
    <div className="costrow">
      <span className="costrow-role">{role}</span>
      <span className="costrow-qty">
        <b>{fmt(quantity)}</b>
        <span className="unit">u</span>
      </span>
      {/* Les libellés sont en en-tête de colonne : répétés sur chaque rangée,
          ils coûtaient une ligne de hauteur par famille pour redire la même
          chose trois fois. */}
      <div className="costrow-fld">
        <NumField label="" unit="FCFA" value={unitPrice} onChange={onPrice} />
      </div>
      <div className="costrow-fld">
        <NumField label="" unit="%" value={margin} onChange={onMargin} decimals={1} />
      </div>
      <span className="costrow-total">
        <b>{fmt(quantity * unitPrice * (1 + margin / 100))}</b>
        <span className="unit">FCFA</span>
      </span>
    </div>
  );
}

/** Une valeur produite par le calcul — même gabarit qu'au prédimensionnement. */
function Out({
  label,
  value,
  unit,
  note,
  lead = false,
  pending = false,
}: {
  label: string;
  value: string;
  unit?: string;
  note?: string;
  lead?: boolean;
  /** Rien à chiffrer : un zéro se lirait comme un montant établi. */
  pending?: boolean;
}) {
  if (pending) {
    return (
      <div className={`out-cell ${lead ? 'is-lead' : ''} is-pending`}>
        <span className="out-lbl">{label}</span>
        <span className="out-val">
          <b>—</b>
        </span>
      </div>
    );
  }
  return (
    <div className={`out-cell ${lead ? 'is-lead' : ''}`}>
      <span className="out-lbl">{label}</span>
      <span className="out-val">
        <b>{value}</b>
        {unit && <span className="unit">{unit}</span>}
      </span>
      {note && <span className="out-note">{note}</span>}
    </div>
  );
}

export function SectionChiffrage() {
  const project: Project = useProject();
  const update = useProjects((s) => s.update);
  const c = engine.costing(project);
  const life = engine.lifecycle(project);
  const z = engine.size(project);
  /* Le LCOE de cette page porte sur le système réellement dimensionné dès que
     `verify` répond : mêmes prix, mais la production du matériel monté, pas
     celle du plancher théorique. Le prédimensionnement sert de repère. */
  const verify = engine.verify(project);
  const pre = engine.presize(project);
  const k = project.costing;

  const [showLife, setShowLife] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  const years = project.assumptions.projectLifetime;

  /* Ce que coûte réellement l'installation sur son horizon : l'investissement,
     plus l'entretien annuel, plus les remplacements de batteries et
     d'onduleurs. C'est `total_lifecycle_cost` du service Python.

     On affichait ici une « économie » obtenue en retranchant ce total d'un
     prétendu cycle de vie diesel. Or `compute_diesel_equivalent` ne renvoie
     qu'un coût d'**investissement** — `puissance × 300 000 FCFA/kW` — sans
     carburant ni entretien. Les deux grandeurs n'étaient pas comparables, et
     leur différence n'avait aucun sens. */
  const postCommissioningCost = Math.max(0, life.totalLifecycleCost - c.totalTtc);

  const set = (key: keyof typeof k) => (v: number) =>
    update((p) => {
      (p.costing[key] as number) = v;
    });

  /* Il n'y a de chiffrage que s'il y a du matériel à chiffrer. Sur un dossier
     sans dimensionnement, les quantités sont nulles et tous les totaux valent
     zéro — un devis à 0 FCFA n'est pas un devis. */
  const quantities =
    (z.pvArray?.count ?? 0) + (z.bank?.count ?? 0) + (z.inverters?.count ?? 0);
  const priced = quantities > 0 && c.totalCost > 0;

  return (
    <div className="sheet">
      <StepHead
        slug="chiffrage"
        aside={
          <button className="btn" onClick={() => setShowTerms(true)}>
            Conditions commerciales…
          </button>
        }
      />

      {/* Ce qui est chiffré vient du dimensionnement : les quantités ne se
          saisissent pas ici, elles se constatent. Même bande qu'à l'étape 5. */}
      <section className="targets">
        <span className="targets-tag">quantités</span>
        {quantities === 0 ? (
          <span className="tgt-lbl">
            Aucun matériel dimensionné — les lignes de chiffrage restent vides.
          </span>
        ) : (
          <>
            <div className="tgt">
              <span className="tgt-lbl">Modules</span>
              <span className="tgt-val">
                <b>{fmt(z.pvArray?.count ?? 0)}</b>
                <span className="unit">u</span>
              </span>
            </div>
            <div className="tgt">
              <span className="tgt-lbl">Batteries</span>
              <span className="tgt-val">
                <b>{fmt(z.bank?.count ?? 0)}</b>
                <span className="unit">u</span>
              </span>
            </div>
            <div className="tgt">
              <span className="tgt-lbl">Onduleurs</span>
              <span className="tgt-val">
                <b>{fmt(z.inverters?.count ?? 0)}</b>
                <span className="unit">u</span>
              </span>
            </div>
          </>
        )}
        <span className="sep" style={{ flex: 1 }} />
        <span className={`tgt-got ${quantities > 0 ? 'ok' : ''}`}>
          {quantities > 0 ? 'issues du dimensionnement' : 'étape 5'}
        </span>
      </section>

      {/* ------------------------------------------------------- Le matériel */}
      <section>
        <div className="tbl-title">
          <h2 className="h-sec">Matériel principal</h2>
          <span className="sep" />
          <span className="label">prix unitaires · marge par famille</span>
        </div>
        <div className="costlist">
          <div className="costhead">
            <span />
            <span>Qté</span>
            <span>Prix de revient unitaire</span>
            <span>Marge</span>
            <span className="ta-r">Total vente</span>
          </div>
          <MainCost
            role="Modules"
            quantity={z.pvArray?.count ?? 0}
            unitPrice={k.moduleUnitPrice}
            margin={k.moduleMargin}
            onPrice={set('moduleUnitPrice')}
            onMargin={set('moduleMargin')}
          />
          <MainCost
            role="Batteries"
            quantity={z.bank?.count ?? 0}
            unitPrice={k.batteryUnitPrice}
            margin={k.batteryMargin}
            onPrice={set('batteryUnitPrice')}
            onMargin={set('batteryMargin')}
          />
          <MainCost
            role="Onduleurs"
            quantity={z.inverters?.count ?? 0}
            unitPrice={k.inverterUnitPrice}
            margin={k.inverterMargin}
            onPrice={set('inverterUnitPrice')}
            onMargin={set('inverterMargin')}
          />
        </div>
      </section>

      {/* ------------------------------------------------------- Les annexes */}
      <section>
        <div className="tbl-title">
          <h2 className="h-sec">Autres frais</h2>
          <span className="sep" />
          <span className="label">
            {k.definedCostForAccessories ? 'en valeur' : 'en % du matériel principal'}
          </span>
          <button
            className="btn"
            onClick={() =>
              update((p) => {
                p.costing.definedCostForAccessories = !p.costing.definedCostForAccessories;
              })
            }
          >
            Basculer
          </button>
        </div>
        {/* Prix et marge côte à côte : le modèle porte les deux, l'interface
            n'en montrait qu'un. */}
        <div className="acclist">
          {ACCESSORIES.map((a) => {
            const priceKey = `${a.key}Price` as keyof typeof k;
            const marginKey = `${a.key}Margin` as keyof typeof k;
            return (
              /* Cinq postes × deux champs : en rangées cadrées, chacun payait
                 une bordure et 48 px de hauteur pour deux nombres. La grille
                 les met côte à côte, coût et marge accolés sous le nom. */
              <div className="accitem" key={a.key}>
                <span className="accitem-lbl">{a.label}</span>
                <div className="accitem-pair">
                  <div className="accrow-fld">
                    <NumField
                      label=""
                      unit={k.definedCostForAccessories ? 'FCFA' : '%'}
                      value={k[priceKey] as number}
                      onChange={set(priceKey)}
                      decimals={k.definedCostForAccessories ? 0 : 1}
                    />
                  </div>
                  <div className="accrow-fld accrow-fld-m">
                    <NumField
                      label=""
                      unit="%"
                      value={k[marginKey] as number}
                      onChange={set(marginKey)}
                      decimals={1}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ------------------------------------------------------- Le résultat */}
      <section className="out">
        <div className="out-head">
          <span className="out-tag">{priced ? 'calculé' : 'en attente'}</span>
          <h2 className="h-sec">Prix de vente</h2>
          <span className="sep" />
          {!priced && (
            <span className="label">
              {quantities === 0
                ? 'aucun matériel dimensionné'
                : 'aucun prix de revient saisi'}
            </span>
          )}
          <button className="btn" onClick={() => setShowDetail(true)}>
            Détail par poste
          </button>
        </div>
        {/* Un seul rang, quatre colonnes. Six colonnes égales rognaient les
            montants en FCFA — critère B5, aucune valeur coupée. Le revient et
            l'acompte passent en note des valeurs qu'ils composent. */}
        <div className="out-grid out-grid-4">
          <Out label="Total TTC" value={fmt(c.totalTtc)} unit="FCFA" lead pending={!priced} />
          <Out
            label="Vente HT"
            value={fmt(c.totalSaleHt)}
            unit="FCFA"
            note={`revient ${fmt(c.totalCost)} · marge ${fmt(c.averageMarginPercent, 1)} %`}
            pending={!priced}
          />
          <Out
            label={`TVA ${fmt(k.tvaPercent)} %`}
            value={fmt(c.tvaAmount)}
            unit="FCFA"
            note={
              k.reductionPercent > 0
                ? `après remise ${fmt(c.discount)}`
                : `acompte ${fmt(c.downPayment)}`
            }
            pending={!priced}
          />
          <Out
            label="Prix du Wc"
            value={fmt(c.wattPeakPrice)}
            unit="FCFA/Wc"
            note={`sur ${fmt(c.totalPowerWc)} Wc installés`}
            pending={!priced}
          />
        </div>

        {/* Le cycle de vie répond à la seule question que le chiffrage pose
            vraiment : par rapport au groupe électrogène, on gagne quoi ? Il
            tenait dans un bandeau à part, qui coûtait sa bordure et sa marge
            pour une phrase et un nombre. Il devient le pied du résultat. */}
        {priced && (
        <div className="out-foot">
          <span className="out-foot-say">
            Coût sur {years} ans · entretien et remplacements compris ·{' '}
            {verify ? 'sur le système dimensionné' : 'sur le système minimal'}
          </span>
          <span className="out-foot-net">
            <b>{fmt(life.totalLifecycleCost / 1e6, 1)}</b>
            <span className="unit">MFCFA</span>
            <span className="mut">
              dont {fmt(postCommissioningCost / 1e6, 1)} après la mise en service
            </span>
          </span>
          <button className="btn" onClick={() => setShowLife(true)}>
            Coût sur {years} ans…
          </button>
        </div>
        )}
      </section>

      {showDetail && (
        <Dialog
          title="Détail par poste"
          lead={`${c.lines.length} postes · prix de revient et vente`}
          wide
          onClose={() => setShowDetail(false)}
        >
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Poste</th>
                  <th>Qté</th>
                  <th>Prix de revient unit.</th>
                  <th>Marge<span className="unit">%</span></th>
                  <th className="derived">Total revient</th>
                  <th className="derived">Total vente</th>
                </tr>
              </thead>
              <tbody>
                {c.lines.map((l) => (
                  <tr key={l.key}>
                    <td>{l.label}</td>
                    <td className="num">{fmt(l.quantity)}</td>
                    <td className="num">{fmt(l.unitCost)}</td>
                    <td className="num">{fmt(l.marginPercent)}</td>
                    <td className="derived num">{fmt(l.totalCost)}</td>
                    <td className="derived num">{fmt(l.totalSale)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}>Prix de revient</td>
                  <td className="num">{fmt(c.totalCost)}</td>
                  <td className="num" />
                </tr>
                <tr>
                  <td colSpan={4}>
                    Vente HT · bénéfice {fmt(c.profit)} ({fmt(c.averageMarginPercent, 1)} %)
                  </td>
                  <td className="num" />
                  <td className="num">{fmt(c.totalSaleHt)}</td>
                </tr>
                <tr>
                  <td colSpan={4}>TVA {fmt(k.tvaPercent)} %</td>
                  <td className="num" />
                  <td className="num">{fmt(c.tvaAmount)}</td>
                </tr>
                <tr>
                  <td colSpan={4}>Total TTC</td>
                  <td className="num" />
                  <td className="num">
                    <Prov
                      title="Composition du prix"
                      rows={[
                        ['Prix de revient', fmt(c.totalCost)],
                        ['Bénéfice', fmt(c.profit)],
                        ['Vente HT', fmt(c.totalSaleHt)],
                        [`TVA ${fmt(k.tvaPercent)} %`, fmt(c.tvaAmount)],
                        [`Acompte ${fmt(k.downPaymentPercent)} %`, fmt(c.downPayment)],
                        ['Solde', fmt(c.balanceDue)],
                      ]}
                      source={`Chiffrage · ${c.lines.length} postes`}
                    >
                      <b>{fmt(c.totalTtc)}</b>
                    </Prov>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Dialog>
      )}

      {showTerms && (
        <Dialog
          title="Conditions commerciales"
          lead="taxes, remise et engagements de l’offre"
          wide
          onClose={() => setShowTerms(false)}
          footer={
            <button className="btn-primary" onClick={() => setShowTerms(false)}>
              Fermer
            </button>
          }
        >
          <div className="form-rows">
            <NumField label="TVA" unit="%" value={k.tvaPercent} onChange={set('tvaPercent')} decimals={1} />
            <NumField label="Remise" unit="%" value={k.reductionPercent} onChange={set('reductionPercent')} decimals={1} />
            <NumField label="Acompte à la commande" unit="%" value={k.downPaymentPercent} onChange={set('downPaymentPercent')} decimals={1} />
            <NumField label="Délai de livraison" unit="jours" value={k.deliveryTime} onChange={set('deliveryTime')} />
            <NumField label="Validité de l’offre" unit="jours" value={k.offerValidity} onChange={set('offerValidity')} />
            <NumField label="Garantie" unit="mois" value={k.productWarranty} onChange={set('productWarranty')} />
          </div>
        </Dialog>
      )}

      {showLife && (
        <Dialog
          title={`Coût sur ${years} ans`}
          lead={`${
            verify
              ? 'sur le système dimensionné'
              : 'estimation sur le système minimal'
          } · actualisé à ${fmt(project.assumptions.actualizationRate, 1)} %`}
          wide
          onClose={() => setShowLife(false)}
        >
          <div className="kpis" style={{ marginBottom: 0 }}>
            {/* L'ordre suit le raisonnement : ce qu'on paie, puis ce que ça
                ramène le kWh, puis ce que ça évite. */}
            <div className="kpi kpi-head"><span className="h-sec">Ce qui sera dépensé</span></div>
            <div className="kpi"><span>Investissement initial (TTC)</span><span><b>{fmt(c.totalTtc)}</b><span className="unit">FCFA</span></span></div>
            <div className="kpi"><span>Entretien annuel</span><span><b>{fmt(life.annualMaintenanceCost)}</b><span className="unit">FCFA/an</span></span></div>
            <div className="kpi"><span>Remplacements sur la période</span><span><b>{fmt(life.totalReplacementCost)}</b><span className="unit">FCFA</span></span></div>
            <div className="kpi"><span>Coût total sur {years} ans</span><span><b>{fmt(life.totalLifecycleCost)}</b><span className="unit">FCFA</span></span></div>

            <div className="kpi kpi-head"><span className="h-sec">Ce que revient le kWh</span></div>
            {/* Deux valeurs, jamais trois : le théorique vient du
                prédimensionnement (coûts spécifiques des hypothèses), le réel
                des prix saisis ici appliqués au matériel dimensionné. */}
            <div className="kpi">
              <span>LCOE actualisé</span>
              <span>
                <b>{fmt(life.lcoeActualized)}</b>
                <span className="unit">FCFA/kWh</span>
                {verify && pre.lcoeActualized > 0 && (
                  <span className="delta">
                    prédimensionné {fmt(pre.lcoeActualized)} ·{' '}
                    {signed(
                      ((life.lcoeActualized - pre.lcoeActualized) /
                        pre.lcoeActualized) *
                        100,
                    )}{' '}
                    %
                  </span>
                )}
              </span>
            </div>
            {/* Le SVI découle du LCOE : le montrer ici évite d'aller le
                rechercher dans le bandeau pour comprendre ce que le prix
                réel change à la viabilité. */}
            <div className="kpi">
              <span>SVI · rapport au tarif réseau</span>
              <span>
                <b>
                  {fmt(
                    life.lcoeActualized / (project.assumptions.lcoeGrid || 1),
                    2,
                  )}
                </b>
                {verify && pre.svi > 0 && (
                  <span className="delta">prédimensionné {fmt(pre.svi, 2)}</span>
                )}
              </span>
            </div>
            <div className="kpi"><span>Prix du Wc</span><span><b>{fmt(c.wattPeakPrice)}</b><span className="unit">FCFA/Wc</span></span></div>

            <div className="kpi kpi-head"><span className="h-sec">Ce qui est évité</span></div>
            {/* `compute_diesel_equivalent` : `puissance × ci_dg`. C'est le prix
                d'achat d'un groupe de puissance comparable, hors carburant et
                hors entretien — un ordre de grandeur d'investissement, pas un
                coût d'exploitation. Le dire évite de le comparer par erreur au
                coût sur 25 ans juste au-dessus. */}
            <div className="kpi">
              <span>Groupe électrogène de puissance comparable</span>
              <span>
                <b>{fmt(life.dieselEquivalentCost)}</b>
                <span className="unit">FCFA</span>
                <span className="delta">à l’achat, hors carburant</span>
              </span>
            </div>
            <div className="kpi"><span>CO₂ évité</span><span><b>{fmt(life.co2AvoidedKg)}</b><span className="unit">kg</span></span></div>
            <div className="kpi"><span>Équivalent arbres</span><span><b>{fmt(life.co2AvoidedTrees)}</b></span></div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
