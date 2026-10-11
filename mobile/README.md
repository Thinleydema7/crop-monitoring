# CropCare Android — first checkpoint

TypeScript Expo app. Use a development build for future native inference libraries.

## Run on an Android phone

Dependencies and expo-dev-client are installed. Run from this folder:

```sh
npx expo run:android --device
```

Requires Android SDK, Java, USB debugging and an authorized connected phone. This creates and installs a development build. On later launches:

```sh
npx expo start --dev-client --lan
```

The phone and laptop must be on the same network. Verify the CropCare starter screen opens before adding login or camera features.

## APK builds with EAS

Sign into your Expo account, configure the project, then build:

```sh
npx eas-cli@latest login
npx eas-cli@latest build:configure
npx eas-cli@latest build --platform android --profile development
```

Development APKs need the development server. The `preview` profile produces a standalone APK with bundled JavaScript:

```sh
npx eas-cli@latest build --platform android --profile preview
```

An online backend is still needed for reporting and advice. Backend URLs and account setup will be added after inspecting the existing dashboard. Never use laptop localhost as a physical phone API URL.

Official guidance: https://docs.expo.dev/develop/development-builds/introduction/ and https://docs.expo.dev/build-reference/apk/

## Java 21 builds

Use `npm run android -- --device` to select the installed JDK 21 and build. A guarded postinstall script updates the four React Native 0.86.3 Gradle plugin toolchains from 17 to 21 while preserving their bytecode compatibility targets. Review this customization on React Native upgrades. Direct `npx expo run:android` uses your shell's Java selection.
