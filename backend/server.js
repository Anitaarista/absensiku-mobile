const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

// ========================================
// Firebase Initialization - Supports Admin SDK (Service Account) and Client SDK (fallback)
// ========================================
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'gen-lang-client-0173847591';
const FIREBASE_DATABASE_URL = process.env.FIREBASE_DATABASE_URL || `https://${FIREBASE_PROJECT_ID}.firebaseio.com`;

let db = null;
let admin = null;
let useAdminSDK = false;
let fieldValueServerTimestamp = null;
let fieldValueIncrement = null;

// Firebase configuration (same as mobile app)
const firebaseConfig = {
  apiKey: 'AIzaSyC4Lfbd9Z4WPlZvO0kAU6HrZpDQ6zlPiDU',
  authDomain: 'gen-lang-client-0173847591.firebaseapp.com',
  projectId: 'gen-lang-client-0173847591',
  storageBucket: 'gen-lang-client-0173847591.firebasestorage.app',
  messagingSenderId: '1087219440433',
  appId: '1:1087219440433:android:0b092c1a6b58b828db2e10',
};

// Try Firebase Admin SDK with Service Account first
async function initializeFirebase() {
  // Method 1: Try Firebase Admin SDK with serviceAccountKey.json
  try {
    admin = require('firebase-admin');
    const serviceAccountPath = path.join(__dirname, 'serviceAccountKey.json');

    let initialized = false;

    if (fs.existsSync(serviceAccountPath)) {
      try {
        const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        if (serviceAccount.private_key && serviceAccount.private_key !== 'REPLACE_WITH_YOUR_PRIVATE_KEY') {
          admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: FIREBASE_DATABASE_URL,
          });
          console.log('✅ Firebase Admin SDK initialized with serviceAccountKey.json');
          initialized = true;
        }
      } catch (e) {
        console.log('⚠️ serviceAccountKey.json found but invalid:', e.message);
      }
    }

    // Method 2: Try FIREBASE_CREDENTIAL env var (base64 encoded JSON)
    if (!initialized && process.env.FIREBASE_CREDENTIAL) {
      try {
        let serviceAccount;
        try {
          serviceAccount = JSON.parse(Buffer.from(process.env.FIREBASE_CREDENTIAL, 'base64').toString('utf8'));
        } catch {
          serviceAccount = JSON.parse(process.env.FIREBASE_CREDENTIAL);
        }
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: FIREBASE_DATABASE_URL,
        });
        console.log('✅ Firebase Admin SDK initialized with FIREBASE_CREDENTIAL env var');
        initialized = true;
      } catch (e) {
        console.log('⚠️ FIREBASE_CREDENTIAL env var found but invalid:', e.message);
      }
    }

    // Method 3: Try GOOGLE_APPLICATION_CREDENTIALS env var
    if (!initialized && process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      try {
        const credPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        const serviceAccount = JSON.parse(fs.readFileSync(credPath, 'utf8'));
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
          databaseURL: FIREBASE_DATABASE_URL,
        });
        console.log('✅ Firebase Admin SDK initialized with GOOGLE_APPLICATION_CREDENTIALS');
        initialized = true;
      } catch (e) {
        console.log('⚠️ GOOGLE_APPLICATION_CREDENTIALS found but invalid:', e.message);
      }
    }

    // Method 4: Try Application Default Credentials
    if (!initialized) {
      try {
        admin.initializeApp({
          credential: admin.credential.applicationDefault(),
          databaseURL: FIREBASE_DATABASE_URL,
          projectId: FIREBASE_PROJECT_ID,
        });
        // Test if ADC actually works
        const testDb = admin.firestore();
        await testDb.collection('users').limit(1).get();
        console.log('✅ Firebase Admin SDK initialized with Application Default Credentials');
        initialized = true;
      } catch (e) {
        console.log('⚠️ Application Default Credentials not available:', e.message);
        // Delete the failed app so we can reinitialize
        try { admin.app().delete(); } catch (delErr) { /* ignore */ }
      }
    }

    if (initialized) {
      db = admin.firestore();
      useAdminSDK = true;
      fieldValueServerTimestamp = admin.firestore.FieldValue.serverTimestamp;
      fieldValueIncrement = admin.firestore.FieldValue.increment;
      console.log('🔒 Using Firebase Admin SDK - bypasses Firestore Security Rules');
      return;
    }
  } catch (e) {
    console.log('⚠️ Firebase Admin SDK not available:', e.message);
  }

  // Fallback: Use Firebase Client SDK (works without Service Account)
  try {
    const firebase = require('firebase/firestore');
    const firebaseApp = require('firebase/app');

    console.log('🔄 Falling back to Firebase Client SDK...');
    console.log('⚠️ For production, use Firebase Admin SDK with Service Account for better security');

    const app = firebaseApp.initializeApp(firebaseConfig);
    db = firebase.getFirestore(app);

    // Create compatibility layer for Admin SDK methods
    fieldValueServerTimestamp = () => firebase.serverTimestamp();
    fieldValueIncrement = (n) => firebase.increment(n);

    // Wrap Firestore with Admin SDK-like interface
    const origDb = db;
    db = {
      collection: (collectionPath) => {
        const colRef = firebase.collection(origDb, collectionPath);
        return {
          where: (field, op, value) => {
            let q = firebase.query(colRef, firebase.where(field, op, value));
            return {
              where: (field2, op2, value2) => {
                q = firebase.query(q, firebase.where(field2, op2, value2));
                return {
                  orderBy: (field3, dir3) => {
                    q = firebase.query(q, firebase.orderBy(field3, dir3));
                    return {
                      limit: (n) => {
                        q = firebase.query(q, firebase.limit(n));
                        return {
                          get: async () => {
                            const snap = await firebase.getDocs(q);
                            return {
                              empty: snap.empty,
                              size: snap.size,
                              docs: snap.docs.map(d => ({
                                id: d.id,
                                data: () => d.data(),
                                ref: d.ref,
                                exists: true,
                              })),
                              forEach: (cb) => snap.docs.forEach(cb),
                            };
                          },
                        };
                      },
                      get: async () => {
                        const snap = await firebase.getDocs(q);
                        return {
                          empty: snap.empty,
                          size: snap.size,
                          docs: snap.docs.map(d => ({
                            id: d.id,
                            data: () => d.data(),
                            ref: d.ref,
                            exists: true,
                          })),
                          forEach: (cb) => snap.docs.forEach(cb),
                        };
                      },
                    };
                  },
                  limit: (n) => {
                    q = firebase.query(q, firebase.limit(n));
                    return {
                      get: async () => {
                        const snap = await firebase.getDocs(q);
                        return {
                          empty: snap.empty,
                          size: snap.size,
                          docs: snap.docs.map(d => ({
                            id: d.id,
                            data: () => d.data(),
                            ref: d.ref,
                            exists: true,
                          })),
                          forEach: (cb) => snap.docs.forEach(cb),
                        };
                      },
                    };
                  },
                  get: async () => {
                    const snap = await firebase.getDocs(q);
                    return {
                      empty: snap.empty,
                      size: snap.size,
                      docs: snap.docs.map(d => ({
                        id: d.id,
                        data: () => d.data(),
                        ref: d.ref,
                        exists: true,
                      })),
                      forEach: (cb) => snap.docs.forEach(cb),
                    };
                  },
                };
              },
              orderBy: (field2, dir2) => {
                q = firebase.query(q, firebase.orderBy(field2, dir2));
                return {
                  limit: (n) => {
                    q = firebase.query(q, firebase.limit(n));
                    return {
                      get: async () => {
                        const snap = await firebase.getDocs(q);
                        return {
                          empty: snap.empty,
                          size: snap.size,
                          docs: snap.docs.map(d => ({
                            id: d.id,
                            data: () => d.data(),
                            ref: d.ref,
                            exists: true,
                          })),
                          forEach: (cb) => snap.docs.forEach(cb),
                        };
                      },
                    };
                  },
                  get: async () => {
                    const snap = await firebase.getDocs(q);
                    return {
                      empty: snap.empty,
                      size: snap.size,
                      docs: snap.docs.map(d => ({
                        id: d.id,
                        data: () => d.data(),
                        ref: d.ref,
                        exists: true,
                      })),
                      forEach: (cb) => snap.docs.forEach(cb),
                    };
                  },
                };
              },
              limit: (n) => {
                q = firebase.query(q, firebase.limit(n));
                return {
                  get: async () => {
                    const snap = await firebase.getDocs(q);
                    return {
                      empty: snap.empty,
                      size: snap.size,
                      docs: snap.docs.map(d => ({
                        id: d.id,
                        data: () => d.data(),
                        ref: d.ref,
                        exists: true,
                      })),
                      forEach: (cb) => snap.docs.forEach(cb),
                    };
                  },
                };
              },
              get: async () => {
                const snap = await firebase.getDocs(q);
                return {
                  empty: snap.empty,
                  size: snap.size,
                  docs: snap.docs.map(d => ({
                    id: d.id,
                    data: () => d.data(),
                    ref: d.ref,
                    exists: true,
                  })),
                  forEach: (cb) => snap.docs.forEach(cb),
                };
              },
            };
          },
          orderBy: (field, dir) => {
            let q = firebase.query(colRef, firebase.orderBy(field, dir));
            return {
              limit: (n) => {
                q = firebase.query(q, firebase.limit(n));
                return {
                  get: async () => {
                    const snap = await firebase.getDocs(q);
                    return {
                      empty: snap.empty,
                      size: snap.size,
                      docs: snap.docs.map(d => ({
                        id: d.id,
                        data: () => d.data(),
                        ref: d.ref,
                        exists: true,
                      })),
                      forEach: (cb) => snap.docs.forEach(cb),
                    };
                  },
                };
              },
              get: async () => {
                const snap = await firebase.getDocs(q);
                return {
                  empty: snap.empty,
                  size: snap.size,
                  docs: snap.docs.map(d => ({
                    id: d.id,
                    data: () => d.data(),
                    ref: d.ref,
                    exists: true,
                  })),
                  forEach: (cb) => snap.docs.forEach(cb),
                };
              },
            };
          },
          limit: (n) => {
            const q = firebase.query(colRef, firebase.limit(n));
            return {
              get: async () => {
                const snap = await firebase.getDocs(q);
                return {
                  empty: snap.empty,
                  size: snap.size,
                  docs: snap.docs.map(d => ({
                    id: d.id,
                    data: () => d.data(),
                    ref: d.ref,
                    exists: true,
                  })),
                  forEach: (cb) => snap.docs.forEach(cb),
                };
              },
            };
          },
          get: async () => {
            const snap = await firebase.getDocs(colRef);
            return {
              empty: snap.empty,
              size: snap.size,
              docs: snap.docs.map(d => ({
                id: d.id,
                data: () => d.data(),
                ref: d.ref,
                exists: true,
              })),
              forEach: (cb) => snap.docs.forEach(cb),
            };
          },
        };
      },
      doc: (collectionPath, docPath) => {
        const docRef = firebase.doc(origDb, collectionPath, docPath);
        return {
          get: async () => {
            const snap = await firebase.getDoc(docRef);
            return {
              exists: snap.exists(),
              id: snap.id,
              data: () => snap.data(),
              ref: docRef,
            };
          },
          set: async (data, options) => {
            await firebase.setDoc(docRef, data, options);
          },
          update: async (data) => {
            await firebase.updateDoc(docRef, data);
          },
          delete: async () => {
            await firebase.deleteDoc(docRef);
          },
        };
      },
      batch: () => {
        const batch = firebase.writeBatch(origDb);
        return {
          update: (docRefObj, data) => {
            // docRefObj needs to be a Firestore DocumentReference
            const realRef = firebase.doc(origDb, docRefObj._path?.segments?.[0], docRefObj._path?.segments?.[1]) || docRefObj;
            batch.update(realRef, data);
          },
          commit: async () => {
            await batch.commit();
          },
        };
      },
    };

    useAdminSDK = false;
    console.log('✅ Firebase Client SDK initialized (fallback mode)');
    console.log('📝 Firestore Security Rules will apply (ensure rules allow access)');
    return;
  } catch (e) {
    console.log('❌ Firebase Client SDK also failed:', e.message);
  }

  console.log('❌ All Firebase initialization methods failed. Server cannot start.');
  process.exit(1);
}

