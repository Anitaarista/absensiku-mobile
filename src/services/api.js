import { db } from '../config/firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  writeBatch,
} from 'firebase/firestore';
import CryptoJS from 'crypto-js';

// ========================================
// Helper Functions
// ========================================
const hashPassword = (password) => {
  return CryptoJS.SHA256(password).toString(CryptoJS.enc.Hex);
};

const generateToken = () => {
  return CryptoJS.lib.WordArray.random(32).toString(CryptoJS.enc.Hex);
};

const generateId = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const formatDate = (date) => {
  return new Date(date).toISOString().split('T')[0];
};

// Wrap data to match the axios response format expected by screens
const wrapResponse = (data) => ({ data: { data } });

// ========================================
// Seed Admin on First Use
// ========================================
let adminSeeded = false;
const seedAdmin = async () => {
  if (adminSeeded) return;
  try {
    const adminEmail = 'admin@absensi.com';
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', adminEmail), limit(1));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      const uid = generateId();
      await setDoc(doc(db, 'users', uid), {
        name: 'Administrator',
        email: adminEmail,
        password: hashPassword('admin123'),
        nip: 'ADMIN001',
        jabatan: 'Administrator',
        divisi: 'IT',
        role: 'admin',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      console.log('Admin user seeded: admin@absensi.com / admin123');
    }
    adminSeeded = true;
  } catch (error) {
    console.log('Could not seed admin:', error.message);
  }
};

// Seed admin on module load
seedAdmin().catch(console.log);

// ========================================
// Auth API
// ========================================
export const authAPI = {
  login: async (email, password) => {
    if (!email || !password) {
      throw new Error('Email dan password wajib diisi');
    }

    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('email', '==', email.toLowerCase().trim()), limit(1));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error('Email atau password salah');
    }

    const userDoc = snapshot.docs[0];
    const userData = userDoc.data();
    const hashedPassword = hashPassword(password);

    if (userData.password !== hashedPassword) {
      throw new Error('Email atau password salah');
    }

    // Generate and store token
    const token = generateToken();
    await setDoc(doc(db, 'tokens', token), {
      uid: userDoc.id,
      createdAt: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    // Return user data without password
    const { password: _, ...userWithoutPassword } = userData;
    return wrapResponse({
      user: { uid: userDoc.id, ...userWithoutPassword },
      token,
    });
  },

  register: async (data) => {
    const { name, email, password, nip, jabatan, divisi, role } = data;

    if (!name || !email || !password) {
      throw new Error('Nama, email, dan password wajib diisi');
    }

    // Check if email already exists
    const usersRef = collection(db, 'users');
    const existingQ = query(usersRef, where('email', '==', email.toLowerCase().trim()), limit(1));
    const existingSnapshot = await getDocs(existingQ);

    if (!existingSnapshot.empty) {
      throw new Error('Email sudah terdaftar');
    }

    const uid = generateId();
    const hashedPassword = hashPassword(password);
    const now = new Date().toISOString();

    const userData = {
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      nip: nip || '',
      jabatan: jabatan || '',
      divisi: divisi || '',
      role: role || 'karyawan',
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, 'users', uid), userData);

    // Generate token
    const token = generateToken();
    await setDoc(doc(db, 'tokens', token), {
      uid,
      createdAt: now,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });

    const { password: _, ...userWithoutPassword } = userData;
    return wrapResponse({
      user: { uid, ...userWithoutPassword },
      token,
    });
  },
};

