# Android Studio Setup Guide 📱

To finalize your FamilyHub release on Android, follow these steps to set up the icon and splash screen correctly.

## 1. App Icon Setup
1. Open your project in **Android Studio**.
2. Right-click on the `app` folder -> **New** -> **Image Asset**.
3. **Icon Type**: Select `Launcher Icons (Adaptive and Legacy)`.
4. **Name**: Keep it as `ic_launcher`.
5. **Foreground Layer**:
   - **Path**: Select your `icon.png` (without text).
   - **Scaling**: Resize it so it fits within the safe "inner circle".
6. **Background Layer**:
   - Select **Color** or an image. For Liquid Glass, a subtle dark blue or a gradient matching your app looks best.
7. Click **Next** and **Finish**.

## 2. Notification Icon (Critical!)
Your code looks for `ic_stat_logo`.
1. Right-click `app` folder -> **New** -> **Image Asset**.
2. **Icon Type**: Select `Action Bar and Tab Icons`.
3. **Name**: Change it to `ic_stat_logo`.
4. **Asset Type**: Use the same `icon.png`.
5. **Theme**: Custom (set to White).
6. Click **Next** and **Finish**.

## 3. Splash Screen
Capacitor uses the `SplashScreen` plugin.
1. Place your logo in `android/app/src/main/res/drawable/`.
2. Update `android/app/src/main/res/values/styles.xml` to point to your new splash image.

## 4. Building the APK
Run the following commands in your terminal:
```bash
npx cap sync android
npx cap open android
```
In Android Studio, go to **Build** -> **Build Bundle(s) / APK(s)** -> **Build APK(s)**.

---
**Tip:** For the Liquid Glass look, ensure your "Adaptive Icon" background color matches the `liquid-glass` background in your `index.html`.
