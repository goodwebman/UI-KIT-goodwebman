import { forwardRef, memo, useCallback } from 'react';
import { cn } from '../../lib/cn';
import { UIIcons } from '../../icons';
import { useAccordionContext, useAccordionItemContext } from './accordion-context';
import type { IUIAccordionTriggerProps } from './accordion-context';

const UIAccordionTriggerBase = forwardRef<HTMLButtonElement, IUIAccordionTriggerProps>(
  ({ className, children, ...props }, ref) => {
    const ctx = useAccordionContext();
    const value = useAccordionItemContext();
    const isOpen = ctx.expanded.includes(value);

    const handleClick = useCallback(() => {
      ctx.toggle(value);
    }, [ctx, value]);

    return (
      <button
        ref={ref}
        type="button"
        data-state={isOpen ? 'open' : 'closed'}
        data-name="UIAccordionTrigger"
        onClick={handleClick}
        className={cn(
          'flex w-full items-center justify-between py-4 text-left text-sm font-medium text-foreground transition-colors',
          'hover:text-primary focus-visible:text-primary focus-visible:outline-none',
          className,
        )}
        aria-expanded={isOpen}
        {...props}
      >
        {children}
        <UIIcons.ChevronDown
          data-state={isOpen ? 'open' : 'closed'}
          className="size-4 text-muted-foreground transition-transform duration-300 ease-out data-[state=open]:rotate-180"
        />
      </button>
    );
  },
);
UIAccordionTriggerBase.displayName = 'UIAccordionTrigger';

export const UIAccordionTrigger = memo(UIAccordionTriggerBase);
