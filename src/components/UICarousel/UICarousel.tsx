import {
  forwardRef,
  memo,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { Virtuoso } from 'react-virtuoso';
import { cn } from '../../lib/cn';
import { UIIcons } from '../../icons';

export interface IUICarouselProps<T> {
  readonly testId?: string;
  readonly items: readonly T[];
  readonly renderItem: (item: T, index: number) => ReactNode;
  readonly getItemKey?: (item: T, index: number) => string | number;
  /** Ширина одного слайда в px. Default: `320`. */
  readonly itemWidth?: number;
  /** Зазор между слайдами в px. Default: `16`. */
  readonly gap?: number;
  /** Высота карусели. Default: `220`. */
  readonly height?: number | string;
  /** Показывать стрелки (снаружи, по бокам). Default: `true`. */
  readonly showArrows?: boolean;
  /** Показывать точки-индикаторы. Default: `true`. */
  readonly showDots?: boolean;
  /** Loop-режим: с последнего «вперёд» → в начало, с первого «назад» → в конец. Default: `false`. */
  readonly loop?: boolean;
  /**
   * Автопрокрутка каждые N мс. `0` / `undefined` — выключено.
   * Пауза при hover / потере видимости вкладки.
   */
  readonly autoplayMs?: number;
  readonly className?: string;
  readonly style?: CSSProperties;
  readonly ariaLabel?: string;
}

export interface UICarouselHandle {
  scrollToIndex: (index: number, behavior?: 'auto' | 'smooth') => void;
  next: () => void;
  prev: () => void;
}

const clamp = (v: number, min: number, max: number): number => Math.max(min, Math.min(max, v));
// допуск в 2px — subpixel-расхождения scrollLeft/scrollWidth не должны «недо-детектить» край
const EDGE_EPS = 2;
const easeOutCubic = (p: number): number => 1 - Math.pow(1 - p, 3);

/**
 * Плавная горизонтальная карусель с виртуализацией.
 * Работает поверх `Virtuoso` в `horizontalDirection` — рендерит только видимые слайды.
 *
 * Скроллом управляем сами: собственная rAF-анимация с easing (без нативного smooth и без
 * CSS-snap, которые дёргают на релизе драга). Ручной ввод — колесо/трекпад + drag мышью +
 * нативный тач; по отпусканию «доводим» до ближайшего слайда (перетянул >50% → следующий).
 * Активный индекс и края считаются по реальной позиции скролла с клампом на границах —
 * поэтому последняя точка достижима и подсвечивается верно, а loop прыгает точно в начало/конец.
 *
 * @example
 * <UICarousel items={slides} renderItem={s => <Slide {...s} />} autoplayMs={4000} />
 */
function UICarouselInner<T>(
  {
    testId,
    items,
    renderItem,
    getItemKey,
    itemWidth = 320,
    gap = 16,
    height = 220,
    showArrows = true,
    showDots = true,
    loop = false,
    autoplayMs,
    className,
    style,
    ariaLabel = 'Карусель',
  }: IUICarouselProps<T>,
  ref: React.Ref<UICarouselHandle>,
): ReactNode {
  const [scroller, setScroller] = useState<HTMLElement | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [paused, setPaused] = useState(false);

  const total = items.length;
  // шаг прокрутки = ширина слайда + зазор; левый край слайда i = i * step
  const step = itemWidth + gap;

  // Свежие значения для next/prev/autoplay без ожидания ре-рендера.
  const activeIndexRef = useRef(0);
  const atStartRef = useRef(true);
  const atEndRef = useRef(false);
  // Флаги «идёт наша анимация» / «пользователь тащит» — чтобы idle-доводка не конфликтовала.
  const animRef = useRef<number | null>(null);
  const draggingRef = useRef(false);
  const settleTimer = useRef<number | null>(null);

  const cancelAnim = useCallback(() => {
    if (animRef.current !== null) {
      cancelAnimationFrame(animRef.current);
      animRef.current = null;
    }
  }, []);

  const maxScrollOf = (el: HTMLElement): number => el.scrollWidth - el.clientWidth;

  // rAF-анимация scrollLeft → target с easeOutCubic. Длительность растёт с дистанцией.
  const animateTo = useCallback(
    (targetLeft: number) => {
      if (!scroller) return;
      cancelAnim();
      const start = scroller.scrollLeft;
      const target = clamp(targetLeft, 0, maxScrollOf(scroller));
      const dist = target - start;
      if (Math.abs(dist) < 1) {
        scroller.scrollLeft = target;
        return;
      }
      const duration = clamp(250 + Math.abs(dist) * 0.4, 300, 650);
      const t0 = performance.now();
      const tick = (now: number): void => {
        const p = Math.min(1, (now - t0) / duration);
        scroller.scrollLeft = start + dist * easeOutCubic(p);
        if (p < 1) {
          animRef.current = requestAnimationFrame(tick);
        } else {
          animRef.current = null;
        }
      };
      animRef.current = requestAnimationFrame(tick);
    },
    [cancelAnim, scroller],
  );

  // Пересчёт активного индекса и краёв по реальной позиции — источник правды.
  // На краях кламп по позиции: у края scrollLeft упирается в max раньше, чем индекс дойдёт
  // до total-1 (видно несколько слайдов) — поэтому последний/первый форсим явно.
  const syncFromScroll = useCallback(
    (el: HTMLElement) => {
      const max = maxScrollOf(el);
      const start = el.scrollLeft <= EDGE_EPS;
      const end = el.scrollLeft >= max - EDGE_EPS;
      atStartRef.current = start;
      atEndRef.current = end;
      setAtStart(start);
      setAtEnd(end);
      let idx: number;
      if (end) idx = total - 1;
      else if (start) idx = 0;
      else idx = clamp(Math.round(el.scrollLeft / step), 0, total - 1);
      activeIndexRef.current = idx;
      setActiveIndex(idx);
    },
    [step, total],
  );

  // Доводка до ближайшего слайда (перетянул >50% → round уводит к следующему).
  const settleToNearest = useCallback(() => {
    if (!scroller) return;
    const idx = clamp(Math.round(scroller.scrollLeft / step), 0, total - 1);
    const target = Math.min(idx * step, maxScrollOf(scroller));
    if (Math.abs(target - scroller.scrollLeft) > 1) animateTo(target);
  }, [animateTo, scroller, step, total]);

  // Программный переход к индексу (кламп по краю → последний слайд достижим и кликается).
  const goTo = useCallback(
    (index: number) => {
      if (total === 0 || !scroller) return;
      const target = clamp(index, 0, total - 1);
      animateTo(Math.min(target * step, maxScrollOf(scroller)));
    },
    [animateTo, scroller, step, total],
  );

  const next = useCallback(() => {
    if (atEndRef.current || activeIndexRef.current >= total - 1) {
      if (loop) goTo(0);
      return;
    }
    goTo(activeIndexRef.current + 1);
  }, [goTo, loop, total]);

  const prev = useCallback(() => {
    if (atStartRef.current || activeIndexRef.current <= 0) {
      if (loop) goTo(total - 1);
      return;
    }
    goTo(activeIndexRef.current - 1);
  }, [goTo, loop, total]);

  // imperative API — behavior игнорируем (всегда своя плавная анимация)
  useImperativeHandle(
    ref,
    (): UICarouselHandle => ({ scrollToIndex: (index) => { goTo(index); }, next, prev }),
    [goTo, next, prev],
  );

  // Подписка на scroll + первичный замер. MutationObserver нужен, т.к. Virtuoso задаёт полную
  // ширину ленты inline-стилем на спейсере (ResizeObserver ловит только размер самого scroller,
  // не рост scrollWidth) — без него atEnd залипал бы с первого кадра.
  useEffect(() => {
    if (!scroller) return;
    syncFromScroll(scroller);
    let raf = 0;
    const onScroll = (): void => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => { syncFromScroll(scroller); });
      // idle-доводка только для пользовательского скролла (не во время нашей анимации/драга)
      if (animRef.current === null && !draggingRef.current) {
        if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
        settleTimer.current = window.setTimeout(() => { settleToNearest(); }, 140);
      }
    };
    scroller.addEventListener('scroll', onScroll, { passive: true });
    const ro = new ResizeObserver(() => { syncFromScroll(scroller); });
    ro.observe(scroller);
    const mo = new MutationObserver(() => { syncFromScroll(scroller); });
    mo.observe(scroller, { attributes: true, attributeFilter: ['style'], subtree: true, childList: true });
    return () => {
      cancelAnimationFrame(raf);
      if (settleTimer.current !== null) window.clearTimeout(settleTimer.current);
      scroller.removeEventListener('scroll', onScroll);
      ro.disconnect();
      mo.disconnect();
    };
  }, [scroller, settleToNearest, syncFromScroll]);

  // Колесо/трекпад: листаем ленту ТОЛЬКО горизонтальным жестом (deltaX доминирует).
  // Вертикальное колесо мыши (deltaY) не перехватываем — иначе мышь «угоняет» вертикальный
  // скролл страницы на горизонтальную ленту, это bad UX. Тачпад: свайп двумя пальцами
  // влево/вправо шлёт deltaX → лента листается; свайп вверх/вниз (deltaY) уходит странице.
  // Тач-экран сюда не попадает — он на нативном скролле (см. drag-эффект ниже).
  useEffect(() => {
    if (!scroller) return;
    const onWheel = (e: WheelEvent): void => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      const delta = e.deltaX;
      const max = maxScrollOf(scroller);
      const atBoundary =
        (delta < 0 && scroller.scrollLeft <= 0) || (delta > 0 && scroller.scrollLeft >= max);
      if (atBoundary) return;
      e.preventDefault();
      cancelAnim();
      scroller.scrollLeft += delta;
    };
    scroller.addEventListener('wheel', onWheel, { passive: false });
    return () => { scroller.removeEventListener('wheel', onWheel); };
  }, [cancelAnim, scroller]);

  // Drag-to-scroll мышью (touch/трекпад уже покрыты нативным скроллом + wheel).
  useEffect(() => {
    if (!scroller) return;
    let startX = 0;
    let startLeft = 0;
    let moved = false;

    const onPointerDown = (e: PointerEvent): void => {
      if (e.pointerType !== 'mouse' || e.button !== 0) return;
      draggingRef.current = true;
      moved = false;
      startX = e.clientX;
      startLeft = scroller.scrollLeft;
      cancelAnim();
    };
    const onPointerMove = (e: PointerEvent): void => {
      if (!draggingRef.current) return;
      const dx = e.clientX - startX;
      if (Math.abs(dx) > 3) {
        moved = true;
        scroller.style.userSelect = 'none';
      }
      scroller.scrollLeft = startLeft - dx;
    };
    const onPointerUp = (): void => {
      if (!draggingRef.current) return;
      draggingRef.current = false;
      scroller.style.removeProperty('user-select');
      if (moved) settleToNearest();
    };
    // клик по кнопке/ссылке внутри слайда после реального drag — гасим
    const onClickCapture = (e: MouseEvent): void => {
      if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
    };

    scroller.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);
    scroller.addEventListener('click', onClickCapture, true);
    return () => {
      scroller.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
      scroller.removeEventListener('click', onClickCapture, true);
    };
  }, [cancelAnim, scroller, settleToNearest]);

  // autoplay — таймер + пауза при hover / vis-hidden
  useEffect(() => {
    if (!autoplayMs || autoplayMs <= 0 || paused || total < 2) return;
    const id = window.setInterval(() => { next(); }, autoplayMs);
    return () => { window.clearInterval(id); };
  }, [autoplayMs, next, paused, total]);

  useEffect(() => {
    const onVis = (): void => { setPaused(document.hidden); };
    document.addEventListener('visibilitychange', onVis);
    return () => { document.removeEventListener('visibilitychange', onVis); };
  }, []);

  const handleScrollerRef = useCallback((el: HTMLElement | Window | null) => {
    setScroller(el instanceof HTMLElement ? el : null);
  }, []);

  const computeItemKey = useCallback(
    (index: number, item: T) => (getItemKey ? getItemKey(item, index) : index),
    [getItemKey],
  );

  const itemContent = useCallback(
    (index: number, item: T) => (
      <div
        // h-full: слайд обязан занять всю высоту viewport'а, иначе контент с h-full схлопнется в 0
        style={{ width: `${String(itemWidth)}px`, marginRight: `${String(gap)}px` }}
        className="h-full"
        aria-roledescription="slide"
        aria-label={`${String(index + 1)} из ${String(total)}`}
      >
        {renderItem(item, index)}
      </div>
    ),
    [gap, itemWidth, renderItem, total],
  );

  const resolvedStyle = useMemo<CSSProperties>(() => ({ ...style }), [style]);
  const heightValue = typeof height === 'number' ? `${String(height)}px` : height;

  const canPrev = loop || !atStart;
  const canNext = loop || !atEnd;

  if (total === 0) {
    return (
      <div
        data-name={testId ? `UICarousel-${testId}` : 'UICarousel'}
        className={cn(
          'flex items-center justify-center rounded-xl border border-border bg-card text-sm text-muted-foreground',
          className,
        )}
        style={{ height: heightValue, ...resolvedStyle }}
      >
        Нет данных
      </div>
    );
  }

  const arrowBase = cn(
    'absolute top-1/2 z-10 flex size-10 -translate-y-1/2 items-center justify-center rounded-full',
    'border border-border bg-card text-foreground shadow-lg transition-all',
    'hover:scale-110 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    'disabled:pointer-events-none disabled:opacity-30',
  );

  return (
    // Фокусируемый carousel-регион с arrow-key навигацией — паттерн из WAI-ARIA APG
    // (контейнер карусели делается tabbable). Мышиные хендлеры — pause-on-hover для autoplay.
    /* eslint-disable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
    <div
      data-name={testId ? `UICarousel-${testId}` : 'UICarousel'}
      role="region"
      aria-roledescription="carousel"
      aria-label={ariaLabel}
      className={cn('relative w-full', className)}
      style={resolvedStyle}
      onMouseEnter={() => { setPaused(true); }}
      onMouseLeave={() => { setPaused(false); }}
      onFocus={() => { setPaused(true); }}
      onBlur={() => { setPaused(false); }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
        if (e.key === 'ArrowRight') { e.preventDefault(); next(); }
      }}
      tabIndex={0}
    >
      {/* posWrap: НЕ обрезается (стрелки торчат наружу), высота = высоте слайдов → стрелки по центру */}
      <div className="relative" style={{ height: heightValue }}>
        {/* clip: только он обрезает ленту, стрелки — вне него, в боковых отступах */}
        <div className="h-full overflow-hidden rounded-xl">
          <Virtuoso
            scrollerRef={handleScrollerRef}
            horizontalDirection
            data={items}
            computeItemKey={computeItemKey}
            itemContent={itemContent}
            increaseViewportBy={itemWidth * 2}
            style={{ height: '100%' }}
            // скрываем нативные скроллбары (обе оси) + grab-курсор для drag; snap не используем (JS-доводка)
            className={cn(
              'h-full cursor-grab overflow-y-hidden active:cursor-grabbing',
              '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
            )}
          />
        </div>

        {showArrows && total > 1 && (
          <>
            <button
              type="button"
              onClick={prev}
              disabled={!canPrev}
              aria-label="Предыдущий"
              // стрелка снаружи слева: right-edge на 12px левее клипа
              className={cn(arrowBase, 'left-0 -translate-x-[calc(100%+0.75rem)]')}
            >
              <UIIcons.ChevronLeft className="size-5" />
            </button>
            <button
              type="button"
              onClick={next}
              disabled={!canNext}
              aria-label="Следующий"
              className={cn(arrowBase, 'right-0 translate-x-[calc(100%+0.75rem)]')}
            >
              <UIIcons.ChevronRight className="size-5" />
            </button>
          </>
        )}
      </div>

      {showDots && total > 1 && total <= 12 && (
        <div className="mt-3 flex items-center justify-center gap-1.5" role="tablist">
          {items.map((it, i) => (
            <button
              key={getItemKey ? getItemKey(it, i) : i}
              type="button"
              role="tab"
              aria-selected={i === activeIndex}
              aria-label={`Слайд ${String(i + 1)}`}
              onClick={() => { goTo(i); }}
              className={cn(
                'h-1.5 rounded-full transition-all',
                i === activeIndex ? 'w-6 bg-primary' : 'w-1.5 bg-muted hover:bg-muted-foreground/40',
              )}
            />
          ))}
        </div>
      )}

      {showDots && total > 12 && (
        <div className="mt-3 text-center text-xs tabular-nums text-muted-foreground">
          {activeIndex + 1} / {total}
        </div>
      )}
    </div>
    /* eslint-enable jsx-a11y/no-noninteractive-element-interactions, jsx-a11y/no-noninteractive-tabindex */
  );
}

const UICarouselForwarded = forwardRef(UICarouselInner) as <T>(
  props: IUICarouselProps<T> & { ref?: React.Ref<UICarouselHandle> },
) => ReactNode;

export const UICarousel = memo(UICarouselForwarded) as typeof UICarouselForwarded;
