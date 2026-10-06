# คู่มือการตั้งค่า Firebase Firestore และการ Deploy ขึ้น GitHub Pages
### สำหรับระบบ NLPC.04 — UAV Survey Operations Tracker (กรมที่ดิน)

เอกสารนี้รวบรวมขั้นตอนอย่างละเอียดในการเชื่อมต่อระบบกับ Cloud Database (Firebase Firestore) และการนำระบบขึ้นสู่ GitHub Pages เพื่อให้สามารถเข้าใช้งานได้จากทุกที่ ทุกอุปกรณ์ โดยไม่ต้องเปิดคอมพิวเตอร์ทิ้งไว้

---

## 📌 สรุปสิ่งที่มีการปรับปรุงในระบบแล้ว
1. **ระบบความปลอดภัยและการแยกสิทธิ์ (Role-Based Access Control - RBAC)**:
   - **บุคคลทั่วไป / ผู้บริหาร (Guest)**: สามารถเปิดดู Dashboard, แผนที่ประเทศไทย, สถิติ, คลังภารกิจ และรายละเอียดภารกิจได้แบบ **อ่านอย่างเดียว (Read-Only)** โดยระบบจะซ่อนปุ่มเพิ่มภารกิจและปุ่มลบ
   - **เจ้าหน้าที่ผู้ดูแล (Staff / Admin)**: เข้าสู่ระบบได้ทันทีผ่าน **Admin Passcode** โดย**ไม่ต้องสร้างบัญชีหรือลงทะเบียน**:
     - **รหัสผ่านเข้าสู่ระบบ**: `nlpc@dol04`
     - เมื่อเข้าสู่ระบบแล้ว จะปรากฏปุ่ม **"➕ บันทึกงานใหม่"** และปุ่ม **"ลบรายการนี้"** ทันที
2. **ปรับเปลี่ยนชื่อแบรนด์ระบบ**:
   - เปลี่ยนชื่อจาก `AERO.OPS` เป็น **`NLPC.04`** (โดย **NLPC** เป็นสีดำ และ **.04** เป็นสีฟ้า) ทั้งบนเมนูด้านบน, หัวเว็บ, และส่วนท้ายหน้าเว็บ
3. **ระบบ Cloud Database (Firebase Firestore)**:
   - พร้อมเชื่อมต่อฐานข้อมูลคลาวด์แบบ Real-time ข้อมูลอัปเดตตรงกันทุกคนโดยอัตโนมัติ
   - มีปุ่ม **"🚀 ซิงค์ 25 ภารกิจขึ้น Firestore"** ในคลิกเดียว ไม่ต้องกรอกข้อมูลเดิมซ้ำ

---

## ส่วนที่ 1: ขั้นตอนการตั้งค่า Firebase Firestore จากศูนย์ (Step-by-Step)

