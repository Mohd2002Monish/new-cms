import { registerRootComponent } from 'expo';
import { enableScreens } from 'react-native-screens';
import App from './App';

// Initialize react-native-screens for Android fragment lifecycle stability
enableScreens(true);

registerRootComponent(App);
