import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Icon, type IconName } from '@/components/ui/Icon';

/**
 * One confirmation, for anything that cannot be undone.
 *
 * Stacks its buttons on a phone with the confirming one on top, so the thumb
 * lands on the deliberate choice rather than on whichever button happened to
 * be nearest.
 */
export function ConfirmDialog({
  open, onClose, onConfirm, title, body, confirmLabel = 'Delete',
  icon = 'trash', tone = 'danger', pending,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  icon?: IconName;
  tone?: 'danger' | 'brand';
  pending?: boolean;
}) {
  const danger = tone === 'danger';

  return (
    <Modal
      open={open}
      onClose={() => !pending && onClose()}
      size="sm"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={onClose} disabled={pending} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            loading={pending}
            onClick={onConfirm}
            className="w-full sm:w-auto"
          >
            <Icon name={icon} size={16} /> {confirmLabel}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center py-2 text-center">
        <span
          className={
            danger
              ? 'mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-danger/10 text-danger ring-1 ring-inset ring-danger/20'
              : 'mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brand-soft text-brand ring-1 ring-inset ring-brand/20'
          }
        >
          <Icon name={icon} size={24} />
        </span>
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {body && <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-soft">{body}</p>}
      </div>
    </Modal>
  );
}