// ========================================
// Express App Setup
// ========================================
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Auth-Token'],
}));
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

const serverTimestamp = () => fieldValueServerTimestamp();
const increment = (n) => fieldValueIncrement(n);

// ========================================
// Auth Middleware - Verify Token
// ========================================
const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.replace('Bearer ', '') || req.headers['x-auth-token'] || req.query.token;

    if (!token) {
      return errorResponse(res, 'UNAUTHORIZED', 'Token tidak ditemukan. Silakan login kembali.', 401);
    }

    // Check if token exists in Firestore
    const tokenDoc = await db.collection('tokens').doc(token).get();

    if (!tokenDoc.exists) {
      return errorResponse(res, 'INVALID_TOKEN', 'Token tidak valid. Silakan login kembali.', 401);
    }

    const tokenData = tokenDoc.data();

    // Check if token is expired
    if (tokenData.expiresAt && new Date(tokenData.expiresAt) < new Date()) {
      await db.collection('tokens').doc(token).delete();
      return errorResponse(res, 'TOKEN_EXPIRED', 'Token sudah expired. Silakan login kembali.', 401);
    }

    // Attach user info to request
    req.token = token;
    req.uid = tokenData.uid;

    // Fetch user data
    const userDoc = await db.collection('users').doc(tokenData.uid).get();
    if (userDoc.exists) {
      req.user = { uid: userDoc.id, ...userDoc.data() };
    }

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    return errorResponse(res, 'AUTH_ERROR', 'Terjadi kesalahan autentikasi', 401);
  }
};

