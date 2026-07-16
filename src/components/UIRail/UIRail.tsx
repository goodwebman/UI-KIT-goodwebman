import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Virtuoso, type VirtuosoHandle } from 'react-virtuoso';
import { cn } from '../../lib/cn';
import { useReducedMotion } from '../../lib/use-reduced-motion';
import { UIIcons } from '../../icons';

export interface IUIRailProps<T> {
  readonly testId?: string;
  readonly items: readonly T[];
  readonly renderItem: (item: T, index: number) => ReactNode;
  readonly getItemKey?: (item: T, index: number) => string | number;
  /** Ширина карточки в px. Default: `280`. */
  readonly itemWidth?: number;
  /** Зазор между карточками в px. Default: `16`. */
  readonly gap?: number;
  /** Высота ряда. Горизонтальной виртуализации нужна фиксированная высота. Default: `280`. */
  readonly height?: number | string;
  /** Заголовок слева в шапке. */
  readonly title?: ReactNode;
  /** Узел справа в шапке (например ссылка «Показать все»). */
  readonly action?: ReactNode;
  /** Стрелки-оверлеи, проявляются при наведении. Default: `true`. */
  readonly showArrows?: boolean;
  /** Градиентные маски по краям — намёк, что есть ещё контент. Default: `true`. */
  readonly fade?: boolean;
  /** Подгрузка при прокрутке к концу (infinite rail). */
  readonly onEndReached?: () => void | Promise<void>;
  /** За сколько px до конца звать `onEndReached`. Default: `400`. */
  readonly endReachedThreshold?: number;
  readonly empty?: ReactNode;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly ariaLabel?: string;
}

export interface UIRailHandle {
  scrollToIndex: (index: number, behavior?: 'auto' | 'smooth') => void;
  next: () => void;
  prev: () => void;
}

// допуск в px — subpixel-расхождения scrollLeft/scrollWidth не должны ломать детект края
const EDGE_EPS = 2;

/**
 * Горизонтальный контент-рельс с виртуализацией (как ряд в стриминге).
 * Поверх `Virtuoso` в `horizontalDirection` — в DOM только видимые карточки, тянет хоть тысячи.
 *
 * Отличие от `UICarousel`: это лента для просмотра, а не показ по одному. Шапка с заголовком и
 * действием, градиентные края, стрелки-оверлеи по наведению и пейджинг на ~ширину вьюпорта
 * (а не по одному элементу). Края и доступность стрелок считаются по реальной позиции скролла;
 * `MutationObserver` нужен, т.к. Virtuoso задаёт полную ширину ленты inline-стилем на спейсере.
 * Нативный скролл (тач/трекпад) работает сам; вертикальное колесо мыши превращаем в горизонталь.
 *
 * @example
 * <UIRail title="Рекомендуем" items={movies} renderItem={m => <PosterCard movie={m} />}
 *   itemWidth={180} height={260} action={<a href="#">Показать все</a>} />
 */
