# EBEN Mobile

EBEN Mobile is a bilingual B2B2C auto-parts marketplace for Morocco. It connects clients looking for vehicle parts with prestataires (service providers and ferrailleurs).

## Features

- Separate Client and Prestataire experiences with role-based route access
- Product discovery, categories, search, wishlist, cart, and checkout
- Part requests, provider offers, orders, and shipment workflows
- Vehicle, address, profile, notification, and wallet management
- French and Arabic localization with LTR and RTL support
- Typed API resources backed by local mock data during development

## Tech stack

- Expo SDK 51 and Expo Router 3
- React Native 0.74 and React 18
- TypeScript in strict mode
- React i18next
- AsyncStorage and Expo SecureStore
- Jest with `jest-expo`

## Getting started

### Prerequisites

- Node.js and npm
- Expo Go, an Android emulator, or an iOS simulator

### Installation

```bash
npm install
npm run start
```

Follow the Expo prompt to open the app on a device or simulator.

## Commands

```bash
npm run start    # Start the Expo development server
npm run android  # Build and run the Android app
npm run ios      # Build and run the iOS app
npm run web      # Start the web version
npm run lint     # Run Expo ESLint
npm test         # Run Jest in watch mode
```

## Project structure

```text
src/
├── api/           # API client, typed resources, and mock registry
├── app/           # Expo Router routes grouped by role
│   ├── (auth)/
│   ├── (client)/
│   └── (prestataire)/
├── components/    # Shared UI components
├── constants/     # App constants and route permissions
├── context/       # Authentication and application providers
├── interfaces/    # Shared domain types
└── localization/  # French and Arabic translations
```

## API configuration

The app currently serves data through the mock registry in `src/api/mock/`. API calls are centralized in `src/api/client.ts`, and the backend base URL can be configured with:

```bash
EXPO_PUBLIC_API_BASE_URL=https://example.com/api/v1
```

Setting the variable alone does not enable live requests; the mock request block in `src/api/client.ts` must be replaced with the prepared `fetch` implementation when the backend integration is ready.

## Localization

User-facing copy lives in:

- `src/localization/fr.json`
- `src/localization/ar.json`

Keep translation keys synchronized and verify visual changes in both French/LTR and Arabic/RTL.