// ========================================
// Health Check
// ========================================
app.get('/api/health', async (req, res) => {
  let firebaseStatus = 'not configured';
  let dbTest = false;

  try {
    const snap = await db.collection('users').limit(1).get();
    dbTest = true;
    firebaseStatus = useAdminSDK ? 'admin-sdk' : 'client-sdk';
  } catch (e) {
    firebaseStatus = 'error: ' + e.message;
  }

  return successResponse(res, {
    status: 'ok',
    timestamp: new Date().toISOString(),
    firebase: firebaseStatus,
    firestoreAccess: dbTest,
    projectId: FIREBASE_PROJECT_ID,
    sdk: useAdminSDK ? 'admin' : 'client',
  });
});

// ========================================
// Auth Routes (Public - No Auth Required)
// ========================================

// POST /api/auth/login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return errorResponse(res, 'VALIDATION_ERROR', 'Email dan password wajib diisi');
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
      createdAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
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

// POST /api/auth/register (Admin only)
app.post('/api/auth/register', authMiddleware, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return errorResponse(res, 'FORBIDDEN', 'Hanya admin yang dapat menambahkan karyawan baru', 403);
    }

    const { name, email, password, nip, jabatan, divisi, role } = req.body;

    if (!name || !email || !password) {
      return errorResponse(res, 'VALIDATION_ERROR', 'Nama, email, dan password wajib diisi');
    }

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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await db.collection('users').doc(uid).set(userData);

    const { password: _, ...userWithoutPassword } = userData;
    return successResponse(res, {
      user: { uid, ...userWithoutPassword },
    }, 201);
  } catch (error) {
    console.error('Register error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Terjadi kesalahan pada server', 500);
  }
});

