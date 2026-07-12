import { forwardRef, memo, type HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export type IUIDialogDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

const UIDialogDescription = forwardRef<HTMLParagraphElement, IUIDialogDescriptionProps>(
  ({ className, ...props }, ref) => (
    <p
      ref={ref}
      data-name="UIDialogDescription"
      className={cn('mt-2 text-sm text-muted-foreground', className)}
      {...props}
    />
  ),
);
UIDialogDescription.displayName = 'UIDialogDescription';
const MemoUIDialogDescription = memo(UIDialogDescription);
export { MemoUIDialogDescription as UIDialogDescription };
