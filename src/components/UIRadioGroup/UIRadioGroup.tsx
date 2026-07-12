import {
  createContext,
  useCallback,
  useMemo,
  forwardRef,
  type FieldsetHTMLAttributes,
} from 'react';
import { cn } from '../../lib/cn';

export interface RadioContextValue {
  readonly name: string;
  readonly selected: string;
  readonly onSelect: (value: string) => void;
}

export const RadioContext = createContext<RadioContextValue | null>(null);

export interface IUIRadioGroupProps
  extends Omit<FieldsetHTMLAttributes<HTMLFieldSetElement>, 'onChange'> {
  readonly name: string;
  readonly value: string;
  readonly onValueChange: (value: string) => void;
  /** A11y: видимый заголовок группы */
  readonly legend?: string;
}

/**
 * Группа радио-кнопок. Управляет выбором через `value` / `onValueChange`.
 * Оборачивает дочерние `UIRadio` в `RadioContext.Provider`.
 */
export const UIRadioGroup = forwardRef<HTMLFieldSetElement, IUIRadioGroupProps>(
  ({ name, value, onValueChange, legend, children, className, ...props }, ref) => {
    const onSelect = useCallback(
      (next: string) => {
        onValueChange(next);
      },
      [onValueChange],
    );

    const ctx = useMemo<RadioContextValue>(
      () => ({ name, selected: value, onSelect }),
      [name, value, onSelect],
    );

    return (
      <fieldset ref={ref} role="radiogroup" className={cn('flex flex-col gap-2', className)} {...props}>
        {legend != null && (
          <legend className="text-sm font-medium">{legend}</legend>
        )}
        <RadioContext.Provider value={ctx}>{children}</RadioContext.Provider>
      </fieldset>
    );
  },
);
UIRadioGroup.displayName = 'UIRadioGroup';
