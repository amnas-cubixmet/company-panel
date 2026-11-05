import { useEffect, useRef } from 'react';

let activeDialogCount = 0;
let originalOverflow = '';

/** Reusable focus containment and body scroll locking for existing dialogs. */
export function useDialogAccessibility(isOpen, onClose, dialogRef) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousFocus = document.activeElement;
    if (activeDialogCount === 0) originalOverflow = document.body.style.overflow;
    activeDialogCount += 1;
    document.body.style.overflow = 'hidden';

    const dialog = dialogRef.current;
    const firstInput = dialog?.querySelector(
      '[autofocus],input:not([type="hidden"]):not(:disabled),textarea:not(:disabled),select:not(:disabled)'
    );
    (firstInput || dialog?.querySelector('button:not(:disabled)') || dialog)?.focus();

    const onKeyDown = (event) => {
      // Nested dialogs take precedence over their underlying parent.
      const top = [...document.querySelectorAll('[aria-modal="true"]')].at(-1);
      // Responsive sheets place aria-modal on the overlay, while other
      // dialogs place it on the focusable section. Support both structures.
      if (top !== dialogRef.current && !top?.contains(dialogRef.current)) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        closeRef.current?.();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = [...(dialogRef.current?.querySelectorAll(
        'a[href],button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex]:not([tabindex="-1"])'
      ) || [])].filter((element) => !element.hasAttribute('hidden') && element.getClientRects().length);
      if (!focusable.length) {
        event.preventDefault();
        dialogRef.current?.focus();
        return;
      }
      const first = focusable[0], last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      activeDialogCount = Math.max(0, activeDialogCount - 1);
      if (activeDialogCount === 0) document.body.style.overflow = originalOverflow;
      if (previousFocus?.isConnected) previousFocus.focus();
    };
  }, [isOpen, dialogRef]);
}
