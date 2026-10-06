// ====================================================================
// NLPC.04 — UAV Survey Operations Tracker (กรมที่ดิน)
// Firebase Configuration File (Cloud Firestore & Authentication)
// ====================================================================
// คำแนะนำ:
// 1. นำค่า Configuration จาก Firebase Console:
//    Project Settings > General > Your apps (กดเพิ่ม Web App </>)
// 2. คัดลอกค่ามาวางแทนที่ด้านล่างนี้ หรือกดปุ่ม "ตั้งค่า Firebase" บนหน้าเว็บ
// ====================================================================

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD1rN-sQtbOmLDjRhqytjR5O_7XZMRu1vs",
  authDomain: "sum-uav.firebaseapp.com",
  projectId: "sum-uav",
  storageBucket: "sum-uav.firebasestorage.app",
  messagingSenderId: "703180926471",
  appId: "1:703180926471:web:aa57e7a6050149bb5c84a2",
  measurementId: "G-DM6MMXM6M0"
};

// ตรวจสอบความถูกต้องของ Firebase Config
function isFirebaseConfigValid(cfg) {
  const c = cfg || FIREBASE_CONFIG;
  return Boolean(
    c && 
    c.apiKey && 
    c.apiKey !== "YOUR_API_KEY" && 
    c.projectId && 
    c.projectId !== "YOUR_PROJECT_ID" && 
    c.projectId.trim() !== ""
  );
}

// ดึง Config ที่ใช้งาน (รองรับทั้งจากไฟล์นี้ และที่ตั้งค่าผ่าน UI ใน LocalStorage)
function getActiveFirebaseConfig() {
  try {
    const custom = localStorage.getItem('uav_firebase_custom_config');
    if (custom) {
      const parsed = JSON.parse(custom);
      if (isFirebaseConfigValid(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Error reading custom firebase config', e);
  }
  return FIREBASE_CONFIG;
}
