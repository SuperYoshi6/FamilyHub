
import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.familienhub.app',
  appName: 'FamilyHub',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: true
  },
  ios: {
    scheme: 'FamilyHub',
    contentInset: 'always',
    preferredContentMode: 'mobile',
  },
  plugins: {
    LocalNotifications: {
      smallIcon: "notification_icon",
      iconColor: "#FFFFFF",
      sound: "beep.wav",
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
