import type { Preview, StoryContext } from '@storybook/react-vite';
import { withThemeByClassName } from '@storybook/addon-themes';

import '../src/styles/tokens.css';

// Storybook сериализует memo/forwardRef-обёртки как <React.Memo> / <React.ForwardRef>,
// т.к. displayName стоит на внутреннем компоненте, а не на обёртке. Подменяем на реальное
// имя компонента (последний сегмент title) — нативный «Show code» показывает верное usage.
const fixWrapperNames = (code: string, context: StoryContext): string => {
  const name = context.title.split('/').pop() ?? 'Component';
  return code.replace(/React\.Memo\b/g, name).replace(/React\.ForwardRef\b/g, name);
};

const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: { matchers: { color: /(background|color)$/i, date: /Date$/i } },
    options: {
      // Порядок групп в сайдбаре: сначала базовые атомы, потом составные и «эффектные».
      // '*' — всё неперечисленное идёт следом по алфавиту.
      storySort: {
        order: ['Forms', 'Data Display', 'Feedback', 'Overlay', 'Navigation', 'Lists', 'Effects', 'Icons', '*'],
      },
    },
    docs: {
      // Правит нативный «Show code»: memo/forwardRef-обёртки → реальное имя компонента.
      source: { transform: fixWrapperNames },
    },
  },
  decorators: [
    // тулбар light/dark — переключает класс .dark на обёртке, токены меняются автоматически
    withThemeByClassName({ themes: { light: '', dark: 'dark' }, defaultTheme: 'light' }),
  ],
};

export default preview;