// GET /api/auth/me
app.get('/api/auth/me', authMiddleware, async (req, res) => {
  try {
    if (!req.user) {
      return errorResponse(res, 'NOT_FOUND', 'User tidak ditemukan', 404);
    }
    const { password: _, ...userWithoutPassword } = req.user;
    return successResponse(res, { user: userWithoutPassword });
  } catch (error) {
    console.error('Get me error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Terjadi kesalahan pada server', 500);
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', authMiddleware, async (req, res) => {
  try {
    if (req.token) {
      await db.collection('tokens').doc(req.token).delete();
    }
    return successResponse(res, { message: 'Logout berhasil' });
  } catch (error) {
    console.error('Logout error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Terjadi kesalahan pada server', 500);
  }
});

// ========================================
// Attendance Routes (Auth Required)
// ========================================

// GET /api/attendance
app.get('/api/attendance', authMiddleware, async (req, res) => {
  try {
    let query = db.collection('attendance');

    const { date, status, uid, limit } = req.query;

    if (date) query = query.where('date', '==', date);
    if (status) query = query.where('status', '==', status.toLowerCase());
    if (uid) query = query.where('uid', '==', uid);

    query = query.orderBy('createdAt', 'desc');

    const limitNum = parseInt(limit) || 50;
    query = query.limit(limitNum);

    const snapshot = await query.get();

    const records = [];
    for (const doc of snapshot.docs) {
      const data = doc.data();
      let userName = data.userName || '';
      let userNip = data.userNip || '';
      if (data.uid) {
        try {
          const userDoc = await db.collection('users').doc(data.uid).get();
          if (userDoc.exists) {
            userName = userDoc.data().name || userName;
            userNip = userDoc.data().nip || userNip;
          }
        } catch (e) { /* Use cached values */ }
      }
      records.push({ id: doc.id, ...data, userName, userNip });
    }

    return successResponse(res, { records, total: records.length });
  } catch (error) {
    console.error('Get attendance error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Terjadi kesalahan pada server', 500);
  }
});

// GET /api/attendance/my
app.get('/api/attendance/my', authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    const uid = req.uid;

    let query = db.collection('attendance').where('uid', '==', uid);
    if (date) query = query.where('date', '==', date);
    query = query.orderBy('createdAt', 'desc');

    const snapshot = await query.get();

    let userName = '';
    let userNip = '';
    try {
      const userDoc = await db.collection('users').doc(uid).get();
      if (userDoc.exists) {
        userName = userDoc.data().name || '';
        userNip = userDoc.data().nip || '';
      }
    } catch (e) { /* Use cached values */ }

    const records = [];
    snapshot.forEach(doc => {
      const data = doc.data();
      records.push({
        id: doc.id,
        ...data,
        userName: data.userName || userName,
        userNip: data.userNip || userNip,
      });
    });

    return successResponse(res, { records, total: records.length });
  } catch (error) {
    console.error('Get my attendance error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Terjadi kesalahan pada server', 500);
  }
});

