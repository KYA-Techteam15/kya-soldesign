import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

/**
 * Textes d'interface écrits en dur.
 *
 * L'anglais est une langue obligatoire du produit : tout texte affiché doit
 * passer par `t()` / `tr()`. Ce contrôle relit les fichiers TSX et signale :
 * - le texte entre balises qui contient des mots ;
 * - les attributs lus par l'utilisateur (title, placeholder, aria-label, alt, label, lead) ;
 * - les chaînes et gabarits de plusieurs mots, ou accentués, hors appel de traduction.
 * Les unités, sigles, noms de classes, clés, noms de fichiers et codes d'erreur
 * ne sont pas des textes à traduire.
 */

const root = resolve('apps/desktop/src');
const TECHNICAL = new Set(['max', 'min', 'kWc', 'kWh', 'kW', 'Wc', 'Wh', 'W', 'V', 'Vdc', 'Vac', 'A', 'Ah', 'mm', 'm', 'SRI', 'SVI', 'LPSP', 'LOLP', 'LCOE', 'MPPT', 'PV', 'AC', 'DC', 'Voc', 'Vmp', 'Isc', 'Imp', 'CO', 'TMY', 'PVGIS', 'SHA', 'UTC', 'IANA', 'DoD', 'PR', 'KYA', 'SolDesign', 'Ctrl', 'Shift', 'Esc', 'Tab', 'kgCO', 'FR', 'EN', 'XOF', 'EUR', 'USD', 'SVG', 'CSV', 'JSON', 'Word', 'Excel', 'PDF', 'NOCT', 'Pmax', 'yEn', 'cycles', 'id']);
const WORD = /[A-Za-zÀ-ÖØ-öø-ÿŒœ’']{2,}/gu;
const ACCENT = /[À-ÖØ-öø-ÿŒœ]/u;
/** Débuts de ligne qui sont du code, pas du texte (« return <div> », « else { »…). */
const CODE_WORDS = /^(?:return|else|try|finally|do|function|interface|enum|class|namespace|type|export|default|async|await|const|let|var|new|case|yield|typeof|keyof|extends|implements|in|of|as|satisfies)\b/u;
/** Endonymes des langues proposées : affichés tels quels dans les deux langues. */
const ENDONYMS = new Set(['Français', 'English']);

function isTechnical(text) {
  const words = text.match(WORD) ?? [];
  return words.every((word) => TECHNICAL.has(word) || /^[A-Z0-9_]+$/u.test(word) || (word.length < 3 && !/[a-zà-ÿ]{2}/u.test(word)));
}

/** Chaîne qui ressemble à une phrase ou un libellé destiné à l'utilisateur. */
function looksLikeCopy(text) {
  const trimmed = text.trim();
  if (isTechnical(text) || ENDONYMS.has(trimmed)) return false;
  if (/\.(?:svg|csv|json|xlsx|docx|ksd|ksdbackup|png|txt)$/u.test(trimmed)) return false; // nom de fichier
  if (/^[a-z0-9]+(?:\.[a-zA-Z0-9]+)+\.?$/u.test(trimmed)) return false; // clé ou préfixe de clé construite
  if (/^[a-z0-9\s-]*$/u.test(text) && text.includes('-')) return false; // classes CSS
  if (/^:|\s>\s\./u.test(trimmed)) return false; // sélecteur CSS
  if (/^[A-Z][a-z]+\/[A-Za-z_]+$/u.test(trimmed)) return false; // fuseau IANA
  if (/^[a-z0-9]+(?:[-_:.][a-z0-9]+)+$/iu.test(trimmed)) return false; // identifiant
  if (/^[#.%\d\s:/,-]+$/u.test(text) || /^(?:var\(|calc\(|rgb|https?:|\/|\.|[a-z]+\/)/u.test(trimmed)) return false;
  const words = text.match(WORD) ?? [];
  return words.length >= 2 || (ACCENT.test(text) && words.some((word) => word.length >= 4));
}

/** Efface le contenu des commentaires, y compris JSX et sur plusieurs lignes, en gardant les numéros de ligne. */
function stripComments(source) {
  const blank = (block) => block.replace(/[^\n]/gu, ' ');
  return source.replace(/\{\/\*[\s\S]*?\*\/\}/gu, blank).replace(/\/\*[\s\S]*?\*\//gu, blank);
}

async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const target = join(directory, entry.name);
    if (entry.isDirectory()) return files(target);
    return extname(entry.name) === '.tsx' ? [target] : [];
  }));
  return nested.flat();
}

