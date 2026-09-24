/**
 * Petit cache LRU pour les transformations déterministes et coûteuses (analyse
 * solaire des 8 760 heures, facteur annuel). La clé est une empreinte des seules
 * entrées qui changent le résultat : modifier une marge ne recalcule pas le soleil.
 */
export function memoize<Result>(capacity: number): (key: string, compute: () => Result) => Result {
  const entries = new Map<string, Result>();
  return (key, compute) => {
    if (entries.has(key)) {
      const value = entries.get(key)!;
      entries.delete(key); entries.set(key, value);
      return value;
    }
    const value = compute();
    entries.set(key, value);
    if (entries.size > capacity) entries.delete(entries.keys().next().value!);
    return value;
  };
}