// GET /api/attendance/stats
app.get('/api/attendance/stats', authMiddleware, async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || formatDate(new Date());

    const usersSnapshot = await db.collection('users').where('role', '==', 'karyawan').get();
    const totalEmployees = usersSnapshot.size;

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
      summary: { totalEmployees, hadir, izin, sakit, alpha },
      breakdown: { hadir, izin, sakit, alpha },
      weeklyTrend,
    });
  } catch (error) {
    console.error('Get stats error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Terjadi kesalahan pada server', 500);
  }
});

// POST /api/attendance
app.post('/api/attendance', authMiddleware, async (req, res) => {
  try {
    const { uid, date, status, checkIn, checkOut, note } = req.body;

    if (!uid) {
      return errorResponse(res, 'VALIDATION_ERROR', 'UID wajib diisi');
    }

    const id = uuidv4();
    const targetDate = date || formatDate(new Date());

    let userName = '';
    let userNip = '';
    try {
      const userDoc = await db.collection('users').doc(uid).get();
      if (userDoc.exists) {
        userName = userDoc.data().name || '';
        userNip = userDoc.data().nip || '';
      }
    } catch (e) { /* Continue */ }

    const attendanceData = {
      uid,
      userName,
      userNip,
      date: targetDate,
      status: (status || 'hadir').toLowerCase(),
      checkIn: checkIn || new Date().toISOString(),
      checkOut: checkOut || null,
      note: note || '',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
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
app.put('/api/attendance/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, checkOut, note } = req.body;

    if (req.user?.role !== 'admin') {
      return errorResponse(res, 'FORBIDDEN', 'Hanya admin yang dapat mengubah data absensi', 403);
    }

    const docRef = db.collection('attendance').doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return errorResponse(res, 'NOT_FOUND', 'Data absensi tidak ditemukan', 404);
    }

    const updateData = { updatedAt: serverTimestamp() };
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
app.delete('/api/attendance/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user?.role !== 'admin') {
      return errorResponse(res, 'FORBIDDEN', 'Hanya admin yang dapat menghapus data absensi', 403);
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
// QR Code Routes (Auth Required)
// ========================================

// POST /api/qr/generate (Admin only)
app.post('/api/qr/generate', authMiddleware, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return errorResponse(res, 'FORBIDDEN', 'Hanya admin yang dapat membuat QR Code', 403);
    }

    const { validMinutes } = req.body;
    const minutes = parseInt(validMinutes) || 30;

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

    if (useAdminSDK && admin) {
      const batch = db.batch();
      activeSessions.forEach(doc => {
        if (doc.id !== sessionId) {
          batch.update(doc.ref, { active: false });
        }
      });
      await batch.commit();
    } else {
      // Fallback for Client SDK: update one by one
      for (const doc of activeSessions.docs) {
        if (doc.id !== sessionId) {
          await db.collection('qr_sessions').doc(doc.id).update({ active: false });
        }
      }
    }

    // Generate QR data string
    const qrData = JSON.stringify({
      code,
      sessionId,
      date: formatDate(now),
      type: 'absensi',
    });

    // Generate QR code image
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
      session: { id: sessionId, ...sessionData },
      qrData,
      qrImage,
    });
  } catch (error) {
    console.error('Generate QR error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Terjadi kesalahan pada server', 500);
  }
});