// ========================================
// Attendance API
// ========================================
export const attendanceAPI = {
  getAll: async (params = {}) => {
    const { date, status, uid, limit: limitCount } = params;

    let q = collection(db, 'attendance');
    let constraints = [];

    if (date) constraints.push(where('date', '==', date));
    if (status) constraints.push(where('status', '==', status.toLowerCase()));
    if (uid) constraints.push(where('uid', '==', uid));

    constraints.push(orderBy('createdAt', 'desc'));
    constraints.push(limit(limitCount || 50));

    const snapshot = await getDocs(query(q, ...constraints));

    const records = [];
    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      // Fetch user info
      let userName = data.userName || '';
      let userNip = data.userNip || '';
      if (data.uid) {
        try {
          const userDoc = await getDoc(doc(db, 'users', data.uid));
          if (userDoc.exists()) {
            userName = userDoc.data().name || userName;
            userNip = userDoc.data().nip || userNip;
          }
        } catch (e) {
          // Use cached values
        }
      }
      records.push({ id: docSnap.id, ...data, userName, userNip });
    }

    return wrapResponse({ records, total: records.length });
  },

  getMy: async (params = {}) => {
    const { uid, date } = params;

    if (!uid) {
      throw new Error('UID wajib diisi');
    }

    let constraints = [where('uid', '==', uid)];
    if (date) constraints.push(where('date', '==', date));
    constraints.push(orderBy('createdAt', 'desc'));

    const snapshot = await getDocs(query(collection(db, 'attendance'), ...constraints));

    // Fetch user info once
    let userName = '';
    let userNip = '';
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        userName = userDoc.data().name || '';
        userNip = userDoc.data().nip || '';
      }
    } catch (e) {
      // Continue
    }

    const records = [];
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      records.push({
        id: docSnap.id,
        ...data,
        userName: data.userName || userName,
        userNip: data.userNip || userNip,
      });
    });

    return wrapResponse({ records, total: records.length });
  },

  getStats: async (params = {}) => {
    const { date } = params;
    const targetDate = date || formatDate(new Date());

    // Get total employees (karyawan role)
    const usersSnapshot = await getDocs(query(collection(db, 'users'), where('role', '==', 'karyawan')));
    const totalEmployees = usersSnapshot.size;

    // Get today's attendance
    const attendanceSnapshot = await getDocs(query(collection(db, 'attendance'), where('date', '==', targetDate)));

    let hadir = 0, izin = 0, sakit = 0, alpha = 0;
    attendanceSnapshot.forEach((docSnap) => {
      const status = (docSnap.data().status || '').toLowerCase();
      if (status === 'hadir') hadir++;
      else if (status === 'izin') izin++;
      else if (status === 'sakit') sakit++;
      else if (status === 'alpha') alpha++;
    });

    // 7-day trend
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const weeklyTrend = [];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = formatDate(d);
      const dayName = dayNames[d.getDay()];

      try {
        const daySnapshot = await getDocs(
          query(collection(db, 'attendance'), where('date', '==', dateStr), where('status', '==', 'hadir'))
        );
        weeklyTrend.push({ day: dayName, hadir: daySnapshot.size, date: dateStr });
      } catch (e) {
        weeklyTrend.push({ day: dayName, hadir: 0, date: dateStr });
      }
    }

    return wrapResponse({
      summary: { totalEmployees, hadir, izin, sakit, alpha },
      breakdown: { hadir, izin, sakit, alpha },
      weeklyTrend,
    });
  },

  create: async (data) => {
    const { uid, date, status, checkIn, checkOut, note } = data;

    if (!uid) {
      throw new Error('UID wajib diisi');
    }

    const id = generateId();
    const targetDate = date || formatDate(new Date());

    // Fetch user info
    let userName = '';
    let userNip = '';
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        userName = userDoc.data().name || '';
        userNip = userDoc.data().nip || '';
      }
    } catch (e) {
      // Continue
    }

    const now = new Date().toISOString();
    const attendanceData = {
      uid,
      userName,
      userNip,
      date: targetDate,
      status: (status || 'hadir').toLowerCase(),
      checkIn: checkIn || now,
      checkOut: checkOut || null,
      note: note || '',
      createdAt: now,
      updatedAt: now,
    };

    await setDoc(doc(db, 'attendance', id), attendanceData);

    return wrapResponse({
      attendance: { id, ...attendanceData },
    });
  },

  update: async (id, data) => {
    const { status, checkOut, note } = data;

    const docRef = doc(db, 'attendance', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('Data absensi tidak ditemukan');
    }

    const updateData = { updatedAt: new Date().toISOString() };
    if (status) updateData.status = status.toLowerCase();
    if (checkOut) updateData.checkOut = checkOut;
    if (note !== undefined) updateData.note = note;

    await updateDoc(docRef, updateData);
    const updatedDoc = await getDoc(docRef);

    return wrapResponse({
      attendance: { id, ...updatedDoc.data() },
    });
  },

  delete: async (id) => {
    const docRef = doc(db, 'attendance', id);
    const docSnap = await getDoc(docRef);

    if (!docSnap.exists()) {
      throw new Error('Data absensi tidak ditemukan');
    }

    await deleteDoc(docRef);
    return wrapResponse({ message: 'Data absensi berhasil dihapus' });
  },
};