### ขั้นตอนที่ 1.1: สร้าง Firebase Project
1. เข้าไปที่เว็บไซต์ [Firebase Console](https://console.firebase.google.com/) แล้วล็อกอินด้วยบัญชี Google ของท่าน
2. คลิกปุ่ม **"Add project"** (หรือ "Create a project")
3. ตั้งชื่อโปรเจกต์ เช่น `nlpc-uav-tracker` แล้วคลิก **Continue**
4. หน้า Google Analytics: สามารถกด **Disable (ปิด)** หรือเปิดไว้ก็ได้ แล้วคลิก **"Create project"**
5. รอระบบสร้างโปรเจกต์ประมาณ 15 วินาที เมื่อเสร็จแล้วคลิก **"Continue"** เพื่อเข้าสู่หน้าแดชบอร์ด

---

### ขั้นตอนที่ 1.2: เปิดใช้งาน Cloud Firestore Database
1. ในแถบเมนูด้านซ้าย เลือก **Build > Firestore Database**
2. คลิกปุ่ม **"Create database"**
3. **เลือกตำแหน่งเซิร์ฟเวอร์ (Location)**: 
   - แนะนำเลือก `asia-southeast1` (Singapore) หรือ `asia-east1` (Taiwan) เพื่อความเร็วสูงสุดในการใช้งานในประเทศไทย
4. **Security rules**: เลือก **"Start in test mode"** หรือ "Start in production mode" แล้วคลิก **Next / Create**

---

### ขั้นตอนที่ 1.3: ตั้งค่า Security Rules (กฎความปลอดภัย)
เนื่องจากระบบใช้การล็อกอินผ่าน **Admin Passcode (`nlpc@dol04`)** บนหน้าเว็บโดยตรงโดยไม่ต้องสร้าง User ในระบบ Firebase Auth ดังนั้นกฎของ Firestore จะต้องอนุญาตให้หน้าเว็บอ่านและบันทึกข้อมูลภารกิจได้:

1. ในหน้า Firestore Database ให้คลิกแท็บ **"Rules"** ด้านบน
2. วางโค้ดกฎความปลอดภัยดังต่อไปนี้แทนที่ของเดิมทั้งหมด:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /missions/{document=**} {
      allow read, write: if true;
    }
  }
}
```

3. คลิกปุ่ม **"Publish"** สีฟ้า เพื่อเปิดใช้งานกฎความปลอดภัย

---

### ขั้นตอนที่ 1.4: ดึงค่า Firebase Configuration (Web App)
1. คลิกที่ไอคอนรูปเฟือง ⚙️ ด้านบนซ้าย (ข้างคำว่า Project Overview) แล้วเลือก **"Project settings"**
2. เลื่อนลงมาด้านล่างสุดที่หัวข้อ **"Your apps"**
3. คลิกที่ไอคอนรูปโค้ดเว็บ **`</>`** (Web App)
4. ตั้งชื่อ App เช่น `nlpc-web` แล้วคลิก **"Register app"** (ไม่ต้องติ๊ก Firebase Hosting)
5. ระบบจะแสดงโค้ด `firebaseConfig` ออกมา ให้สังเกตค่าต่างๆ ดังนี้:
   ```javascript
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "nlpc-uav-tracker.firebaseapp.com",
     projectId: "nlpc-uav-tracker",
     storageBucket: "nlpc-uav-tracker.appspot.com",
     messagingSenderId: "1234567890",
     appId: "1:1234567890:web:abcdef..."
   };
   ```

---

### ขั้นตอนที่ 1.5: นำค่า Config มาเชื่อมต่อกับระบบ
ท่านสามารถเลือกทำได้ 2 วิธีตามความสะดวก:

#### วิธีที่ A: กรอกผ่านหน้าเว็บโดยตรง (สะดวกที่สุด ไม่ต้องแก้โค้ด)
1. เปิดหน้าเว็บระบบ UAV Tracker ของท่านขึ้นมา
2. บนแถบเมนูนำทางด้านบน จะมีปุ่มรูปจุดสีเหลืองเขียนว่า **"Cloud"** ให้คลิกที่ปุ่มนั้น
3. หน้าต่างตั้งค่า Firestore จะเปิดขึ้นมา ให้คัดลอกค่าจากขั้นตอนที่ 1.4 มากรอกลงในช่อง:
   - **API Key**: ค่า `apiKey`
   - **Project ID**: ค่า `projectId`
   - **Auth Domain**: ค่า `authDomain`
   - **App ID**: ค่า `appId`
4. คลิกปุ่ม **"บันทึกและเชื่อมต่อ"**
5. หน้าเว็บจะรีโหลดอัตโนมัติ และจุดสถานะจะเปลี่ยนเป็น **สีเขียว (Cloud: Online)** ทันที!

#### วิธีที่ B: แก้ไขในไฟล์ `firebase-config.js`
1. เปิดไฟล์ `firebase-config.js` ในโฟลเดอร์โปรเจกต์
2. นำค่าที่ได้จาก Firebase มาวางแทนที่ `YOUR_API_KEY`, `YOUR_PROJECT_ID` ฯลฯ
3. บันทึกไฟล์

---

### ขั้นตอนที่ 1.6: ซิงค์ข้อมูลเริ่มต้น 25 ภารกิจขึ้น Cloud ในคลิกเดียว
1. เมื่อสถานะเป็นสีเขียว (Cloud: Online) แล้ว ให้คลิกที่ปุ่ม **Cloud** บนแถบเมนูอีกครั้ง
2. คลิกปุ่ม **"🚀 ซิงค์ 25 ภารกิจขึ้น Firestore"**
3. ระบบจะอัปโหลดข้อมูลภารกิจทั้ง 25 รายการแรกขึ้น Cloud Firestore ให้ทันที!
4. ข้อมูลทั้งหมดจะถูกจัดเก็บบนคลาวด์ตลอดไป และทุกคนที่เปิดเว็บจะเห็นข้อมูลตรงกันแบบ Real-time

---

## ส่วนที่ 2: การ Deploy ขึ้น GitHub Pages (ฟรี 100%)

### ขั้นตอนที่ 2.1: สร้าง Repository บน GitHub
1. เข้าไปที่ [GitHub](https://github.com/) แล้วล็อกอิน
2. คลิกปุ่ม **"New"** เพื่อสร้าง Repository ใหม่
3. ตั้งชื่อ Repository เช่น `sum_UAV` หรือ `uav-survey-tracker`
4. เลือกเป็น **Public** แล้วคลิก **"Create repository"**

### ขั้นตอนที่ 2.2: Push โค้ดขึ้น GitHub
เปิด PowerShell ในโฟลเดอร์ `sum_UAV` แล้วรันคำสั่งดังนี้:

```powershell
# 1. เพิ่มไฟล์ทั้งหมด
git add .

# 2. ทำการ Commit
git commit -m "Update NLPC.04 branding, Admin Passcode auth, and Firebase setup"

# 3. กำหนด Branch หลักเป็น main
git branch -M main

# 4. เชื่อมโยงกับ GitHub Repository ของท่าน (แทนที่ URL ด้วยของท่าน)
git remote add origin https://github.com/USERNAME/sum_UAV.git

# 5. Push ขึ้น GitHub
git push -u origin main
```

### ขั้นตอนที่ 2.3: เปิดใช้งาน GitHub Pages
1. ในหน้า GitHub Repository ของท่าน ไปที่แท็บ **Settings**
2. ในเมนูด้านซ้าย เลือก **Pages**
3. ภายใต้หัวข้อ **Build and deployment > Branch**:
   - เลือก Branch: `main`
   - เลือก Folder: `/ (root)`
4. คลิก **"Save"**
5. รอประมาณ 1-2 นาที ท่านจะได้ URL เว็บไซต์ เช่น `https://USERNAME.github.io/sum_UAV/` ซึ่งสามารถแชร์ให้ทีมงานและผู้บริหารเปิดใช้งานได้จากทั่วโลกทันที!
