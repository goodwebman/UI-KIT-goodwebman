import { createContext, useContext } from 'react';

export interface DialogContextValue {
  open: boolean;
  onClose: () => void;
}

const DialogContext = createContext<DialogContextValue | null>(null);

export function useDialogContext(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error('UIDialog sub-components must be used inside <UIDialog>');
  return ctx;
}

export default DialogContext;
