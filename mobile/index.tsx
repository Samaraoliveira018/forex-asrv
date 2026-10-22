import { registerRootComponent } from 'expo';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { App } from './src/App';
import { BffProvider } from './src/BffContext';
import { bff } from './src/bff';

function Root() {
  return (
    <SafeAreaProvider>
      <BffProvider bff={bff}>
        <App />
      </BffProvider>
    </SafeAreaProvider>
  );
}

registerRootComponent(Root);
