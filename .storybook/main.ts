import type { StorybookConfig } from '@storybook/react-vite';
import tailwindcss from '@tailwindcss/vite';

// В статической сборке (Vercel) vitest-раннера нет — панель тестов всё равно нежива,
// а addon тянет лишний вес в бандл.
const isStaticDeploy = Boolean(process.env.VERCEL);

const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],
  addons: [
    '@storybook/addon-docs',
    '@storybook/addon-a11y',
    '@storybook/addon-themes',
    ...(isStaticDeploy ? [] : ['@storybook/addon-vitest']),
  ],
  framework: { name: '@storybook/react-vite', options: {} },
  viteFinal: async (config) => {
    // Билдер подхватывает корневой vite.config.ts, а там vite-plugin-dts для lib-сборки:
    // при сборке Storybook он бесполезен и роняет билд на любой ошибке типов.
    config.plugins = (config.plugins ?? []).filter(
      (plugin) => !(plugin && typeof plugin === 'object' && 'name' in plugin && plugin.name === 'vite:dts'),
    );
    config.plugins.push(tailwindcss());
    return config;
  },
};

export default config;
