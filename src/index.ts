// Подключение стилей здесь (а не только в .storybook/preview) нужно, чтобы Vite
// попал в CSS-граф при library build и собрал dist/styles.css. sideEffects:["**/*.css"]
// в package.json гарантирует, что tree-shaking не выкинет этот импорт у consumer'а.
import './styles/tokens.css';

export * from './lib/cn';
export * from './icons';
export * from './components';
