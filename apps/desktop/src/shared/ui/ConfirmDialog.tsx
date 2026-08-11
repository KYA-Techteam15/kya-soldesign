import { useT } from '../i18n/index.js';
import { Dialog } from './Dialog.js';

interface ConfirmDialogProps {
  readonly open: boolean;
  readonly title: string;
  readonly body: string;
  readonly danger?: boolean;
  readonly onConfirm: () => void;
  readonly onClose: () => void;
}

export function ConfirmDialog({ open, title, body, danger = false, onConfirm, onClose }: ConfirmDialogProps) {
  const t = useT();
  return <Dialog open={open} title={title} onClose={onClose}><p>{body}</p><div className="dialog-actions"><button data-dialog-initial className="button button-secondary" onClick={onClose}>{t('action.cancel')}</button><button className={`button ${danger ? 'button-danger' : 'button-primary'}`} onClick={onConfirm}>{t('action.confirm')}</button></div></Dialog>;
}
