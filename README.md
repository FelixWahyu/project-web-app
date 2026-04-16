# Project Web App (ElysiaJS Backend)

Aplikasi ini adalah sebuah backend web service (API) yang dibangun menggunakan environment eksekusi JavaScript yang sangat cepat yaitu **Bun**, dipadukan dengan framework web **ElysiaJS**. Aplikasi ini juga menggunakan **Drizzle ORM** untuk berinteraksi dengan database **MySQL**. Fitur utama yang disediakan aplikasi ini saat ini adalah sistem *User Authentication* lengkap yang mencakup Register, Login, Update Profile, serta Logout menggunakan Token Session khusus.

## 🛠️ Technology Stack & Libraries

Proyek ini dibangun di atas teknologi modern:
- **Bun** - Runtime JavaScript & TypeScript interaktif dan sangat cepat (sebagai pengganti Node.js).
- **ElysiaJS** (`elysia`) - Framework backend web super cepat yang berjalan di atas Bun berorientasi pada Type-Safety dan kapabilitas TypeScript.
- **Elysia TypeBox** (`@sinclair/typebox` / Elysia built-in) - Untuk validasi skema tipe input request di level framework.
- **Drizzle ORM** (`drizzle-orm`) - Object Relational Mapper (ORM) TypeScript *headless* untuk berinteraksi dengan database secara *Type-Safe*.
- **Drizzle Kit** (`drizzle-kit`) - CLI tambahan Drizzle untuk keperluan migrasi *schema* ke database (`db:push`, dsb.).
- **MySQL2** (`mysql2`) - Driver database MySQL yang kompatibel dengan Drizzle.
- **Elysia CORS** (`@elysiajs/cors`) - Ekstensi untuk mengaktifkan pengaturan CORS.

---

## 🏗️ Architecture & Folder Structure

Kode disusun sedemikian rupa memisahkan _Routing_ (Controllers) dengan _Business Logic_ (Services) demi skalabilitas dan kemudahan _maintain_:

```
project-website/
├── src/
│   ├── db/
│   │   ├── index.ts        # Database connection & setup Drizzle
│   │   └── schema.ts       # Definisi Skema Tabel Database 
│   ├── routes/
│   │   └── userRoutes.ts   # Konfigurasi endpoint & route handler (Controller)
│   ├── services/
│   │   └── userService.ts  # Logic Authentikasi & pemrosesan/manipulasi data
│   └── index.ts            # Entry point aplikasi (Inisialisasi Elysia app)
├── drizzle/                # Otomatis digenerate Drizzle untuk internal migrasi
├── .env                    # Variabel environment (kredensial database, dll)
├── drizzle.config.ts       # Konfigurasi koneksi untuk Drizzle Kit
├── package.json            # Daftar script terminal dan dependensi
└── README.md
```

