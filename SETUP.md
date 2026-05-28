# AbsensiKu Mobile - Setup Guide

## 📱 Tentang AbsensiKu

AbsensiKu adalah aplikasi absensi mobile yang menggunakan QR Code untuk mencatat kehadiran karyawan. Aplikasi ini mendukung dua role: **Admin** dan **Karyawan**, masing-masing dengan fitur yang berbeda.

## 🛠 Prerequisites

- **Node.js** >= 18.x
- **npm** atau **bun**
- **Expo CLI** (`npm install -g expo-cli`)
- **Android Studio** (untuk emulator Android) atau **Xcode** (untuk iOS Simulator)
- **Firebase Project** dengan Firestore enabled

## 📋 Fitur

### Admin
- Dashboard dengan statistik kehadiran
- Generate QR Code untuk absensi
- Melihat daftar absensi dengan filter & pencarian
- Laporan bulanan (ringkasan, breakdown harian, breakdown per karyawan)
- Tambah & lihat daftar karyawan

### Karyawan
- Beranda dengan status absensi hari ini
- Scan QR Code untuk absensi
- Riwayat kehadiran
- Profil pengguna

## 🚀 Installation

### 1. Clone / Setup Project

```bash
cd absensi-mobile
```

### 2. Install Mobile App Dependencies

```bash
npm install
```

### 3. Setup Backend

```bash
cd backend
npm install
```

### 4. Firebase Configuration

Pastikan file kredensial Firebase ada di:
```
/home/z/my-project/upload/gen-lang-client-0173847591-firebase-adminsdk-fbsvc-0c9f6c5c70.json
```

Jika file tidak ada, server akan menggunakan konfigurasi default dengan Project ID.

### 5. Start Backend Server

```bash
cd backend
npm run dev
```

Server akan berjalan di `http://localhost:3000`

### 6. Start Mobile App

```bash
# Di terminal baru
cd absensi-mobile
npx expo start
```

Pilih platform:
- `a` - Android
- `i` - iOS
- `w` - Web

## 🔐 Default Admin Account

| Field | Value |
|-------|-------|
| Email | admin@absensi.com |
| Password | admin123 |

Admin akan di-seed otomatis saat server pertama kali dijalankan.

## 📡 API Endpoints

### Auth
- `POST /api/auth/login` - Login
- `POST /api/auth/register` - Register

### Attendance
- `GET /api/attendance` - Get all attendance (with filters)
- `GET /api/attendance/my` - Get my attendance (by uid)
- `GET /api/attendance/stats` - Get attendance statistics
- `POST /api/attendance` - Create attendance
- `PUT /api/attendance/:id` - Update attendance
- `DELETE /api/attendance/:id` - Delete attendance

### QR Code
- `POST /api/qr/generate` - Generate QR code
- `GET /api/qr/active` - Get active QR code
- `POST /api/qr/scan` - Scan QR code

### Reports
- `GET /api/reports/summary` - Get reports summary
- `GET /api/reports/employee/:uid` - Get employee report

### Users
- `GET /api/users` - Get all users
- `GET /api/users/:uid` - Get user by UID

### Health
- `GET /api/health` - Health check

## 🔧 Troubleshooting

### Firebase Connection Error
- Pastikan Firebase project sudah aktif
- Periksa file kredensial di path yang benar
- Cek Firestore rules (pastikan allow read/write untuk development)

### API Connection Error (Android Emulator)
- Gunakan `http://10.0.2.2:3000/api` sebagai BASE_URL
- Untuk physical device, gunakan IP address komputer yang sama dengan WiFi

### Expo Metro Bundler Error
```bash
npx expo start --clear
```

### Camera Permission Error
- Pastikan permission CAMERA sudah ditambahkan di `app.json`
- Reset permission di Settings > Apps > AbsensiKu

### npm install Error
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📁 Project Structure

```
absensi-mobile/
├── App.js                          # Root app component
├── app.json                        # Expo configuration
├── babel.config.js                 # Babel configuration
├── package.json                    # Dependencies
├── SETUP.md                        # This file
├── backend/
│   ├── package.json                # Backend dependencies
│   └── server.js                   # Express.js API server
└── src/
    ├── components/
    │   ├── AttendanceItem.js       # Attendance list item
    │   ├── CustomHeader.js         # Admin header
    │   ├── EmptyState.js           # Empty state component
    │   ├── LoadingScreen.js        # Loading screen
    │   └── StatCard.js             # Stat card component
    ├── context/
    │   └── AuthContext.js           # Authentication context
    ├── navigation/
    │   ├── AdminNavigator.js        # Admin navigation
    │   ├── AppNavigator.js          # Root navigation
    │   └── KaryawanNavigator.js     # Karyawan navigation
    ├── screens/
    │   ├── auth/
    │   │   └── LoginScreen.js       # Login screen
    │   ├── admin/
    │   │   ├── AdminDashboard.js    # Admin dashboard
    │   │   ├── AttendanceList.js    # Attendance list
    │   │   ├── EmployeeList.js      # Employee list
    │   │   ├── GenerateQR.js        # QR generator
    │   │   ├── Reports.js           # Reports
    │   │   └── AddEmployee.js       # Add employee form
    │   └── karyawan/
    │       ├── AttendanceHistory.js # Attendance history
    │       ├── KaryawanHome.js      # Karyawan home
    │       ├── Profile.js           # Profile
    │       └── ScanQR.js            # QR scanner
    ├── services/
    │   └── api.js                   # API service
    └── utils/
        └── helpers.js               # Utility functions
```

## 📝 Tech Stack

- **Mobile**: React Native + Expo
- **Navigation**: React Navigation 7
- **Backend**: Express.js
- **Database**: Firebase Firestore
- **QR Code**: qrcode library (server-side) + expo-barcode-scanner (client-side)
- **Auth**: Custom token-based with SecureStore
