import { forwardRef, memo } from 'react';
import { cn } from '../../lib/cn';
import {
  AccordionItemContext,
  useAccordionContext,
  type IUIAccordionItemProps,
} from './accordion-context';

const UIAccordionItemBase = forwardRef<HTMLDivElement, IUIAccordionItemProps>(
  ({ className, value, children, ...props }, ref) => {
    const { expanded } = useAccordionContext();
    const isOpen = expanded.includes(value);

    return (
      <AccordionItemContext.Provider value={{ value }}>
        <div
          ref={ref}
          data-state={isOpen ? 'open' : 'closed'}
          data-name="UIAccordionItem"
          className={cn('px-4', className)}
          {...props}
        >
          {children}
        </div>
      </AccordionItemContext.Provider>
    );
  },
);
UIAccordionItemBase.displayName = 'UIAccordionItem';

export const UIAccordionItem = memo(UIAccordionItemBase);
