import type { DiagramOptions, InverterUnitSpec, PvFieldSummary, Point } from '../contracts.js';
import { SYMBOL_SIZE, anchorOf } from '../symbols.js';
import { Builder, amps, collapse, num, vh } from './builder.js';
import { LABEL_HEADROOM, PAIR_HALF, STRING_GAP } from './constants.js';
import type { Bands, DcOutlet } from './types.js';

/**
 * Bande « champ photovoltaïque ».
 *
 * En détail complet, une colonne par chaîne. En synoptique, une colonne unique
 * légendée de son total : c'est la seule façon de tenir dans les 178 mm utiles
 * d'une page portrait sans descendre sous le seuil de lisibilité.
 */

const moduleW = SYMBOL_SIZE['pv-module'].width;

/** Largeur occupée par le champ d'un onduleur, mesurée avant tout placement. */
export function measureGroup(unit: InverterUnitSpec, options: DiagramOptions): number {
  const strings = unit.inputs.flatMap((input) => input.strings);
  if (options.detail === 'synoptic') return moduleW;
  const drawn = collapse(strings.length, options.maxDrawnStrings);
  const columns = drawn.head + drawn.tail + (drawn.hidden > 0 ? 1 : 0);
  const breakWidth = drawn.hidden > 0 ? SYMBOL_SIZE['parallel-break'].width : 0;
  return (drawn.head + drawn.tail) * moduleW + breakWidth + (columns - 1) * STRING_GAP;
}

/** Hauteur du champ, imposée par la chaîne la plus longue. */
export function measureFieldHeight(maxModules: number, options: DiagramOptions): number {
  const run = collapse(Math.max(1, maxModules), options.maxDrawnModules);
  return (
    (run.head + run.tail) * SYMBOL_SIZE['pv-module'].height +
    (run.hidden > 0 ? SYMBOL_SIZE['series-break'].height : 0)
  );
}

/** Dessine une colonne de modules et rend les abscisses de ses deux polarités. */
function drawColumn(
  build: Builder,
  columnX: number,
  bands: Bands,
  modules: number,
  options: DiagramOptions,
): { plus: number; minus: number } {
  const run = collapse(modules, options.maxDrawnModules);
  let moduleY = bands.yField;

  for (let index = 0; index < run.head; index += 1) {
    build.place('pv-module', columnX, moduleY, { data: { label: String(index + 1) } });
    moduleY += SYMBOL_SIZE['pv-module'].height;
  }
  if (run.hidden > 0) {
    build.place('series-break', columnX, moduleY, { data: { hidden: run.hidden } });
    moduleY += SYMBOL_SIZE['series-break'].height;
  }
  for (let index = 0; index < run.tail; index += 1) {
    build.place('pv-module', columnX, moduleY, { data: { label: String(modules) } });
    moduleY += SYMBOL_SIZE['pv-module'].height;
  }

  const plus = columnX + moduleW / 2 - PAIR_HALF;
  const minus = columnX + moduleW / 2 + PAIR_HALF;
  const bottom = bands.yField + bands.pvHeight;

  // Les deux polarités sortent par les bords du panneau, puis se rangent.
  build.wire('dc-positive', [
    { x: columnX + 6, y: bottom },
    { x: columnX + 6, y: bottom + 14 },
    { x: plus, y: bottom + 14 },
    { x: plus, y: bottom + 22 },
  ]);
  build.wire('dc-negative', [
    { x: columnX + moduleW - 6, y: bottom },
    { x: columnX + moduleW - 6, y: bottom + 14 },
    { x: minus, y: bottom + 14 },
    { x: minus, y: bottom + 22 },
  ]);

  return { plus, minus };
}