// GET /api/qr/active
app.get('/api/qr/active', authMiddleware, async (req, res) => {
  try {
    const snapshot = await db.collection('qr_sessions')
      .where('active', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();

    if (snapshot.empty) {
      return successResponse(res, { session: null, qrImage: null, qrData: null });
    }

    const doc = snapshot.docs[0];
    const sessionData = { id: doc.id, ...doc.data() };

    if (new Date(sessionData.expiresAt) < new Date()) {
      await db.collection('qr_sessions').doc(doc.id).update({ active: false });
      return successResponse(res, { session: null, qrImage: null, qrData: null });
    }

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
      qrData,
      qrImage,
    });
  } catch (error) {
    console.error('Get active QR error:', error);
    return errorResponse(res, 'SERVER_ERROR', 'Terjadi kesalahan pada server', 500);
  }
});

// POST /api/qr/scan (Karyawan scan QR)
app.post('/api/qr/scan', authMiddleware, async (req, res) => {
  try {
    const { code } = req.body;
    const uid = req.uid;

    if (!code) {
      return errorResponse(res, 'VALIDATION_ERROR', 'Code wajib diisi');
    }

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

    if (new Date(sessionData.expiresAt) < new Date()) {
      await db.collection('qr_sessions').doc(sessionDoc.id).update({ active: false });
      return errorResponse(res, 'QR_EXPIRED', 'QR Code sudah expired');
    }

    const today = formatDate(new Date());
    const existingAttendance = await db.collection('attendance')
      .where('uid', '==', uid)
      .where('date', '==', today)
      .limit(1)
      .get();

    if (!existingAttendance.empty) {
      return errorResponse(res, 'ALREADY_CHECKED_IN', 'Anda sudah melakukan absensi hari ini');
    }

    let userName = '';
    let userNip = '';
    try {
      const userDoc = await db.collection('users').doc(uid).get();
      if (userDoc.exists) {
        userName = userDoc.data().name || '';
        userNip = userDoc.data().nip || '';
      }
    } catch (e) { /* Continue */ }

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
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    await db.collection('attendance').doc(attendanceId).set(attendanceData);

    await db.collection('qr_sessions').doc(sessionDoc.id).update({
      scannedCount: increment(1),
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
// Reports Routes (Auth Required)
// ========================================

// GET /api/reports/summary (Admin only)
app.get('/api/reports/summary', authMiddleware, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return errorResponse(res, 'FORBIDDEN', 'Hanya admin yang dapat melihat laporan', 403);
    }

    const { month, year } = req.query;
    const now = new Date();
    const targetMonth = parseInt(month) || (now.getMonth() + 1);
    const targetYear = parseInt(year) || now.getFullYear();

    const startDate = formatDate(new Date(targetYear, targetMonth - 1, 1));
    const endDate = formatDate(new Date(targetYear, targetMonth, 0));

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

      const dateKey = data.date;
      if (!dailyMap[dateKey]) {
        dailyMap[dateKey] = { date: dateKey, hadir: 0, izin: 0, sakit: 0, alpha: 0, total: 0 };
      }
      if (dailyMap[dateKey][status] !== undefined) dailyMap[dateKey][status]++;
      dailyMap[dateKey].total++;

      const empKey = data.uid;
      if (!employeeMap[empKey]) {
        employeeMap[empKey] = {
          uid: data.uid,
          name: data.userName || '-',
          nip: data.userNip || '-',
          hadir: 0, izin: 0, sakit: 0, alpha: 0, total: 0,
        };
      }
      if (employeeMap[empKey][status] !== undefined) employeeMap[empKey][status]++;
      employeeMap[empKey].total++;
    });

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
app.get('/api/reports/employee/:uid', authMiddleware, async (req, res) => {
  try {
    const { uid } = req.params;
    const { month, year } = req.query;
    const now = new Date();
    const targetMonth = parseInt(month) || (now.getMonth() + 1);
    const targetYear = parseInt(year) || now.getFullYear();

    if (req.user?.role !== 'admin' && req.uid !== uid) {
      return errorResponse(res, 'FORBIDDEN', 'Anda tidak memiliki akses', 403);
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

    let userInfo = {};
    try {
      const userDoc = await db.collection('users').doc(uid).get();
      if (userDoc.exists) {
        const { password: _, ...rest } = userDoc.data();
        userInfo = rest;
      }
    } catch (e) { /* Continue */ }

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
// Users Routes (Auth Required)
// ========================================

// GET /api/users
app.get('/api/users', authMiddleware, async (req, res) => {
  try {
    if (req.user?.role !== 'admin') {
      return errorResponse(res, 'FORBIDDEN', 'Hanya admin yang dapat melihat daftar user', 403);
    }

    const { role } = req.query;
    let query = db.collection('users');
    if (role) query = query.where('role', '==', role);

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
app.get('/api/users/:uid', authMiddleware, async (req, res) => {
  try {
    const { uid } = req.params;

    if (req.user?.role !== 'admin' && req.uid !== uid) {
      return errorResponse(res, 'FORBIDDEN', 'Anda tidak memiliki akses', 403);
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
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
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
// Start Server (async - wait for Firebase init)
// ========================================
const startServer = async () => {
  await initializeFirebase();

  app.listen(PORT, () => {
    console.log(`🚀 AbsensiKu API running on port ${PORT}`);
    console.log(`📡 Health check: http://localhost:${PORT}/api/health`);
    console.log(`🔐 Firebase Project: ${FIREBASE_PROJECT_ID}`);
    console.log(`📦 SDK Mode: ${useAdminSDK ? 'Admin SDK (bypasses rules)' : 'Client SDK (rules apply)'}`);

    seedAdmin();
  });
};

startServer().catch(err => {
  console.error('Failed to start server:', err);
  process.exit(1);
});

module.exports = app;
