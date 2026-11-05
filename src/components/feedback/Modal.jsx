import { useRef } from 'react';
import { X } from 'lucide-react';
import { IconButton } from '../ui/IconButton';
import { useDialogAccessibility } from '../common/useDialogAccessibility';

export const Modal = ({ isOpen, open, onClose, title, children, footer, className = '' }) => {
  const visible = open ?? isOpen ?? true;
  const dialogRef = useRef(null);
  useDialogAccessibility(visible, onClose, dialogRef);

  if (!visible) return null;
  return (
    <div className="ui-overlay" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose?.();
    }}>
      <section ref={dialogRef} tabIndex={-1}
        className={`ui-modal ${className}`.trim()}
        role="dialog" aria-modal="true" aria-label={title || 'Dialog'}>
        <header className="ui-modal__header">
          <h3 className="ui-card__title">{title}</h3>
          <IconButton label="Close" onClick={onClose}><X size={18}/></IconButton>
        </header>
        <div className="ui-modal__body">{children}</div>
        {footer && <footer className="ui-modal__footer">{footer}</footer>}
      </section>
    </div>
  );
};
