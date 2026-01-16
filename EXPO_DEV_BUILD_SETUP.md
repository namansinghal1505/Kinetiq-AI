# Expo Dev Build Setup Guide

This guide explains how to switch from **Expo Go** to **Expo Dev Build** and how to develop with it.

## What is Expo Dev Build?

- **Custom Development Client**: A native app built specifically for your project
- **Full Native Modules**: Supports all Expo SDK modules and custom native code
- **Better for Production**: Closer to what your final app will look like
- **Works Offline**: After initial setup, can work without internet in many cases

vs. **Expo Go** which is a pre-built app with limitations on native modules.

## Prerequisites

1. **EAS CLI** installed globally:
   ```bash
   npm install -g eas-cli
   ```

2. **Xcode** (for iOS development) - comes with Command Line Tools
3. **Android Studio** (for Android development)
4. **Node.js** and **npm** installed

## Step 1: Install Dependencies

```bash
npm install
```

This will install `expo-dev-client` which was added to package.json.

## Step 2: Build the Dev Client

### Option A: Build for Android (Physically attached device)

```bash
eas build --platform android --profile development
```

This creates an APK that you can install directly on your Android device.

### Option B: Build for iOS (Mac required)

```bash
eas build --platform ios --profile development
```

This creates an IPA file for iOS devices.

### Option C: Local Build (Recommended for fast iteration)

If you have Android Studio or Xcode set up locally:

**Android:**
```bash
eas build --platform android --profile development --local
```

**iOS:**
```bash
eas build --platform ios --profile development --local
```

## Step 3: Install the Built App

### Android APK
1. Download the APK from the EAS build link
2. Run: `adb install path/to/app-release.apk`
3. Or tap the link on your phone to download and install

### iOS IPA
1. Download the IPA
2. Use Xcode or Transporter to install
3. Or use TestFlight for easier testing

## Step 4: Start Development Server

Once the dev client is installed on your device:

```bash
npm start
```

or use the command shortcuts:

```bash
npm run android   # For Android
npm run ios       # For iOS
npm run web       # For web (still uses Expo Go equivalent)
```

A QR code will appear. Scan it with your dev build app (similar to Expo Go, but using your custom build).

## Development Workflow

1. **Make code changes** in your editor
2. **Save the file** - Metro bundler auto-refreshes
3. **See changes** in your dev client app
4. **Use Fast Refresh** for quick iteration
5. **Reload** with R key or shake device to force reload

## Rebuilding the Dev Client

You only need to rebuild when:
- Adding new native dependencies
- Changing `app.json` or `eas.json`
- Adding new Expo plugins
- Updating native code

For normal code changes, just use `npm start` - Fast Refresh will handle it.

## Configuration

### eas.json
The `eas.json` file defines build profiles:

- **development**: Optimized for development (faster, with debugging tools)
- **preview**: For testing with similar settings to production
- **production**: Optimized for app store submission

### app.json
Your app configuration remains the same. The dev build respects all your settings.

## Troubleshooting

### Build Fails
- Check that your EAS account is set up: `eas login`
- Ensure you have sufficient storage on device
- Review build logs: `eas build --platform android --platform ios`

### App Crashes
- Check device logs: `adb logcat` (Android)
- Check Xcode console (iOS)
- Ensure all dependencies are properly installed

### Can't Connect to Dev Server
- Ensure device and computer are on same Wi-Fi network
- Try: `npm start -- --localhost`
- Clear Metro cache: `npm start -- --clear`

## Going Back to Expo Go

If you need to revert to Expo Go temporarily:

1. Comment out `expo-dev-client` from dependencies (or remove)
2. Run `npm install`
3. Delete the dev build app from your device
4. Use `expo go` app as before

## Resources

- [Expo Dev Client Documentation](https://docs.expo.dev/develop/development-builds/introduction/)
- [EAS Build Documentation](https://docs.expo.dev/eas-build/introduction/)
- [Metro Bundler Documentation](https://docs.expo.dev/guides/metro/)

## Summary of Changes Made

✅ Added `expo-dev-client` to dependencies
✅ Created `eas.json` with build profiles
✅ Ready to build and develop with custom dev builds

Next step: Run `eas build --platform android --profile development` or follow Step 2 above.
