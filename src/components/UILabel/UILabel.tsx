import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, memo, type LabelHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';

export const labelVariants = cva(
  'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
);

export interface IUILabelProps
  extends LabelHTMLAttributes<HTMLLabelElement>,
    VariantProps<typeof labelVariants> {
  readonly testId?: string;
}

const UILabelBase = forwardRef<HTMLLabelElement, IUILabelProps>(
  ({ className, testId, ...props }, ref) => (
    // eslint-disable-next-line jsx-a11y/label-has-associated-control
    <label
      ref={ref}
      data-name={testId ? `UILabel-${testId}` : 'UILabel'}
      className={cn(labelVariants(), className)}
      {...props}
    />
  ),
);
UILabelBase.displayName = 'UILabel';
export const UILabel = memo(UILabelBase);
