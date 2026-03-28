
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
      smallIcon: "notification_icon",
      iconColor: "#FFFFFF",
      sound: "beep.wav",
    },
  },
};

export default config;
