import type { Preview } from '@storybook/react';
import '../src/web/styles.css';
import './preview.css';

const preview: Preview = {
  parameters: {
    layout: 'centered',
    controls: { expanded: true },
  },
};

export default preview;
