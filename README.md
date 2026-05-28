# AbsensiKu Mobile

Aplikasi absensi mobile berbasis QR Code menggunakan React Native + Expo.

## Fitur

### Admin
- Dashboard statistik kehadiran real-time
- Generate QR Code absensi dengan durasi custom
- Daftar absensi dengan filter & pencarian
- Laporan bulanan (ringkasan, breakdown harian & per karyawan)
- Manajemen karyawan (tambah & lihat daftar)

### Karyawan
- Beranda dengan status absensi hari ini
- Scan QR Code untuk absensi otomatis
- Riwayat kehadiran pribadi
- Profil pengguna

## Tech Stack

- **Mobile**: React Native + Expo SDK 52
- **Navigation**: React Navigation 7
- **Backend**: Express.js + Firebase Firestore
- **QR Code**: qrcode (server) + expo-barcode-scanner (client)
- **Auth**: Custom token-based dengan Expo SecureStore

## Quick Start

```bash
# Install dependencies
npm install

# Install backend dependencies
cd backend && npm install && cd ..

# Start backend
cd backend && npm run dev

# Start mobile app
npx expo start
```

## Default Admin

| Field | Value |
|-------|-------|
| Email | admin@absensi.com |
| Password | admin123 |

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `FIREBASE_PROJECT_ID` | Firebase project ID | `gen-lang-client-0173847591` |
| `FIREBASE_CREDENTIAL` | Base64-encoded service account JSON | - |
| `EXPO_PUBLIC_API_URL` | Backend API URL (embedded at build time) | `http://10.0.2.2:3000/api` |
| `PORT` | Backend server port | `3000` |

## Building with EAS

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build preview APK
eas build --platform android --profile preview

# Build production APK
eas build --platform android --profile production
```

## GitHub Actions

Push ke branch `main` akan otomatis mem-build APK melalui EAS Build. Manual trigger juga tersedia di tab Actions.