// ========================================
// QR Code API
// ========================================
export const qrAPI = {
  generate: async (data = {}) => {
    const { validMinutes } = data;
    const minutes = parseInt(validMinutes) || 30;

    const code = generateId().substring(0, 8).toUpperCase();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + minutes * 60 * 1000);

    const sessionId = generateId();

    const sessionData = {
      code,
      date: formatDate(now),
      createdAt: now.toISOString(),
      expiresAt: expiresAt.toISOString(),
      validMinutes: minutes,
      active: true,
      scannedCount: 0,
    };

    await setDoc(doc(db, 'qr_sessions', sessionId), sessionData);

    // Deactivate previous sessions
    const activeSessions = await getDocs(query(collection(db, 'qr_sessions'), where('active', '==', true)));
    const batch = writeBatch(db);
    activeSessions.forEach((docSnap) => {
      if (docSnap.id !== sessionId) {
        batch.update(docSnap.ref, { active: false });
      }
    });
    await batch.commit();

    // Generate QR data string (no base64 image needed - we'll use react-native-qrcode-svg)
    const qrData = JSON.stringify({
      code,
      sessionId,
      date: formatDate(now),
      type: 'absensi',
    });

    return wrapResponse({
      session: { id: sessionId, ...sessionData },
      qrData, // Return data string instead of base64 image
      qrImage: null, // Not needed with react-native-qrcode-svg
    });
  },

  getActive: async () => {
    const snapshot = await getDocs(
      query(collection(db, 'qr_sessions'), where('active', '==', true), orderBy('createdAt', 'desc'), limit(1))
    );

    if (snapshot.empty) {
      return wrapResponse({ session: null, qrImage: null, qrData: null });
    }

    const docSnap = snapshot.docs[0];
    const sessionData = { id: docSnap.id, ...docSnap.data() };

    // Check if expired
    if (new Date(sessionData.expiresAt) < new Date()) {
      await updateDoc(docSnap.ref, { active: false });
      return wrapResponse({ session: null, qrImage: null, qrData: null });
    }

    const qrData = JSON.stringify({
      code: sessionData.code,
      sessionId: sessionData.id,
      date: sessionData.date,
      type: 'absensi',
    });

    return wrapResponse({
      session: sessionData,
      qrData,
      qrImage: null,
    });
  },

  scan: async (data) => {
    const { code, uid } = data;

    if (!code || !uid) {
      throw new Error('Code dan UID wajib diisi');
    }

    // Find the QR session
    const snapshot = await getDocs(
      query(collection(db, 'qr_sessions'), where('code', '==', code), where('active', '==', true), limit(1))
    );

    if (snapshot.empty) {
      throw new Error('QR Code tidak valid atau sudah expired');
    }

    const sessionDoc = snapshot.docs[0];
    const sessionData = sessionDoc.data();

    // Check if expired
    if (new Date(sessionData.expiresAt) < new Date()) {
      await updateDoc(sessionDoc.ref, { active: false });
      throw new Error('QR Code sudah expired');
    }

    // Check if already scanned today
    const today = formatDate(new Date());
    const existingAttendance = await getDocs(
      query(collection(db, 'attendance'), where('uid', '==', uid), where('date', '==', today), limit(1))
    );

    if (!existingAttendance.empty) {
      throw new Error('Anda sudah melakukan absensi hari ini');
    }

    // Fetch user info
    let userName = '';
    let userNip = '';
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        userName = userDoc.data().name || '';
        userNip = userDoc.data().nip || '';
      }
    } catch (e) {
      // Continue
    }

    // Create attendance record
    const attendanceId = generateId();
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
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    };

    await setDoc(doc(db, 'attendance', attendanceId), attendanceData);

    // Update scanned count
    await updateDoc(sessionDoc.ref, {
      scannedCount: increment(1),
    });

    return wrapResponse({
      attendance: { id: attendanceId, ...attendanceData },
      message: 'Absensi berhasil dicatat',
    });
  },
};