const findings = [];
for (const file of await files(root)) {
  const source = stripComments(await readFile(file, 'utf8'));
  const name = relative(root, file).split('\\').join('/');
  source.split(/\r?\n/u).forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('import ')) return;
    if (/new Error\(|throw |console\.|logger\./u.test(line)) return;
    const report = (kind, text) => findings.push(`${name}:${index + 1} [${kind}] ${text.trim().slice(0, 100)}`);
    const code = line.replace(/(^|\s)\/\/.*$/u, '$1');
    for (const match of code.matchAll(/>([^<>{}]+)<(.)/gu)) {
      const text = match[1];
      // `Promise<void>` n'est pas un texte : après un générique vient un identifiant, pas « / ».
      if (match[2] !== '/' && /^\s*[A-Za-z_][A-Za-z0-9_]*\s*$/u.test(text)) continue;
      // `a | b` est une union de types, pas un texte affiché.
      if (/[A-Za-zÀ-ÿ]{2,}/u.test(text) && !isTechnical(text) && !/=>|&&|\||\?\s|[;=]/u.test(text)) report('text', text);
    }
    // Texte JSX qui suit une expression (« {n} lignes ») ou qui continue sur la ligne suivante.
    const afterExpression = /^\s*\{[^{}]*\}\s+([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’ ]*?)\s*(?:$|<|\{)/u.exec(code);
    if (afterExpression && !isTechnical(afterExpression[1])) report('text', afterExpression[1]);
    // Texte après une balise fermante, suivi d'une expression ou de la fin de ligne (« </span> nouvelle ligne ·{' '} »).
    for (const match of code.matchAll(/<\/[a-z]+>\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’ .·…-]*?)\s*(?:\{|$)/gu)) {
      if (!isTechnical(match[1]) && /[a-zà-ÿ]{2}/u.test(match[1])) report('text', match[1]);
    }
    // Texte en tête de ligne avant une balise ou une expression (« Crête <b>… », « + Ajouter {…} »).
    const beforeMarkup = /^\s*[+·]?\s*([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ'’ .…-]*?)\s*(?:<[A-Za-z/]|\{)/u.exec(code);
    if (beforeMarkup && !CODE_WORDS.test(beforeMarkup[1]) && !isTechnical(beforeMarkup[1]) && /[a-zà-ÿ]{2}/u.test(beforeMarkup[1])) report('text', beforeMarkup[1]);
    const identifierList = /^\s*[\w.$]+(?:\s+as\s+\w+)?(?:,\s*[\w.$]+(?:\s+as\s+\w+)?)*,?\s*$/u.test(code);
    if (!identifierList && /^\s*[A-Za-zÀ-ÿ«][A-Za-zÀ-ÿ'’,.…«»\- ]*$/u.test(code) && (code.match(WORD) ?? []).length >= 3) report('text', code);
    for (const match of code.matchAll(/\b(title|placeholder|aria-label|alt|label|lead)="([^"]*)"/gu)) {
      if (/[A-Za-zÀ-ÿ]{3,}/u.test(match[2]) && !isTechnical(match[2])) report(match[1], match[2]);
    }
    for (const match of code.matchAll(/'((?:[^'\\]|\\.)*)'/gu)) {
      const before = code.slice(0, match.index);
      if (/\b(?:t|tr|translate)\(\s*$|className=\{?[^}]*$|\bkey=\{?\s*$|\b(?:from|import)\s*$/u.test(before)) continue;
      if (looksLikeCopy(match[1])) report('string', match[1]);
    }
    for (const match of code.matchAll(/`((?:[^`\\]|\\.)*)`/gu)) {
      const before = code.slice(0, match.index);
      if (/className=\{?\s*$|\b(?:t|tr)\(\s*$/u.test(before)) continue;
      if (/\b(?:t|tr|fill)\(/u.test(match[1])) continue; // gabarit composé de textes déjà traduits
      if (/^[a-z0-9]+(?:\.[a-zA-Z0-9]+)*\.\$\{/u.test(match[1])) continue; // clé construite (« step.${slug}.label »)
      const literal = match[1].replace(/\$\{[^}]*\}/gu, ' ');
      if (looksLikeCopy(literal)) report('template', match[1]);
    }
  });
}

if (findings.length > 0) {
  console.error(`${findings.length} texte(s) d'interface en dur :\n${findings.join('\n')}`);
  process.exitCode = 1;
} else {
  console.log('hardcoded copy check passed');
}
