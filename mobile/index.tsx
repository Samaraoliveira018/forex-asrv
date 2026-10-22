import { registerRootComponent } from 'expo';
import { App } from './src/App';
import { BffProvider } from './src/BffContext';
import { bff } from './src/bff';

function Root() {
  return (
    <BffProvider bff={bff}>
      <App />
    </BffProvider>
  );
}

registerRootComponent(Root);
