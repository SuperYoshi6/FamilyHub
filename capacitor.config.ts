
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.familienhub.app',
  appName: 'FamilyHub',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "ic_stat_logo", // Muss in Android Studio als 'Notification Icon' angelegt werden
      iconColor: "#8b5cf6", // Violett (Brand Color) statt Blau, damit es zum Logo passt
      sound: "beep.wav",
    },
  },
};

export default config;
