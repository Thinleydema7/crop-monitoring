# CropCare Android — first checkpoint

TypeScript Expo app with on-device TFLite crop screening. A development build is required for native inference.

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

## On-device crop model

The app bundles `assets/model/best.tflite` and uses `react-native-fast-tflite` for local inference on gallery photos and sampled camera images. The adapter resizes with letterboxing, decodes the YOLO26s output, applies NMS, and maps boxes to the original photo. Adding or replacing the model/runtime requires a native development build; restart Metro after the `.tflite` asset configuration changes. Results are screening aids that need officer review, and no detections do not guarantee a healthy crop. See `shared/MODEL-CONTRACT.md` for model metadata and adapter assumptions. Camera sampling is not high-rate frame processing.

## Java 21 builds

Use `npm run android -- --device` to select the installed JDK 21 and build. A guarded postinstall script updates the four React Native 0.86.3 Gradle plugin toolchains from 17 to 21 while preserving their bytecode compatibility targets. Review this customization on React Native upgrades. Direct `npx expo run:android` uses your shell's Java selection.
