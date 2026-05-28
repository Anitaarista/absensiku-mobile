const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const admin = require('firebase-admin');

// ========================================
// Firebase Initialization
// Supports: FIREBASE_CREDENTIAL env var (JSON string), local file, or project ID fallback
// ========================================
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0173847591';
const FIREBASE_DATABASE_URL = process.env.FIREBASE_DATABASE_URL || `https://${FIREBASE_PROJECT_ID}.firebaseio.com`;

if (admin.apps.length === 0) {
  try {
    // Method 1: Try FIREBASE_CREDENTIAL environment variable (base64 encoded JSON)
    if (process.env.FIREBASE_CREDENTIAL) {
      let serviceAccount;
      try {
        // Try base64 decode first (for GitHub Actions secrets)
        serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_CREDENTIAL, 'base64').toString('utf8'));
      } catch {
        // Fallback to plain JSON string
        serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIAL);
      }
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: FIREBASE_DATABASE_URL,
      });
      console.log('✅ Firebase initialized with FIREBASE_CREDENTIAL env var');
    } else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      // Method 2: Use GOOGLE_APPLICATION_CREDENTIALS env var (file path)
      const serviceAccount = require(process.env.GOOGLE_APPLICATION_CREDENTIALS);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        databaseURL: FIREBASE_DATABASE_URL,
      });
      console.log('✅ Firebase initialized with GOOGLE_APPLICATION_CREDENTIALS file');
    } else {
      // Method 3: Fallback to project ID (limited access - Firestore only, no auth)
      admin.initializeApp({
        projectId: FIREBASE_PROJECT_ID,
        databaseURL: FIREBASE_DATABASE_URL,
      });
      console.log('✅ Firebase initialized with project ID fallback (limited access)');
    }
  } catch (e) {
    console.log('❌ Firebase initialization failed:', e.message);
    try {
      admin.initializeApp({
        projectId: FIREBASE_PROJECT_ID,
        databaseURL: FIREBASE_DATABASE_URL,
      });
      console.log('✅ Firebase initialized with project ID fallback (limited access)');
    } catch (initErr) {
      console.log('❌ Firebase initialization completely failed:', initErr.message);
    }
  }
}

const db = admin.firestore();

