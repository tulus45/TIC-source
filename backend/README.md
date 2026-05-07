# TIC Registration Backend

Backend ringan ini menampung data registrasi dari aplikasi Android dan menyediakan web admin sederhana untuk review `approve/reject`.

## Siap Deploy ke Render

Project ini sekarang sudah disiapkan untuk deploy ke Render memakai file [render.yaml](../render.yaml).

Yang sudah disiapkan:

- service type `web` dengan runtime `node`
- `rootDir: backend` supaya Render hanya build folder backend
- health check `/api/health`
- persistent disk untuk menyimpan data registrasi dan upload KTP/selfie
- region default `singapore` agar lebih dekat ke Indonesia

Storage backend sekarang bisa diarahkan lewat environment variable:

- `TIC_STORAGE_ROOT`
- `TIC_DATA_DIR`
- `TIC_UPLOADS_DIR`

Kalau variabel itu tidak diisi, backend tetap memakai folder lokal seperti sekarang.

## Yang Sudah Bisa

- `POST /api/registrations` untuk menyimpan atau memperbarui registrasi berdasarkan `uid`
- `POST /api/uploads/registration-assets` untuk upload file KTP dan selfie
- `GET /api/registrations/status` untuk membaca status approval
- `GET /api/users/me` untuk membaca profil registrasi berdasarkan `uid`, `gmail`, atau `registrationId`
- `GET /api/admin/registrations` untuk daftar review di web admin
- `POST /api/admin/registrations/{id}/approve`
- `POST /api/admin/registrations/{id}/reject`
- halaman admin di `/admin`

Catatan:

- backend ini masih menyimpan data di file `backend/data/registrations.json`
- file KTP dan selfie sekarang disimpan sungguhan di folder `backend/uploads/registrations/...`
- field `ktpDriveFileId` dan `selfieDriveFileId` saat ini dipakai sebagai URL file upload hasil simpan backend lokal

## Cara Menjalankan

```bash
cd backend
npm start
```

Server default akan aktif di:

- API: `http://192.168.1.112:8787/api/health`
- Admin: `http://192.168.1.112:8787/admin`

Backend sekarang default listen ke `0.0.0.0`, jadi bisa diakses dari emulator Android maupun device lain di jaringan yang sama selama firewall Windows mengizinkan port `8787`.

Kalau IP Wi-Fi komputer berubah, Anda bisa override base URL Android saat build dengan Gradle property:

```bash
$env:ORG_GRADLE_PROJECT_ticBackendBaseUrl="http://IP-BARU-ANDA:8787"
```

Default backend Android di repo ini sekarang:

- `https://tic-registration-backend.onrender.com`

## Cara Deploy ke Render

1. Push repo ini ke GitHub.
2. Login ke Render.
3. Pilih `New +` -> `Blueprint`.
4. Hubungkan repo GitHub yang berisi project ini.
5. Render akan membaca file `render.yaml` dari root repo.
6. Review nama service, region, dan plan.
7. Deploy.

Catatan penting:

- Render menyatakan filesystem service bersifat sementara secara default, jadi kita sengaja memakai `disk` agar file JSON registrasi dan upload foto tidak hilang saat restart atau redeploy:
  https://render.com/docs/disks
- Render Blueprint membaca `render.yaml` dari root repo, dan field `rootDir` dipakai untuk monorepo seperti project ini:
  https://render.com/docs/blueprint-spec

Setelah deploy sukses, Anda akan mendapat URL publik seperti:

- `https://tic-registration-backend.onrender.com`

Admin web nanti bisa diakses di:

- `https://tic-registration-backend.onrender.com/admin`

## Struktur Payload Registrasi

Contoh body `POST /api/registrations`:

```json
{
  "uid": "tic-demo-uid-001",
  "gmail": "demo@tic.local",
  "displayName": "Enumerator Demo TIC",
  "nik": "5301010101010001",
  "nama": "Nama Manual",
  "alamat": "Jalan Contoh 123",
  "noHp": "081234567890",
  "noRekening": "1234567890",
  "namaBank": "BANK NTT",
  "namaPemilik": "Nama Manual",
  "areaKerja": "Kab. Sumba Barat",
  "ktpLocalPath": "content://atau/path/ktp.jpg",
  "selfieLocalPath": "content://atau/path/selfie.jpg",
  "ktpDriveFileId": "/uploads/registrations/tic-demo-uid-001/ktp_123456.jpg",
  "selfieDriveFileId": "/uploads/registrations/tic-demo-uid-001/selfie_123456.jpg"
}
```

## Upload Asset Registrasi

Contoh body `POST /api/uploads/registration-assets`:

```json
{
  "uid": "tic-demo-uid-001",
  "gmail": "demo@tic.local",
  "assetType": "ktp",
  "fileName": "ktp_20260507_003355.jpg",
  "mimeType": "image/jpeg",
  "base64Data": "BASE64_FILE_CONTENT"
}
```

Contoh response:

```json
{
  "assetType": "ktp",
  "fileName": "ktp_1746570000000.jpg",
  "fileUrl": "/uploads/registrations/tic-demo-uid-001/ktp_1746570000000.jpg"
}
```

## Status Query

Contoh:

- `GET /api/registrations/status?uid=tic-demo-uid-001`
- `GET /api/registrations/status?gmail=demo@tic.local`
- `GET /api/users/me?registrationId=reg-...`

## Langkah Lanjutan

1. Ganti file JSON ke database sungguhan seperti PostgreSQL atau MySQL.
2. Tambahkan autentikasi admin.
3. Ganti upload base64 JSON ke multipart kalau trafik file mulai besar.
4. Sambungkan Android ke endpoint ini lewat Retrofit.

## Mengarahkan Android ke Backend Online

Setelah domain Render sudah aktif, build Android dengan base URL `https` baru. Contoh:

```powershell
$env:ORG_GRADLE_PROJECT_ticBackendBaseUrl="https://YOUR-SERVICE.onrender.com"
./gradlew assembleDebug
```

Atau untuk release:

```powershell
$env:ORG_GRADLE_PROJECT_ticBackendBaseUrl="https://YOUR-SERVICE.onrender.com"
./gradlew assembleRelease
```

Sekarang project Android sudah dibedakan seperti ini:

- `debug`: masih mengizinkan `http` untuk testing lokal
- `release`: hanya untuk koneksi yang aman, jadi cocok dipakai setelah backend online `https`
