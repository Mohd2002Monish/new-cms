import { registerRootComponent } from 'expo';
import logger from './src/utils/logger';
import App from './App';

// Set up global uncaught JS exception handler for React Native
if (global.ErrorUtils) {
  const originalHandler = global.ErrorUtils.getGlobalHandler();
  global.ErrorUtils.setGlobalHandler((error, isFatal) => {
    logger.error('GLOBAL_EXCEPTION', `${isFatal ? '[FATAL] ' : ''}${error?.message || 'Uncaught Exception'}`, error);
    if (originalHandler) {
      originalHandler(error, isFatal);
    }
  });
}

registerRootComponent(App);
