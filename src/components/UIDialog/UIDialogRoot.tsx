import { useCallback, useMemo, type ReactNode } from 'react';
import { Show } from '../UIShow/UIShow';
import DialogContext from './dialog-context';

export interface IUIDialogProps {
  readonly testId?: string;
  readonly children?: ReactNode;
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function UIDialogRoot({ children, open, onOpenChange }: IUIDialogProps) {
  const onClose = useCallback(() => { onOpenChange(false); }, [onOpenChange]);
  const ctx = useMemo(() => ({ open, onClose }), [open, onClose]);

  return (
    <DialogContext.Provider value={ctx}>
      <Show when={open}>
        {children}
      </Show>
    </DialogContext.Provider>
  );
}
UIDialogRoot.displayName = 'UIDialog';