// ========================================
// Express App Setup
// ========================================
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.url}`);
  next();
});

// ========================================
// Helper Functions
// ========================================
const hashPassword = (password) => {
  return crypto.createHash('sha256').update(password).digest('hex');
};

const generateToken = () => {
  return crypto.randomBytes(32).toString('hex');
};

const successResponse = (res, data, statusCode = 200) => {
  return res.status(statusCode).json({ success: true, data });
};

const errorResponse = (res, code, message, statusCode = 400) => {
  return res.status(statusCode).json({ success: false, error: { code, message } });
};

const formatDate = (date) => {
  return new Date(date).toISOString().split('T')[0];
};

const isFirestoreAvailable = () => {
  return db !== undefined && db !== null;
};

// ========================================
// Health Check
// ========================================
app.get('/api/health', (req, res) => {
  return successResponse(res, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    firebase: admin.apps.length > 0 ? 'connected' : 'not configured',
  });
});

// ========================================
// Auth Routes
// ========================================

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, 'VALIDATION_ERROR', 'Email dan password wajib diisi');
    }

    if (!isFirestoreAvailable()) {
      return errorResponse(res, 'SERVICE_UNAVAILABLE', 'Database tidak tersedia', 503);
    }

    // Find user by email
    const usersRef = db.collection('users');
    const snapshot = await usersRef.where('email', '==', email.toLowerCase().trim()).limit(1).get();

    if (snapshot.empty) {
      return errorResponse(res, 'INVALID_CREDENTIALS', 'Email atau password salah');
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();

    // Verify password
    const hashedPassword = hashPassword(password);
    if (userData.password !== hashedPassword) {
      return errorResponse(res, 'INVALID_CREDENTIALS', 'Email atau password salah');
    }

    // Generate token
    const token = generateToken();

    // Store token
    await db.collection('tokens').doc(token).set({
      uid: userDoc.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    });

    // Return user data (without password)
    const { password: _, ...userWithoutPassword } = userData;
    return successResponse(res, {
      user: { uid: userDoc.id, ...userWithoutPassword },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Terjadi kesalahan pada server', 500);
  }
});

// POST /api/auth/register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, nip, jabatan, divisi, role } = req.body;

    if (!name || !email || !password) {
      return errorResponse(res, 'VALIDATION_ERROR', 'Nama, email, dan password wajib diisi');
    }

    if (!isFirestoreAvailable()) {
      return errorResponse(res, 'SERVICE_UNAVAILABLE', 'Database tidak tersedia', 503);
    }

    // Check if email already exists
    const existingSnapshot = await db.collection('users')
      .where('email', '==', email.toLowerCase().trim())
      .limit(1)
      .get();

    if (!existingSnapshot.empty) {
      return errorResponse(res, 'EMAIL_EXISTS', 'Email sudah terdaftar');
    }

    const uid = uuidv4();
    const hashedPassword = hashPassword(password);

    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      nip: nip || '',
      jabatan: jabatan || '',
      divisi: divisi || '',
      role: role || 'karyawan',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('users').doc(uid).set(userData);

    // Generate token
    const token = generateToken();
    await db.collection('tokens').doc(token).set({
      uid,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    const { password: _, ...userWithoutPassword } = userData;
    return successResponse(res, {
      user: { uid, ...userWithoutPassword },
      token,
    }, 201);
  } catch (error) {
    console.error('Register error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Terjadi kesalahan pada server', 500);
  }
});

// ========================================
// Attendance Routes
// ========================================

// GET /api/attendance (with filters)
app.get('/api/attendance', async (req, res) => {
  try {
    if (!isFirestoreAvailable()) {
      return errorResponse(res, 'SERVICE_UNAVAILABLE', 'Database tidak tersedia', 503);
    }

    let query = db.collection('attendance');

    const { date, status, uid, limit, offset } = req.query;

    if (date) {
      query = query.where('date', '==', date);
    }
    if (status) {
      query = query.where('status', '==', status.toLowerCase());
    }
    if (uid) {
      query = query.where('uid', '==', uid);
    }

    query = query.orderBy('createdAt', 'desc');

    const limitNum = parseInt(limit) || 50;
    const offsetNum = parseInt(offset) || 0;
    query = query.limit(limitNum);

    const snapshot = await query.get();

    const records = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      // Fetch user info
      let userName = data.userName || '';
      let userNip = data.userNip || '';
      if (data.uid) {
        try {
          const userDoc = await db.collection('users').doc(data.uid).get();
          if (userDoc.exists) {
            userName = userDoc.data().name || userName;
            userNip = userDoc.data().nip || userNip;
          }
        } catch (e) {
          // Use cached values
        }
      }
      records.push({
        id: doc.id,
        ...data,
        userName,
        userNip,
      });
    }

    return successResponse(res, { records, total: records.length });
  } catch (error) {
    console.error('Get attendance error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Terjadi kesalahan pada server', 500);
  }
});

// GET /api/attendance/my (by uid query param)
app.get('/api/attendance/my', async (req, res) => {
  try {
    const { uid, date } = req.query;

    if (!uid) {
      return errorResponse(res, 'VALIDATION_ERROR', 'UID wajib diisi');
    }

    if (!isFirestoreAvailable()) {
      return errorResponse(res, 'SERVICE_UNAVAILABLE', 'Database tidak tersedia', 503);
    }

    let query = db.collection('attendance').where('uid', '==', uid);

    if (date) {
      query = query.where('date', '==', date);
    }

    query = query.orderBy('createdAt', 'desc');

    const snapshot = await query.get();

    const records = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      // Fetch user info
      let userName = data.userName || '';
      let userNip = data.userNip || '';
      try {
        const userDoc = await db.collection('users').doc(uid).get();
        if (userDoc.exists) {
          userName = userDoc.data().name || userName;
          userNip = userDoc.data().nip || userNip;
        }
      } catch (e) {
        // Use cached values
      }
      records.push({
        id: doc.id,
        ...data,
        userName,
        userNip,
      });
    }

    return successResponse(res, { records, total: records.length });
  } catch (error) {
    console.error('Get my attendance error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Terjadi kesalahan pada server', 500);
  }
});

// GET /api/attendance/stats
app.get('/api/attendance/stats', async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || formatDate(new Date());

    if (!isFirestoreAvailable()) {
      return errorResponse(res, 'SERVICE_UNAVAILABLE', 'Database tidak tersedia', 503);
    }

    // Get total employees (karyawan role)
    const usersSnapshot = await db.collection('users').where('role', '==', 'karyawan').get();
    const totalEmployees = usersSnapshot.size;

    // Get today's attendance
    const attendanceSnapshot = await db.collection('attendance')
      .where('date', '==', targetDate)
      .get();

    let hadir = 0, izin = 0, sakit = 0, alpha = 0;
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

    attendanceSnapshot.forEach(doc => {
      const status = (doc.data().status || '').toLowerCase();
      if (status === 'hadir') hadir++;
      else if (status === 'izin') izin++;
      else if (status === 'sakit') sakit++;
      else if (status === 'alpha') alpha++;
    });

    // 7-day trend
    const weeklyTrend = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      const dayName = dayNames[d.getDay()];

      try {
        const daySnapshot = await db.collection('attendance')
          .where('date', '==', dateStr)
          .where('status', '==', 'hadir')
          .get();
        weeklyTrend.push({ day: dayName, hadir: daySnapshot.size, date: dateStr });
      } catch (e) {
        weeklyTrend.push({ day: dayName, hadir: 0, date: dateStr });
      }
    }

    return successResponse(res, {
      summary: {
        totalEmployees,
        hadir,
        izin,
        sakit,
        alpha,
      },
      breakdown: {
        hadir,
        izin,
        sakit,
        alpha,
      },
      weeklyTrend,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Terjadi kesalahan pada server', 500);
  }
});

// POST /api/attendance
app.post('/api/attendance', async (req, res) => {
  try {
    const { uid, date, status, checkIn, checkOut, note } = req.body;

    if (!uid) {
      return errorResponse(res, 'VALIDATION_ERROR', 'UID wajib diisi');
    }

    if (!isFirestoreAvailable()) {
      return errorResponse(res, 'SERVICE_UNAVAILABLE', 'Database tidak tersedia', 503);
    }

    const id = uuidv4();
    const targetDate = date || formatDate(new Date());

    // Fetch user info
    let userName = '';
    let userNip = '';
    try {
      const userDoc = await db.collection('users').doc(uid).get();
      if (userDoc.exists) {
        userName = userDoc.data().name || '';
        userNip = userDoc.data().nip || '';
      }
    } catch (e) {
      // Continue without user info
    }

    const attendanceData = {
      uid,
      userName,
      userNip,
      date: targetDate,
      status: (status || 'hadir').toLowerCase(),
      checkIn: checkIn || new Date().toISOString(),
      checkOut: checkOut || null,
      note: note || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('attendance').doc(id).set(attendanceData);

    return successResponse(res, {
      attendance: { id, ...attendanceData },
    }, 201);
  } catch (error) {
    console.error('Create attendance error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Terjadi kesalahan pada server', 500);
  }
});

// PUT /api/attendance/:id
app.put('/api/attendance/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, checkOut, note } = req.body;

    if (!isFirestoreAvailable()) {
      return errorResponse(res, 'SERVICE_UNAVAILABLE', 'Database tidak tersedia', 503);
    }

    const docRef = db.collection('attendance').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return errorResponse(res, 'NOT_FOUND', 'Data absensi tidak ditemukan', 404);
    }

    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    if (status) updateData.status = status.toLowerCase();
    if (checkOut) updateData.checkOut = checkOut;
    if (note !== undefined) updateData.note = note;

    await docRef.update(updateData);

    const updatedDoc = await docRef.get();
    return successResponse(res, {
      attendance: { id, ...updatedDoc.data() },
    });
  } catch (error) {
    console.error('Update attendance error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Terjadi kesalahan pada server', 500);
  }
});

// DELETE /api/attendance/:id
app.delete('/api/attendance/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!isFirestoreAvailable()) {
      return errorResponse(res, 'SERVICE_UNAVAILABLE', 'Database tidak tersedia', 503);
    }

    const docRef = db.collection('attendance').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return errorResponse(res, 'NOT_FOUND', 'Data absensi tidak ditemukan', 404);
    }

    await docRef.delete();

    return successResponse(res, { message: 'Data absensi berhasil dihapus' });
  } catch (error) {
    console.error('Delete attendance error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Terjadi kesalahan pada server', 500);
  }
});

// ========================================
// QR Code Routes
// ========================================

// POST /api/qr/generate
app.post('/api/qr/generate', async (req, res) => {
  try {
    const { validMinutes } = req.body;
    const minutes = parseInt(validMinutes) || 30;

    if (!isFirestoreAvailable()) {
      return errorResponse(res, 'SERVICE_UNAVAILABLE', 'Database tidak tersedia', 503);
    }

    const code = uuidv4().substring(0, 8).toUpperCase();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + minutes * 60 * 1000);

    const sessionId = uuidv4();

    const sessionData = {
      code,
      date: formatDate(now),
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      validMinutes: minutes,
      active: true,
      scannedCount: 0,
    };

    await db.collection('qr_sessions').doc(sessionId).set(sessionData);

    // Deactivate previous sessions
    const activeSessions = await db.collection('qr_sessions')
      .where('active', '==', true)
      .get();

    const batch = db.batch();
    activeSessions.forEach(doc => {
      if (doc.id !== sessionId) {
        batch.update(doc.ref, { active: false });
      }
    });
    await batch.commit();

    // Generate QR code image
    const qrData = JSON.stringify({
      code,
      sessionId,
      date: formatDate(now),
      type: 'absensi',
    });

    let qrImage = null;
    try {
      qrImage = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      // Remove data URL prefix to get just base64
      qrImage = qrImage.replace(/^data:image\/png;base64,/, '');
    } catch (qrErr) {
      console.error('QR generation error:', qrErr);
    }

    return successResponse(res, {
      session: { id: sessionId, ...sessionData },
      qrImage,
    });
  } catch (error) {
    console.error('Generate QR error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Terjadi kesalahan pada server', 500);
  }
});

// GET /api/qr/active
app.get('/api/qr/active', async (req, res) => {
  try {
    if (!isFirestoreAvailable()) {
      return errorResponse(res, 'SERVICE_UNAVAILABLE', 'Database tidak tersedia', 503);
    }

    const snapshot = await db.collection('qr_sessions')
      .where('active', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return successResponse(res, { session: null, qrImage: null });
    }

    const doc = snapshot.docs[0];
    const sessionData = { id: doc.id, ...doc.data() };

    // Check if expired
    if (new Date(sessionData.expiresAt) < new Date()) {
      await db.collection('qr_sessions').doc(doc.id).update({ active: false });
      return successResponse(res, { session: null, qrImage: null });
    }

    // Regenerate QR image
    const qrData = JSON.stringify({
      code: sessionData.code,
      sessionId: sessionData.id,
      date: sessionData.date,
      type: 'absensi',
    });

    let qrImage = null;
    try {
      qrImage = await QRCode.toDataURL(qrData, {
        width: 300,
        margin: 2,
        color: { dark: '#000000', light: '#FFFFFF' },
      });
      qrImage = qrImage.replace(/^data:image\/png;base64,/, '');
    } catch (qrErr) {
      console.error('QR generation error:', qrErr);
    }

    return successResponse(res, {
      session: sessionData,
      qrImage,
    });
  } catch (error) {
    console.error('Get active QR error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Terjadi kesalahan pada server', 500);
  }
});

// POST /api/qr/scan
app.post('/api/qr/scan', async (req, res) => {
  try {
    const { code, uid } = req.body;

    if (!code || !uid) {
      return errorResponse(res, 'VALIDATION_ERROR', 'Code dan UID wajib diisi');
    }

    if (!isFirestoreAvailable()) {
      return errorResponse(res, 'SERVICE_UNAVAILABLE', 'Database tidak tersedia', 503);
    }

    // Find the QR session
    const snapshot = await db.collection('qr_sessions')
      .where('code', '==', code)
      .where('active', '==', true)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return errorResponse(res, 'INVALID_QR', 'QR Code tidak valid atau sudah expired');
    }

    const sessionDoc = snapshot.docs[0];
    const sessionData = sessionDoc.data();

    // Check if expired
    if (new Date(sessionData.expiresAt) < new Date()) {
      await db.collection('qr_sessions').doc(sessionDoc.id).update({ active: false });
      return errorResponse(res, 'QR_EXPIRED', 'QR Code sudah expired');
    }

    // Check if already scanned today
    const today = formatDate(new Date());
    const existingAttendance = await db.collection('attendance')
      .where('uid', '==', uid)
      .where('date', '==', today)
      .limit(1)
      .get();

    if (!existingAttendance.empty) {
      return errorResponse(res, 'ALREADY_CHECKED_IN', 'Anda sudah melakukan absensi hari ini');
    }

    // Fetch user info
    let userName = '';
    let userNip = '';
    try {
      const userDoc = await db.collection('users').doc(uid).get();
      if (userDoc.exists) {
        userName = userDoc.data().name || '';
        userNip = userDoc.data().nip || '';
      }
    } catch (e) {
      // Continue
    }

    // Create attendance record
    const attendanceId = uuidv4();
    const now = new Date();
    const attendanceData = {
      uid,
      userName,
      userNip,
      date: today,
      status: 'hadir',
      checkIn: now.toISOString(),
      checkOut: null,
      note: `Absensi via QR Code (${code})`,
      sessionId: sessionDoc.id,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    };

    await db.collection('attendance').doc(attendanceId).set(attendanceData);

    // Update scanned count
    await db.collection('qr_sessions').doc(sessionDoc.id).update({
      scannedCount: admin.firestore.FieldValue.increment(1),
    });

    return successResponse(res, {
      attendance: { id: attendanceId, ...attendanceData },
      message: 'Absensi berhasil dicatat',
    });
  } catch (error) {
    console.error('Scan QR error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Terjadi kesalahan pada server', 500);
  }
});

// ========================================
// Reports Routes
// ========================================

// GET /api/reports/summary
app.get('/api/reports/summary', async (req, res) => {
  try {
    const { month, year } = req.query;
    const now = new Date();
    const targetMonth = parseInt(month) || (now.getMonth() + 1);
    const targetYear = parseInt(year) || now.getFullYear();

    if (!isFirestoreAvailable()) {
      return errorResponse(res, 'SERVICE_UNAVAILABLE', 'Database tidak tersedia', 503);
    }

    // Get all attendance for the month
    const startDate = formatDate(new Date(targetYear, targetMonth - 1, 1));
    const endDate = formatDate(new Date(targetYear, targetMonth, 0));

    // Get all attendance records for the period
    const attendanceSnapshot = await db.collection('attendance')
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .get();

    let total = 0, hadir = 0, izin = 0, sakit = 0, alpha = 0;
    const dailyMap = {};
    const employeeMap = {};

    attendanceSnapshot.forEach(doc => {
      const data = doc.data();
      const status = (data.status || '').toLowerCase();
      total++;

      if (status === 'hadir') hadir++;
      else if (status === 'izin') izin++;
      else if (status === 'sakit') sakit++;
      else if (status === 'alpha') alpha++;

      // Daily breakdown
      const dateKey = data.date;
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { date: dateKey, hadir: 0, izin: 0, sakit: 0, alpha: 0, total: 0 };
      }
      dailyMap[dateKey][status]++;
      dailyMap[dateKey].total++;

      // Employee breakdown
      const empKey = data.uid;
      if (!employeeMap[empKey]) {
        employeeMap[empKey] = {
          uid: data.uid,
          name: data.userName || '-',
          nip: data.userNip || '-',
          hadir: 0,
          izin: 0,
          sakit: 0,
          alpha: 0,
          total: 0,
        };
      }
      employeeMap[empKey][status]++;
      employeeMap[empKey].total++;
    });

    // Format daily breakdown
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const dailyBreakdown = Object.values(dailyMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(d => ({
        ...d,
        day: dayNames[new Date(d.date).getDay()],
        dominantStatus: d.hadir >= d.izin && d.hadir >= d.sakit && d.hadir >= d.alpha ? 'hadir' :
          d.izin >= d.sakit && d.izin >= d.alpha ? 'izin' :
          d.sakit >= d.alpha ? 'sakit' : 'alpha',
      }));

    // Format employee breakdown
    const employeeBreakdown = Object.values(employeeMap)
      .sort((a, b) => b.hadir - a.hadir);

    return successResponse(res, {
      summary: { total, hadir, izin, sakit, alpha },
      dailyBreakdown,
      employeeBreakdown,
    });
  } catch (error) {
    console.error('Reports summary error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Terjadi kesalahan pada server', 500);
  }
});

// GET /api/reports/employee/:uid
app.get('/api/reports/employee/:uid', async (req, res) => {
  try {
    const { uid } = req.params;
    const { month, year } = req.query;
    const now = new Date();
    const targetMonth = parseInt(month) || (now.getMonth() + 1);
    const targetYear = parseInt(year) || now.getFullYear();

    if (!isFirestoreAvailable()) {
      return errorResponse(res, 'SERVICE_UNAVAILABLE', 'Database tidak tersedia', 503);
    }

    const startDate = formatDate(new Date(targetYear, targetMonth - 1, 1));
    const endDate = formatDate(new Date(targetYear, targetMonth, 0));

    const snapshot = await db.collection('attendance')
      .where('uid', '==', uid)
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .get();

    let total = 0, hadir = 0, izin = 0, sakit = 0, alpha = 0;
    const records = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      const status = (data.status || '').toLowerCase();
      total++;

      if (status === 'hadir') hadir++;
      else if (status === 'izin') izin++;
      else if (status === 'sakit') sakit++;
      else if (status === 'alpha') alpha++;

      records.push({ id: doc.id, ...data });
    });

    // Get user info
    let userInfo = {};
    try {
      const userDoc = await db.collection('users').doc(uid).get();
      if (userDoc.exists) {
        const { password: _, ...rest } = userDoc.data();
        userInfo = rest;
      }
    } catch (e) {
      // Continue
    }

    return successResponse(res, {
      user: { uid, ...userInfo },
      summary: { total, hadir, izin, sakit, alpha },
      records,
    });
  } catch (error) {
    console.error('Employee report error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Terjadi kesalahan pada server', 500);
  }
});

// ========================================
// Users Routes
// ========================================

// GET /api/users
app.get('/api/users', async (req, res) => {
  try {
    const { role } = req.query;

    if (!isFirestoreAvailable()) {
      return errorResponse(res, 'SERVICE_UNAVAILABLE', 'Database tidak tersedia', 503);
    }

    let query = db.collection('users');

    if (role) {
      query = query.where('role', '==', role);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();

    const users = [];
    snapshot.forEach(doc => {
      const { password: _, ...userData } = doc.data();
      users.push({ uid: doc.id, ...userData });
    });

    return successResponse(res, { users, total: users.length });
  } catch (error) {
    console.error('Get users error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Terjadi kesalahan pada server', 500);
  }
});

// GET /api/users/:uid
app.get('/api/users/:uid', async (req, res) => {
  try {
    const { uid } = req.params;

    if (!isFirestoreAvailable()) {
      return errorResponse(res, 'SERVICE_UNAVAILABLE', 'Database tidak tersedia', 503);
    }

    const doc = await db.collection('users').doc(uid).get();

    if (!doc.exists) {
      return errorResponse(res, 'NOT_FOUND', 'User tidak ditemukan', 404);
    }

    const { password: _, ...userData } = doc.data();
    return successResponse(res, { user: { uid: doc.id, ...userData } });
  } catch (error) {
    console.error('Get user error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Terjadi kesalahan pada server', 500);
  }
});

// ========================================
// Seed Admin on Startup
// ========================================
const seedAdmin = async () => {
  try {
    if (!isFirestoreAvailable()) {
      console.log('⚠️ Firestore not available, skipping admin seed');
      return;
    }

    const adminEmail = 'admin@absensi.com';
    const snapshot = await db.collection('users')
      .where('email', '==', adminEmail)
      .limit(1)
      .get();

    if (snapshot.empty) {
      const uid = uuidv4();
      await db.collection('users').doc(uid).set({
        name: 'Administrator',
        email: adminEmail,
        password: hashPassword('admin123'),
        nip: 'ADMIN001',
        jabatan: 'Administrator',
        divisi: 'IT',
        role: 'admin',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });
      console.log('✅ Admin user seeded: admin@absensi.com / admin123');
    } else {
      console.log('ℹ️ Admin user already exists');
    }
  } catch (error) {
    console.log('⚠️ Could not seed admin:', error.message);
  }
};

// ========================================
// Start Server
// ========================================
app.listen(PORT, () => {
  console.log(`🚀 AbsensiKu API running on port ${PORT}`);
  console.log(`📡 Health check: http://localhost:${PORT}/api/health`);

  // Seed admin user
  seedAdmin();
});

module.exports = app;
