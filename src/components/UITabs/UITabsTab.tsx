import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../../lib/cn';
import { useTabsContext } from './tabs-context';

export interface IUITabProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly value: string;
  readonly testId?: string;
}

const UITabsTab = forwardRef<HTMLButtonElement, IUITabProps>(
  ({ className, value, testId, disabled, ...props }, ref) => {
    const { activeTab, onTabChange } = useTabsContext();
    const isActive = activeTab === value;

    return (
      <button
        ref={ref}
        role="tab"
        aria-selected={isActive}
        data-state={isActive ? 'active' : 'inactive'}
        data-name={testId ? `UITab-${testId}` : 'UITab'}
        disabled={disabled}
        onClick={() => { onTabChange(value); }}
        className={cn(
          'inline-flex cursor-pointer items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all duration-150 ' +
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ' +
          'disabled:cursor-not-allowed disabled:opacity-50 ' +
          'data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm',
          className,
        )}
        {...props}
      />
    );
  },
);
UITabsTab.displayName = 'UITab';
export { UITabsTab };