### Penamaan File & Pola
- **Routes** (`*Routes.ts`): Memiliki tugas semata hanya untuk menerima input dari HTTP Request, mencocokkannya ke Middleware dan skema Input, lalu memberikan data ke layer Service.
- **Services** (`*Service.ts`): Menyimpan seluruh logika bisnis (mencari data, mengecek kelayakan, insert/update). Ini membuat kode menjadi *DRY* *(Don't Repeat Yourself)* dan unit test-*able*.
- **Schema Database** (`schema.ts`): Pusat sumber validasi *Schema* (SSOT) agar Typescript mengenali semua interaksi tipe data relasional kita.

---

## 🗄️ Database Schema

Aplikasi menggunakan skema relasional tabel dengan Drizzle ORM:

1. **`users` Table**
   - `id`: Tipe `serial` (Primary Key, Auto-increment).
   - `name`: Tipe `varchar(255)`, wajib diisi.
   - `username`: Tipe `varchar(255)`, wajib diisi & unik (Unique).
   - `password`: Tipe `varchar(255)`, wajib diisi (berisi password hashed).
   - `created_at`: Tipe `timestamp` default NOW.
   - `updated_at`: Tipe `timestamp` terupdate otomatis seiring update data.

2. **`sessions` Table**
   - `id`: Tipe `serial` (Primary Key).
   - `user_id`: Tipe `bigint`, menghubungkan/ber-relasi ke tabel `users.id`.
   - `token`: Tipe `varchar(255)`, unik berisi string identitas otorisasi (UUID).
   - `expires_at`: Tipe `datetime`, penanda waktu kadaluarsa _session_.
   - `created_at`: Tipe `timestamp`
   - `updated_at`: Tipe `timestamp`

---

## 🌐 API Endpoints

Semua endpoints bernaung di bawah *prefix* `/api`.

1. **Register User**
   - **Method:** `POST /api/users`
   - **Body:** `{ name, username, password }`
   - **Response:** Berupa data id, name, dan username saat user berhasil dibuat.
2. **Login User**
   - **Method:** `POST /api/users/login`
   - **Body:** `{ username, password }`
   - **Response:** `token` session rahasia, status 200 jika kredensial benar.
3. **Get Current User**
   - **Method:** `GET /api/users/current`
   - **Headers:** `Authorization: Bearer <token>`
   - **Response:** Data detail user `(id, name, username)` yang merupakan pemegang token.
4. **Update Current User**
   - **Method:** `PATCH /api/users/current/:id`
   - **Headers:** `Authorization: Bearer <token>`
   - **Body:** `{ name?, username?, password? }` *(Semua Opsional)*
   - **Response:** Detail user dengan data terbaru. Hanya pemilik sejati id yang dapat mengaksesnya.
5. **Logout User**
   - **Method:** `DELETE /api/users/logout`
   - **Headers:** `Authorization: Bearer <token>`
   - **Response:** Pesan sukses dan otomatis membatalkan/menghapus token session dari database.

---

## 🚀 Setup & Run Project

Ikuti instruksi berikut untuk menjalankan projek ke lingkungan lokal (_Local Environment_):

### Prasyarat
- Instal [Bun Runtime](https://bun.sh/)
- Aplikasi Database MySQL yang sedang berjalan (Contoh: XAMPP, Laragon, MySQL Docker container).

### Cara Setup
1. **Clone repositori** ini atau extract foldernya.
2. **Install Dependensi**. Jalankan secara langsung dari terminal di *root* direktori:
   ```bash
   bun install
   ```
3. **Konfigurasi Environment**. 
   Buat file bernama `.env` berdasarkan kredensial mysql lokal Anda. Jika *Localhost* MySQL user berupa default root tanpa pass, isikan:
   ```env
   DATABASE_URL="mysql://root:@localhost:3306/db_vibe_coding"
   ```
4. **Sinkronisasi Database (*Push Scheme*)**. Buat tabel ke MySQL (Pastikan database bernama `db_vibe_coding` sudah ada sebelumnya):
   ```bash
   bun run db:push
   ```

### Cara Menjalankan Aplikasi
Mulai server dalam mode _watch_ (Otomatis reload saat kode diedit):
```bash
bun run dev
```
👉 Server akan berjalan pada port `http://localhost:3000`

---

## 🧪 Testing API

Proyek ini mendukung dua lapis pengujian, yakni secara manual menggunakan REST Client, dan pengujian otomatis (Unit Testing) yang lebih komprehensif.

### 1. Automated Testing (Unit & Integration)
Aplikasi ini sudah dilengkapi dengan unit test modern yang dijalankan melalui _built-in test runner_ milik Bun. Test ini menguji segala bentuk jalur sukses maupun respon gagal di setiap skenario tanpa memengaruhi database produksi (harus di set jika belum).

1. **Jalankan Unit Test**
   Buka terminal, dan eksekusi perintah:
   ```bash
   bun run test
   ```
   Atau bisa secara langsung dengan mengeksekusi `bun test`.
2. **Cakupan Pengujian**
   - Registrasi dan Login (Validasi Input, Checking Duplikasi dsb.)
   - Middleware & Rute Terproteksi.
   - Pengecekan Edge Case serta manipulasi Session.
*(Akan mencetak log eksekusi secara super-cepat seputar status tiap skenario test).*

### 2. Manual Testing (REST Client)

Berhubung kerangka Backend dibangun sebagai API, Anda juga memvalidasinya menggunakan alat bantu pengujian REST Client.
Kami merokomendasikan seperti: 
- [Postman](https://www.postman.com/)
- [Insomnia](https://insomnia.rest/)
- Ekstensi VSCode **ThunderClient**

**Alur Test:**
1. Hit registrasi `/api/users` via metode `POST` menggunakan body format JSON untuk merancang *user*.
2. Lakukan login akun di `/api/users/login`, dan pastikan Anda mendapatkan balasan `"token"`.
3. Gunakan `"token"` tersebut lalu sematkan di **Headers HTTP** (`Authorization: Bearer <token Anda>`) dan tembak pada route yang terproteksi (`/api/users/current`).
4. Lakukan modifikasi User pada endpoint `PATCH /api/users/current/:id`
5. Jika telah usai, tembak `DELETE /api/users/logout` untuk menghapus dan mematikan fungsi token tersebut.
