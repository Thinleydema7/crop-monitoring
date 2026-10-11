# CropCare connected demonstration

Android farmer app → shared API and saved reports ← officer dashboard. Demo accounts are for local demonstrations only.

## Start the backend and dashboard

```sh
cd server
npm install
npm run dev
```

Open http://localhost:4000 for the officer dashboard. Officer: `officer@cropcare.test` / `Officer123!`. Farmer: `farmer@cropcare.test` / `Farmer123!`. Keep `server/.env` with PORT=4000 and a private JWT_SECRET of at least 32 characters.

## Android

Connect an authorized Android phone and run in another terminal:

```sh
cd mobile
npm install
npm run android -- --device
```

Java 21 is selected by this script. Guarded dependency patches preserve Java 17 Android bytecode compatibility. The updated native camera/SQLite/network libraries require rebuilding the development app once. Subsequent JavaScript changes use `npx expo start --dev-client --lan`.

Set `EXPO_PUBLIC_API_URL=http://YOUR_MAC_IP:4000/api` in mobile/.env, or use the app's Connection settings. A physical phone cannot reach the laptop using localhost. Both devices need a network that allows traffic between them.

## Connected flow

Choose crop, gallery photo or camera frame, and automatic location. Reports save first to SQLite plus a durable photo in the app's document directory. The foreground app retries on connectivity changes and every 30 seconds. History lists local drafts separately from submitted reports. Only confirmed submissions leave the queue. Server deduplication uses farmer ID plus submission ID. Queued 400/403/413 errors require attention and manual retry; expired sessions require login.

The dashboard offers crop/status/search filters, original and annotated photos, location/map details, diagnosis, recommendation, and append-only review history. Concurrent reviews use a version check. Refresh phone history to receive advice.

## Detection status

The real model is still being trained. Camera sampling and optional gallery detections are clearly marked SIMULATED DEMO and must not be treated as disease findings. See shared/MODEL-CONTRACT.md for the adapter handoff. Capture retains the displayed sampled frame; the backend preserves the original upload and generates an annotated copy at matching dimensions. The camera unmounts when closed and pauses when the app backgrounds. Real high-rate frame processing and device performance validation remain pending the model runtime.

## Standalone preview APK

The preview APK bundles JavaScript and opens without Metro. The online backend must still be reachable. Settings can change its address. This local demo permits HTTP; use HTTPS for deployment.

EAS profiles are saved in mobile/eas.json. Local build: run `npm run apk` from mobile. This prebuilds Android, reapplies the Java 21 configuration, assembles release, and copies the result to deliverables/CropCare-preview.apk. The local APK targets the connected phone’s arm64 architecture. Local preview signing is a debug key and is for demonstration, not Play Store release.

## Verification

```sh
cd server
npm run build
npm test
```

```sh
cd mobile
npx tsc --noEmit
```

Physical-device checks: camera permission denial/retry, location off/denied, gallery cancel, background/close camera, offline save/restart/reconnect, failed uploads, one report after retries, officer advice after refresh, standalone APK launch with Metro stopped.

JSON storage is for one backend process. Production requires a database, TLS, managed image storage, account provisioning, rate limiting and deployment work. Existing reports are preserved.

## Farmer sign-up

On the phone, Sign out then select New farmer? Sign up. Enter name, email, a password of at least 8 characters (maximum 72 UTF-8 bytes), and matching confirmation. Registration requires the reachable backend. Successful registration signs in immediately; hashed accounts persist in server/storage/users.json across restarts. Duplicate emails are rejected case-insensitively, including demo account emails. Officer self-registration is rejected. Email verification and password recovery are not implemented.

## Yoesar interface

The app now displays Yoesar (a new way to grow). Android package identity stays com.cropcare.farmer to preserve existing installation data. Preview: deliverables/Yoesar-preview.apk. The supplied AI Crop Health Monitoring System design export guides the Home actions, stepped reporting, icon navigation, report cards, profile and officer review. Native safe-area insets protect the bottom navigation and modal screens.

## Officer report map

The inbox map shows saved report coordinates and follows the crop, status and search filters. Select a pin to open its report; reports within 25 metres are listed together in the popup. The individual report map draws GPS accuracy as a shaded circle. Pins represent reported crop locations, not confirmed disease. Leaflet 1.9.4 is served locally from web/vendor/leaflet; OpenStreetMap background tiles require internet and display attribution. No API key is needed for the current demo. Coordinates remain available if background tiles cannot load. Verified in the browser: pin selection opens the correct report, accuracy map, filter-to-empty results, restoring filters and loaded map tiles.
