export function countryName(alpha2: string, lang: 'fr' | 'en'): string {
  try {
    return new Intl.DisplayNames([lang], { type: 'region' }).of(alpha2) ?? alpha2;
  } catch {
    return alpha2;
  }
}
