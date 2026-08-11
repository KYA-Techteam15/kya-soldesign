import { useT } from '../i18n/index.js';

export function Provenance({ sourceId }: { readonly sourceId: string }) {
  const t = useT();
  return <span className="provenance">{t('catalog.provenance')} · {sourceId}</span>;
}
