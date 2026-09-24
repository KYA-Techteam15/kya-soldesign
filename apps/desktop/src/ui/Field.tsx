import { useState, type ReactNode } from 'react';
import { Prov } from './Prov';
import { DecimalInput } from './DecimalInput';

export const parseNum = (v: string): number => {
  const parsed = Number.parseFloat(v.replace(',', '.').replace(/\s/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

/**
 * Champ numérique étiqueté. Le libellé est au-dessus, et l'unité est accolée
 * à droite de la saisie dans son propre caisson — jamais mêlée à la valeur.
 *
 * `action` pose un geste dans le champ lui-même, à droite de l'unité. Le
 * logiciel a un bouton d'optimum par angle (`optimal_tilt_button`,
 * `optimal_azimuth_button`) : rangés dans une case voisine intitulée
 * « Valeurs optimales », ils ne disaient plus de quel angle ils parlaient.
 */
export function NumField({
  label,
  unit,
  value,
  onChange,
  decimals = 0,
  action,
}: {
  label: string;
  unit?: string;
  value: number;
  onChange: (v: number) => void;
  decimals?: number;
  action?: { icon: string; title: string; onClick: () => void; disabled?: boolean };
}) {
  const input = (
    <input
      value={decimals ? value.toFixed(decimals).replace('.', ',') : String(value)}
      onChange={(e) => onChange(parseNum(e.target.value))}
    />
  );
  const act = action && (
    <button
      type="button"
      className="uf-act"
      title={action.title}
      aria-label={action.title}
      disabled={action.disabled}
      onClick={action.onClick}
    >
      {action.icon}
    </button>
  );
  return (
    <label>
      <span>{label}</span>
      {unit || action ? (
        <span className="uf">
          {input}
          {unit && <span className="uf-unit">{unit}</span>}
          {act}
        </span>
      ) : (
        input
      )}
    </label>
  );
}

export function TextField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label>
      <span>{label}</span>
      <input
        style={{ textAlign: 'left', fontFamily: 'var(--font-sans)' }}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}

/**
 * Champ de lecture : même gabarit qu'une saisie, mais sans la promesse d'en
 * être une. Le logiciel déduit le pays du code de la localité et l'irradiation
 * du TMY ; les afficher dans une bordure blanche invitait à écrire par-dessus.
 *
 * `stale` porte le cas que le moteur Python signale par un profil vide : la
 * valeur existe mais ne correspond plus aux paramètres courants. « 0,00 » se
 * lisait comme un site sans soleil ; on dit plutôt qu'il faut recalculer.
 */
export function ReadField({
  label,
  value,
  unit,
  note,
  stale = false,
  prov,
}: {
  label: string;
  value: string;
  unit?: string;
  note?: string;
  stale?: boolean;
  prov?: { title: string; formula?: string; rows: [string, string][]; source?: string };
}) {
  const body = (
    <span className={`ro-val ${stale ? 'is-stale' : ''}`}>
      <b>{value}</b>
      {unit && <span className="unit">{unit}</span>}
    </span>
  );
  return (
    <div className="ro-field">
      <span className="ro-lbl">{label}</span>
      <span className="ro-box">
        {prov ? (
          <Prov title={prov.title} formula={prov.formula} rows={prov.rows} source={prov.source}>
            {body}
          </Prov>
        ) : (
          body
        )}
      </span>
      {note && <span className="ro-note">{note}</span>}
    </div>
  );
}

export function SelectField({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label>
      <span>{label}</span>
      <select
        style={{ textAlign: 'left', fontFamily: 'var(--font-sans)' }}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <div className="tbl-title">
        <h2 className="h-sec">{title}</h2>
      </div>
      <div className="form-rows">{children}</div>
    </section>
  );
}

/**
 * Groupe repliable. Trente paramètres affichés d'un bloc se lisent comme un
 * mur ; ouverts un à la fois, ils redeviennent consultables. Rien n'est
 * retiré — tout est différé.
 */
export function Fold({
  title,
  hint,
  open: initial = false,
  children,
}: {
  title: string;
  hint?: string;
  open?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(initial);
  return (
    <section className={`fold ${open ? 'on' : ''}`}>
      <button
        className="fold-head"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="fold-title">{title}</span>
        {hint && <span className="label">{hint}</span>}
        <span className="sep" />
        <span className="fold-chev" aria-hidden="true">
          ⌄
        </span>
      </button>
      {open && <div className="fold-body">{children}</div>}
    </section>
  );
}

/**
 * Champ numérique à brouillon (virgule décimale, validation à la sortie), avec
 * unité et action optionnelle. À préférer à `NumField` pour toute nouvelle saisie.
 */
export function DecimalField({ label, unit, value, onCommit, decimals = 0, min, max, ariaLabel, note }: {
  label: string;
  unit?: string;
  value: number;
  onCommit: (v: number) => void;
  decimals?: number;
  min?: number;
  max?: number;
  ariaLabel?: string;
  note?: ReactNode;
}) {
  return (
    <label>
      {label && <span>{label}</span>}
      <span className="uf">
        <DecimalInput value={value} decimals={decimals} {...(min === undefined ? {} : { min })} {...(max === undefined ? {} : { max })} aria-label={ariaLabel ?? label} onCommit={(next) => { if (next !== null) onCommit(next); }} />
        {unit && <span className="uf-unit">{unit}</span>}
      </span>
      {note}
    </label>
  );
}
