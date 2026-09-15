# 3D Object Analyzer

An Expo mobile gallery that turns a photo into an AI-assisted object breakdown and interactive exploded view.

> This project uses Expo exclusively. Do not run it through React Native CLI or generate native projects unless a documented native requirement is explicitly approved.

## Status

Phase 2 provides a persistent local gallery, multi-photo import, camera capture and preview, zoomable photo detail, simple rotation editing, sharing, deletion, and metadata. Supabase, Gemini analysis, and the exploded view arrive in later phases.

## Stack

- Expo SDK 54 / React Native 0.81
- TypeScript and Expo Router
- Supabase (planned for Phase 3)
- Google Gemini behind a Supabase Edge Function (planned for Phase 4)
- EAS Build for development, preview, and production

## Requirements

- Node.js 20.19 or newer
- npm
- Expo Go matching SDK 54, or an Expo Development Build when native capabilities require it

## Install and develop

```bash
npm install
npx expo start
```

On PowerShell, create the local environment file with:

```powershell
Copy-Item .env.example .env
```

The Expo command prints a QR code. The developer chooses where to open it; project scripts do not launch emulators or simulators.

## Environment variables

Only publishable Supabase values may exist in the Expo client:

```text
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
```

Every `EXPO_PUBLIC_` value is embedded in the client bundle. `GEMINI_API_KEY`, Supabase service-role keys, and other secrets must only be stored server-side as Supabase Edge Function secrets.

## Quality checks

```bash
npm run typecheck
npm run lint
npm run format:check
npx expo-doctor
```

## Architecture

- `app/`: Expo Router screens and layouts
- `components/`: feature and shared UI components
- `services/ai/`: provider-neutral AI contract and Gemini adapter boundary
- `services/analysis/`: normalized analysis and exploded-view generation contracts
- `services/photos/`, `services/storage/`: gallery persistence boundaries
- `types/`: shared domain models
- `supabase/`: migrations and Edge Functions

The intended analysis flow is:

```text
UI → useObjectAnalysis → ObjectAnalysisService → AIService
   → normalized ObjectAnalysis → ExplodedViewGenerator → Renderer
```

AI output must label components as identified, inferred, or unknown and must never present uncertain internal parts as observed facts.

Photos are copied from temporary picker/camera locations into the app document directory. Metadata is stored locally behind `PhotoRepository`, allowing Phase 3 to add a Supabase-backed implementation without coupling UI components to Supabase.

## Expo and EAS workflow

1. Develop with `npx expo start` and Expo Go while supported.
2. Move to an Expo Development Build only when native modules require it.
3. Create internal previews with `eas build --profile preview`.
4. Create store builds with `eas build --profile production`.

Never use `npx react-native run-android` or `npx react-native run-ios`.

## Development Build

The app is linked to the EAS project `@digaz_web_dev/3d-object-analyzer`. Authenticate without sharing credentials:

```bash
eas login
eas whoami
```

Create an installable Android Development Build:

```bash
eas build --platform android --profile development
```

After installing the APK on a physical device, start Metro for the development client:

```bash
npx expo start --dev-client
```

The user chooses the physical device from the development client. No project command starts an emulator or simulator automatically.

A future physical-device iOS build uses the same profile and requires an Apple Developer account:

```bash
eas build --platform ios --profile development
```

## Supabase setup (Phase 3)

Phase 3 will add migrations, Row Level Security, private per-user Storage paths, and authentication. Do not create production tables manually before those migrations exist.

## Troubleshooting

- Run `npx expo-doctor` when Expo reports dependency mismatches.
- Run `npx expo install --fix` to align packages with SDK 54.
- Expo Go and the project must use the same SDK. SDK 54 is intentionally pinned for App Store Expo Go compatibility; upgrading requires reviewing current Expo Go availability and native-module compatibility.
- Delete `.expo/` and restart Metro if local cache metadata becomes stale.
