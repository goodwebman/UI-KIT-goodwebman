import { forwardRef, memo, type HTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export type IUIDialogTitleProps = HTMLAttributes<HTMLHeadingElement>;

const UIDialogTitle = forwardRef<HTMLHeadingElement, IUIDialogTitleProps>(
  ({ className, children, ...props }, ref) => (
    <h2
      ref={ref}
      data-name="UIDialogTitle"
      className={cn('text-lg font-semibold leading-none tracking-tight', className)}
      {...props}
    >
      {children}
    </h2>
  ),
);
UIDialogTitle.displayName = 'UIDialogTitle';
const MemoUIDialogTitle = memo(UIDialogTitle);
export { MemoUIDialogTitle as UIDialogTitle };
