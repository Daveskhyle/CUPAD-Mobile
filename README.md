# CUPAD Mobile

CUPAD mobile application built with Expo, React Native and Expo Router.

## Architecture

The mobile app is a frontend for the existing CUPAD PHP/MySQL system. The `server-api` directory contains the mobile-facing PHP API layer.

```text
CUPAD Mobile (Expo / React Native)
        |
        | HTTPS + JSON + JWT
        v
CUPAD PHP API (/api/v1)
        |
        v
Existing CUPAD MySQL database
```

## API configuration

Set the production API URL through the Expo environment:

```bash
EXPO_PUBLIC_API_BASE_URL=https://your-domain.example/api/v1
```

Do not commit database passwords, JWT secrets, API keys, or other credentials to the mobile repository.

## Development

```bash
npm install
npx expo start
```

Check the project before building:

```bash
npx expo-doctor
npx tsc --noEmit
```

## Current mobile modules

- Authentication and persistent JWT session
- Dashboard and role-aware navigation
- Client search and client details
- Client registration
- Savings collection and withdrawal
- Loan collection and disbursement
- Client portfolio, savings, loans and transactions
- Officer activity history
- Dashboard statistics
- Local SQLite storage layer for offline-first expansion

Expo Router provides file-based navigation for the native application. See the official Expo Router documentation for current APIs and compatibility guidance.