/** Construit le champ d'un onduleur et rend ses deux sorties continues. */
export function layoutPvField(
  build: Builder,
  unit: InverterUnitSpec,
  unitIndex: number,
  groupX: number,
  groupWidth: number,
  bands: Bands,
  options: DiagramOptions,
  field: PvFieldSummary,
  multiple: boolean,
): DcOutlet {
  const labels = build.labels;
  const strings = unit.inputs.flatMap((input) => input.strings);
  const centerX = groupX + groupWidth / 2;
  const leads: { plus: number; minus: number }[] = [];

  if (options.detail === 'synoptic') {
    const first = strings[0];
    const lead = drawColumn(build, groupX, bands, first?.modules ?? 1, options);
    leads.push(lead);
    build.caption(centerX, bands.yField - 12, `${strings.length} × ${first?.reference ?? 'S1'}…`, {
      size: 10,
      weight: 700,
      tone: 'accent',
    });
  } else {
    const drawn = collapse(strings.length, options.maxDrawnStrings);
    const visible: (typeof strings[number] | null)[] = [
      ...strings.slice(0, drawn.head),
      ...(drawn.hidden > 0 ? [null] : []),
      ...(drawn.tail > 0 ? strings.slice(-drawn.tail) : []),
    ];

    let columnX = groupX;
    for (const spec of visible) {
      if (spec === null) {
        build.place(
          'parallel-break',
          columnX,
          bands.yField + bands.pvHeight / 2 - SYMBOL_SIZE['parallel-break'].height / 2,
          { data: { hidden: drawn.hidden } },
        );
        columnX += SYMBOL_SIZE['parallel-break'].width + STRING_GAP;
        continue;
      }
      leads.push(drawColumn(build, columnX, bands, spec.modules, options));
      build.caption(columnX + moduleW / 2, bands.yField - 12, spec.reference, {
        size: 10,
        weight: 700,
        tone: 'accent',
      });
      if (spec.vocColdV !== null) {
        build.caption(columnX + moduleW / 2, bands.yField - 23, `${Math.round(spec.vocColdV)} V`, {
          size: 8,
          tone: 'muted',
        });
      }
      columnX += moduleW + STRING_GAP;
    }
  }

  // Le total du champ se lit au cadre, comme sur un plan d'exécution : la
  // bande sous les modules appartient déjà aux cotes de protection.
  const summary = [
    field.powerKwc === null ? null : `${num(field.powerKwc, 2, labels)} kWc`,
    field.modulePowerW === null
      ? `${field.totalModules} modules`
      : `${field.totalModules} ${labels.modulesOf} ${field.modulePowerW} Wc`,
  ].filter(Boolean);
  const frameLabel = [
    multiple ? `${labels.pvField} ${unit.reference}` : labels.pvField,
    multiple ? null : summary.join(' · '),
  ]
    .filter(Boolean)
    .join(' · ');

  build.frame(
    `frame-pv-${unitIndex + 1}`,
    frameLabel,
    groupX - 16,
    bands.yField - LABEL_HEADROOM + 4,
    groupWidth + 32,
    bands.pvHeight + LABEL_HEADROOM + 14,
  );

  if (!multiple || unitIndex === 0) {
    build.item(
      'G1',
      field.product ?? labels.pvField,
      field.powerKwc === null ? '—' : `${num(field.powerKwc, 2, labels)} kWc`,
      field.totalModules,
    );
  }

  return layoutDcProtection(build, unit, leads, bands, options, groupX, groupWidth, centerX);
}

