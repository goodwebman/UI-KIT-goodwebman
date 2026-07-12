import '@testing-library/jest-dom/vitest';

// jsdom не реализует ResizeObserver — нужен виртуализованным компонентам (UICarousel и т.п.).
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  };
}

// jsdom не реализует matchMedia — нужен компонентам с useMediaQuery/useReducedMotion.
if (typeof globalThis.matchMedia !== 'function') {
  globalThis.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