function UIRailInner<T>(
  {
    testId,
    items,
    renderItem,
    getItemKey,
    itemWidth = 280,
    gap = 16,
    height = 280,
    title,
    action,
    showArrows = true,
    fade = true,
    onEndReached,
    endReachedThreshold = 400,
    empty,
    className,
    style,
    ariaLabel,
  }: IUIRailProps<T>,
  ref: React.Ref<UIRailHandle>,
): ReactNode {
  const reduced = useReducedMotion();
  const handleRef = useRef<VirtuosoHandle>(null);
  const [scroller, setScroller] = useState<HTMLElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const total = items.length;
  const canScroll = !(atStart && atEnd);

  const sync = useCallback((el: HTMLElement) => {
    const max = el.scrollWidth - el.clientWidth;
    if (max <= EDGE_EPS) {
      setAtStart(true);
      setAtEnd(true);
      return;
    }
    setAtStart(el.scrollLeft <= EDGE_EPS);
    setAtEnd(el.scrollLeft >= max - EDGE_EPS);
  }, []);

  const scrollByPage = useCallback(
    (dir: 1 | -1) => {
      if (!scroller) return;
      // страница ≈ 85% вьюпорта, но не меньше одной карточки — чтобы всегда был прогресс
      const page = Math.max(scroller.clientWidth * 0.85, itemWidth + gap);
      scroller.scrollBy({ left: dir * page, behavior: reduced ? 'auto' : 'smooth' });
    },
    [gap, itemWidth, reduced, scroller],
  );

  const next = useCallback(() => { scrollByPage(1); }, [scrollByPage]);
  const prev = useCallback(() => { scrollByPage(-1); }, [scrollByPage]);

  useImperativeHandle(
    ref,
    (): UIRailHandle => ({
      scrollToIndex: (index, behavior = 'auto') => {
        handleRef.current?.scrollToIndex({ index, behavior, align: 'start' });
      },
      next,
      prev,
    }),
    [next, prev],
  );

  // подписка на scroll + замер краёв. MutationObserver — Virtuoso пишет ширину ленты inline на
  // спейсере уже после маунта (ResizeObserver ловит только размер самого scroller, не scrollWidth).
  useEffect(() => {
    if (!scroller) return;
    sync(scroller);
    let raf = 0;
    const onScroll = (): void => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { sync(scroller); });
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(() => { sync(scroller); });
    ro.observe(scroller);
    const mo = new MutationObserver(() => { sync(scroller); });
    mo.observe(scroller, { attributes: true, attributeFilter: ['style'], subtree: true, childList: true });
    return () => {
      cancelAnimationFrame(raf);
      scroller.removeEventListener('scroll', onScroll);
      ro.disconnect();
      mo.disconnect();
    };
  }, [scroller, sync]);

  // Колесо мыши НЕ перехватываем: вертикальное колесо уходит странице (рельс не
  // должен «угонять» скролл), горизонтальный свайп трекпадом (deltaX) листает рельс
  // через нативный горизонтальный скролл Virtuoso. Раньше deltaY принудительно
  // превращался в горизонталь — это ломало прокрутку страницы над/под рельсом.

  const handleScrollerRef = useCallback((el: HTMLElement | Window | null) => {
    setScroller(el instanceof HTMLElement ? el : null);
  }, []);

  const computeItemKey = useCallback(
    (index: number, item: T) => (getItemKey ? getItemKey(item, index) : index),
    [getItemKey],
  );

  const itemContent = useCallback(
    (index: number, item: T) => (
      <div style={{ width: `${String(itemWidth)}px`, marginRight: `${String(gap)}px` }} className="h-full">
        {renderItem(item, index)}
      </div>
    ),
    [gap, itemWidth, renderItem],
  );

  const heightValue = typeof height === 'number' ? `${String(height)}px` : height;
  const resolvedAriaLabel = ariaLabel ?? (typeof title === 'string' ? title : 'Лента');

  if (total === 0) {
    return (
      <div
        data-name={testId ? `UIRail-${testId}` : 'UIRail'}
        className={cn(
          'flex items-center justify-center rounded-xl border border-border bg-card text-sm text-muted-foreground',
          className,
        )}
        style={{ height: heightValue, ...style }}
      >
        {empty ?? 'Нет данных'}
      </div>
    );
  }

  const arrowBase = cn(
    'absolute top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full',
    'border border-border bg-card/90 text-foreground shadow-lg backdrop-blur transition-all duration-200',
    'hover:scale-110 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    'disabled:pointer-events-none disabled:opacity-0',
    // проявление по наведению/фокусу внутри рельса; на тач-устройствах (no-hover) — всегда видны
    'opacity-0 group-hover/rail:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100',
  );

  const fadeBase = 'pointer-events-none absolute inset-y-0 z-10 w-12 transition-opacity duration-200';

  return (
    <section
      data-name={testId ? `UIRail-${testId}` : 'UIRail'}
      aria-label={resolvedAriaLabel}
      className={cn('w-full', className)}
      style={style}
    >
      {(title != null || action != null) && (
        <div className="mb-3 flex items-end justify-between gap-4">
          {typeof title === 'string' ? (
            <h3 className="text-lg font-semibold text-foreground">{title}</h3>
          ) : (
            title
          )}
          {action != null && <div className="shrink-0 text-sm">{action}</div>}
        </div>
      )}

      <div className="group/rail relative">
        {fade && (
          <>
            <div
              aria-hidden
              className={cn(
                fadeBase,
                'left-0 bg-linear-to-r from-background to-transparent',
                atStart && 'opacity-0',
              )}
            />
            <div
              aria-hidden
              className={cn(
                fadeBase,
                'right-0 bg-linear-to-l from-background to-transparent',
                atEnd && 'opacity-0',
              )}
            />
          </>
        )}

        <Virtuoso
          ref={handleRef}
          scrollerRef={handleScrollerRef}
          horizontalDirection
          data={items}
          computeItemKey={computeItemKey}
          itemContent={itemContent}
          endReached={onEndReached ? () => { void onEndReached(); } : undefined}
          increaseViewportBy={endReachedThreshold}
          style={{ height: heightValue }}
          // скрываем нативные скроллбары обеих осей; вертикаль не нужна
          className={cn('overflow-y-hidden', '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden')}
        />

        {showArrows && total > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              disabled={!canScroll || atStart}
              aria-label="Прокрутить назад"
              className={cn(arrowBase, 'left-2')}
            >
              <UIIcons.ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={next}
              disabled={!canScroll || atEnd}
              aria-label="Прокрутить вперёд"
              className={cn(arrowBase, 'right-2')}
            >
              <UIIcons.ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>
    </section>
  );
}

const UIRailForwarded = forwardRef(UIRailInner) as <T>(
  props: IUIRailProps<T> & { ref?: React.Ref<UIRailHandle> },
) => ReactNode;

export const UIRail = memo(UIRailForwarded) as typeof UIRailForwarded;
