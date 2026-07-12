import {
  forwardRef,
  useContext,
  type ButtonHTMLAttributes,
  type ReactNode,
} from 'react';
import { cn } from '../../lib/cn';
import { RadioContext } from './UIRadioGroup';

export interface IUIRadioProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'value' | 'onChange'> {
  /** Значение радио-кнопки (возвращается в onValueChange группы) */
  readonly value: string;
  readonly testId?: string;
  readonly children?: ReactNode;
}

const radioTrack =
  'inline-flex size-4 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 border-muted-foreground ' +
  'transition-colors duration-150 ' +
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background ' +
  'disabled:cursor-not-allowed disabled:opacity-50 ' +
  'data-[state=checked]:border-primary data-[state=unchecked]:border-muted-foreground';

const radioIndicator =
  'size-2 rounded-full bg-primary transition-transform duration-150 ' +
  'data-[state=checked]:scale-100 data-[state=unchecked]:scale-0';

/**
 * Отдельная радио-кнопка. Использует `role="radio"` + `aria-checked`.
 * Должна быть обёрнута в `UIRadioGroup` (читает контекст).
 */
export const UIRadio = forwardRef<HTMLButtonElement, IUIRadioProps>(
  ({ value, testId, children, className, disabled, ...props }, ref) => {
    const ctx = useContext(RadioContext);
    const checked = ctx?.selected === value;

    const handleClick = () => {
      if (disabled || ctx == null || checked) {
        return;
      }
      ctx.onSelect(value);
    };

    return (
      <label className="inline-flex items-center gap-2 cursor-pointer group">
        <button
          ref={ref}
          role="radio"
          aria-checked={checked}
          data-state={checked ? 'checked' : 'unchecked'}
          data-name={testId ? `UIRadio-${testId}` : 'UIRadio'}
          name={ctx?.name}
          disabled={disabled}
          onClick={handleClick}
          className={cn(radioTrack, className)}
          {...props}
        >
          <span
            data-name="UIRadio-indicator"
            data-state={checked ? 'checked' : 'unchecked'}
            className={radioIndicator}
          />
        </button>
        {children != null && (
          <span className="text-sm font-medium cursor-pointer">{children}</span>
        )}
      </label>
    );
  },
);
UIRadio.displayName = 'UIRadio';