// ========================================
// Reports API
// ========================================
export const reportsAPI = {
  getSummary: async (params = {}) => {
    const { month, year } = params;
    const now = new Date();
    const targetMonth = parseInt(month) || (now.getMonth() + 1);
    const targetYear = parseInt(year) || now.getFullYear();

    const startDate = formatDate(new Date(targetYear, targetMonth - 1, 1));
    const endDate = formatDate(new Date(targetYear, targetMonth, 0));

    const snapshot = await getDocs(
      query(collection(db, 'attendance'), where('date', '>=', startDate), where('date', '<=', endDate))
    );

    let total = 0, hadir = 0, izin = 0, sakit = 0, alpha = 0;
    const dailyMap = {};
    const employeeMap = {};

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
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
      if (dailyMap[dateKey][status] !== undefined) dailyMap[dateKey][status]++;
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
      if (employeeMap[empKey][status] !== undefined) employeeMap[empKey][status]++;
      employeeMap[empKey].total++;
    });

    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
    const dailyBreakdown = Object.values(dailyMap)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map((d) => ({
        ...d,
        day: dayNames[new Date(d.date).getDay()],
        dominantStatus:
          d.hadir >= d.izin && d.hadir >= d.sakit && d.hadir >= d.alpha
            ? 'hadir'
            : d.izin >= d.sakit && d.izin >= d.alpha
            ? 'izin'
            : d.sakit >= d.alpha
            ? 'sakit'
            : 'alpha',
      }));

    const employeeBreakdown = Object.values(employeeMap).sort((a, b) => b.hadir - a.hadir);

    return wrapResponse({
      summary: { total, hadir, izin, sakit, alpha },
      dailyBreakdown,
      employeeBreakdown,
    });
  },

  getEmployeeReport: async (uid, params = {}) => {
    const { month, year } = params;
    const now = new Date();
    const targetMonth = parseInt(month) || (now.getMonth() + 1);
    const targetYear = parseInt(year) || now.getFullYear();

    const startDate = formatDate(new Date(targetYear, targetMonth - 1, 1));
    const endDate = formatDate(new Date(targetYear, targetMonth, 0));

    const snapshot = await getDocs(
      query(collection(db, 'attendance'), where('uid', '==', uid), where('date', '>=', startDate), where('date', '<=', endDate))
    );

    let total = 0, hadir = 0, izin = 0, sakit = 0, alpha = 0;
    const records = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const status = (data.status || '').toLowerCase();
      total++;

      if (status === 'hadir') hadir++;
      else if (status === 'izin') izin++;
      else if (status === 'sakit') sakit++;
      else if (status === 'alpha') alpha++;

      records.push({ id: docSnap.id, ...data });
    });

    // Get user info
    let userInfo = {};
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      if (userDoc.exists()) {
        const { password: _, ...rest } = userDoc.data();
        userInfo = rest;
      }
    } catch (e) {
      // Continue
    }

    return wrapResponse({
      user: { uid, ...userInfo },
      summary: { total, hadir, izin, sakit, alpha },
      records,
    });
  },
};

// ========================================
// Users API
// ========================================
export const usersAPI = {
  getAll: async (params = {}) => {
    const { role } = params;

    let constraints = [];
    if (role) constraints.push(where('role', '==', role));
    constraints.push(orderBy('createdAt', 'desc'));

    const snapshot = await getDocs(query(collection(db, 'users'), ...constraints));

    const users = [];
    snapshot.forEach((docSnap) => {
      const { password: _, ...userData } = docSnap.data();
      users.push({ uid: docSnap.id, ...userData });
    });

    return wrapResponse({ users, total: users.length });
  },

  getOne: async (uid) => {
    const docSnap = await getDoc(doc(db, 'users', uid));

    if (!docSnap.exists()) {
      throw new Error('User tidak ditemukan');
    }

    const { password: _, ...userData } = docSnap.data();
    return wrapResponse({ user: { uid: docSnap.id, ...userData } });
  },

  // Alias for register (used by AddEmployee screen)
  create: async (data) => {
    return authAPI.register(data);
  },

  register: async (data) => {
    return authAPI.register(data);
  },
};

export default {
  auth: authAPI,
  attendance: attendanceAPI,
  qr: qrAPI,
  reports: reportsAPI,
  users: usersAPI,
};
