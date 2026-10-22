import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  stories: ['../stories/**/*.stories.@(ts|tsx)'],
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  viteFinal: (viteConfig) => {
    const resolve = viteConfig.resolve ?? {};
    const existing = resolve.alias;
    const aliases = Array.isArray(existing)
      ? existing
      : existing
        ? Object.entries(existing).map(([find, replacement]) => ({
            find,
            replacement: replacement as string,
          }))
        : [];

    resolve.alias = [
      ...aliases,
      // Permite renderizar os componentes native no Storybook web.
      { find: /^react-native$/, replacement: 'react-native-web' },
    ];
    viteConfig.resolve = resolve;

    return viteConfig;
  },
};

export default config;