/** Fusibles, boîte de jonction, parafoudre et sectionnement, dans cet ordre. */
function layoutDcProtection(
  build: Builder,
  unit: InverterUnitSpec,
  leads: { plus: number; minus: number }[],
  bands: Bands,
  options: DiagramOptions,
  groupX: number,
  groupWidth: number,
  centerX: number,
): DcOutlet {
  const labels = build.labels;
  const bottomOfField = bands.yField + bands.pvHeight + 22;
  let railPlus: Point[] = leads.map((lead) => ({ x: lead.plus, y: bottomOfField }));
  let railMinus: Point[] = leads.map((lead) => ({ x: lead.minus, y: bottomOfField }));

  if (unit.stringFuse) {
    const fuseW = SYMBOL_SIZE['dc-fuse'].width;
    const nextPlus: Point[] = [];
    const nextMinus: Point[] = [];
    for (const [index, lead] of leads.entries()) {
      // Le repère n'est porté qu'une fois par groupe : il désigne le jeu entier.
      const fp = build.place('dc-fuse', lead.plus - fuseW / 2, bands.yFuse, {
        reference: index === 0 ? unit.stringFuse.reference : null,
      });
      const fm = build.place('dc-fuse', lead.minus - fuseW / 2, bands.yFuse);
      build.wire('dc-positive', [{ x: lead.plus, y: bottomOfField }, anchorOf(fp, 'top')]);
      build.wire('dc-negative', [{ x: lead.minus, y: bottomOfField }, anchorOf(fm, 'top')]);
      nextPlus.push(anchorOf(fp, 'bottom'));
      nextMinus.push(anchorOf(fm, 'bottom'));
    }
    railPlus = nextPlus;
    railMinus = nextMinus;
    const note = `${unit.stringFuse.reference} · ${unit.stringFuse.kind} · ${amps(unit.stringFuse.ratingA, labels)}`;
    build.caption(centerX, bands.yFuse - 13, note, { size: 8.5, tone: 'muted' });
    build.item(unit.stringFuse.reference, unit.stringFuse.kind, amps(unit.stringFuse.ratingA, labels), unit.stringFuse.quantity);
  }

  let plusOut: Point = railPlus[0] ?? { x: centerX - PAIR_HALF, y: bottomOfField };
  let minusOut: Point = railMinus[0] ?? { x: centerX + PAIR_HALF, y: bottomOfField };

  const combinerReference = `J${unit.reference.slice(1)}`;
  if (unit.combiner) {
    const boxW = Math.max(SYMBOL_SIZE.combiner.width, groupWidth + 12);
    const box = build.place('combiner', centerX - boxW / 2, bands.yCombiner, {
      width: boxW,
      reference: combinerReference,
      data: { label: labels.combiner },
    });
    for (const point of railPlus) build.wire('dc-positive', vh(point, { x: point.x, y: bands.yCombiner }));
    for (const point of railMinus) build.wire('dc-negative', vh(point, { x: point.x, y: bands.yCombiner }));
    build.wire('dc-positive', [
      { x: Math.min(...railPlus.map((p) => p.x)), y: bands.yCombiner + 10 },
      { x: Math.max(...railPlus.map((p) => p.x)), y: bands.yCombiner + 10 },
    ]);
    build.wire('dc-negative', [
      { x: Math.min(...railMinus.map((p) => p.x)), y: bands.yCombiner + 20 },
      { x: Math.max(...railMinus.map((p) => p.x)), y: bands.yCombiner + 20 },
    ]);
    plusOut = { x: centerX - PAIR_HALF, y: box.y + box.height };
    minusOut = { x: centerX + PAIR_HALF, y: box.y + box.height };
    build.wire('dc-positive', [{ x: plusOut.x, y: bands.yCombiner + 10 }, plusOut]);
    build.wire('dc-negative', [{ x: minusOut.x, y: bands.yCombiner + 20 }, minusOut]);
    build.item(combinerReference, labels.combiner, `${leads.length} départs`, 1);
  }

  if (unit.dcSpd) {
    const spdW = SYMBOL_SIZE['dc-spd'].width;
    const spd = build.place('dc-spd', centerX - spdW / 2, bands.ySpd, {
      reference: unit.dcSpd.reference,
      caption: labels.spdType2,
    });
    build.wire('dc-positive', vh(plusOut, { x: plusOut.x, y: bands.ySwitch }));
    build.wire('dc-negative', vh(minusOut, { x: minusOut.x, y: bands.ySwitch }));
    build.wire('dc-positive', [
      { x: plusOut.x, y: bands.ySpd + 6 },
      { x: anchorOf(spd, 'top').x, y: bands.ySpd + 6 },
      anchorOf(spd, 'top'),
    ]);
    build.wire('dc-negative', [
      { x: minusOut.x, y: bands.ySpd + 14 },
      { x: anchorOf(spd, 'top').x, y: bands.ySpd + 14 },
    ]);
    plusOut = { x: plusOut.x, y: bands.ySwitch };
    minusOut = { x: minusOut.x, y: bands.ySwitch };
    build.item(unit.dcSpd.reference, unit.dcSpd.kind, unit.dcSpd.voltageV === null ? '—' : `${Math.round(unit.dcSpd.voltageV)} V`, 1);
  }

  if (unit.dcSwitch) {
    const swW = SYMBOL_SIZE['dc-switch'].width;
    const sp = build.place('dc-switch', plusOut.x - swW / 2, bands.ySwitch, { reference: unit.dcSwitch.reference });
    const sm = build.place('dc-switch', minusOut.x - swW / 2, bands.ySwitch);
    if (!unit.dcSpd) {
      build.wire('dc-positive', vh(plusOut, anchorOf(sp, 'top')));
      build.wire('dc-negative', vh(minusOut, anchorOf(sm, 'top')));
    }
    build.caption(
      centerX,
      bands.ySwitch - 13,
      `${unit.dcSwitch.kind} · ${amps(unit.dcSwitch.ratingA, labels)}`,
      { size: 8.5, tone: 'muted' },
    );
    build.item(unit.dcSwitch.reference, unit.dcSwitch.kind, amps(unit.dcSwitch.ratingA, labels), unit.dcSwitch.quantity);
    plusOut = anchorOf(sp, 'bottom');
    minusOut = anchorOf(sm, 'bottom');
  }

  return { plus: plusOut, minus: minusOut, centerX, left: groupX, right: groupX + groupWidth };
}
