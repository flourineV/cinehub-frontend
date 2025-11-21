# CineHub Frontend

Website giao diện người dùng cho hệ thống **đặt vé xem phim** (CineHub). Dự án tập trung vào trải nghiệm người dùng: xem danh sách phim, chi tiết phim, chọn suất chiếu/ghế, quản lý tài khoản… (tuỳ theo scope backend/API).

---

## 1) Công nghệ sử dụng

- **React + TypeScript**
- **Vite** (build tool)
- **Tailwind CSS** (styling)
- **ESLint** (code quality)

> Nếu dự án có dùng thêm thư viện (axios, react-router-dom, zustand/redux, socket…), bạn có thể bổ sung vào mục này.

---

## 2) Tính năng chính (tổng quan)

- Trang chủ: giới thiệu / phim nổi bật (tuỳ thiết kế)
- Danh sách phim: hiển thị phim đang chiếu / sắp chiếu (tuỳ dữ liệu)
- Chi tiết phim: mô tả, trailer, suất chiếu (nếu có)
- Đặt vé: chọn rạp, suất chiếu, ghế ngồi (nếu có)
- Tài khoản: đăng ký/đăng nhập, lịch sử đặt vé (nếu có)
- UI **Responsive** (Mobile / Tablet / Desktop)

---

## 3) Cấu trúc thư mục

```bash
CINEHUB-FRONTEND/
├── public/
├── src/
│   ├── components/     # Component tái sử dụng (Button, Modal, Card...)
│   ├── constants/      # Hằng số (keys, enums, config, routes name...)
│   ├── contexts/       # React Context (Auth/Theme/...)
│   ├── hooks/          # Custom hooks
│   ├── pages/          # Màn hình (Home, Movies, MovieDetail, Booking...)
│   ├── routes/         # Định nghĩa routes (React Router nếu có)
│   ├── services/       # API services / http client
│   ├── stores/         # State management (store)
│   ├── styles/         # Global styles / theme / style helpers
│   ├── types/          # TypeScript types/interfaces
│   ├── utils/          # Helper functions
│   ├── App.tsx
│   ├── env.d.ts
│   ├── index.css
│   └── main.tsx
├── index.html
├── eslint.config.js
├── postcss.config.js
├── tailwind.config.js
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vercel.json
├── vite.config.ts
└── README.md
```

---

## 4) Yêu cầu hệ thống

- **Node.js >= 18**
- **npm** (hoặc yarn/pnpm)

Kiểm tra:
```bash
node -v
npm -v
```

---

## 5) Cài đặt & chạy dự án

### 5.1 Clone source
```bash
git clone https://github.com/flourineV/cinehub-frontend.git
cd cinehub-frontend
```

### 5.2 Cài dependencies
```bash
npm install
```

### 5.3 Tạo file môi trường (nếu dự án dùng env)

Tạo file `.env` ở thư mục gốc (cùng cấp `package.json`).

Ví dụ (Vite yêu cầu prefix `VITE_`):
```env
VITE_API_BASE_URL=http://localhost:8080
VITE_APP_NAME=CineHub
```

> Nếu code bạn đang đọc biến env khác tên, hãy đổi cho đúng.

### 5.4 Chạy dev
```bash
npm run dev
```

Mặc định Vite chạy tại:
- http://localhost:5173

---

## 6) Scripts

Tuỳ theo `package.json`, thường có các lệnh:

```bash
npm run dev       # chạy dev server
npm run build     # build production
npm run lint      # kiểm tra eslint
```

---

## 7) Triển khai (Deploy)

### 7.1 Build production
```bash
npm run build
```
Output mặc định: `dist/`

### 7.2 Deploy Vercel (nếu dùng)
- **Framework preset:** Vite
- **Build command:** `npm run build`
- **Output directory:** `dist`
- Set Environment Variables giống file `.env`

---

## 8) Troubleshooting

### 8.1 PowerShell báo lỗi khi gõ `bash`
Nếu bạn đang mở Terminal bằng **PowerShell** và gõ `bash` sẽ báo:
`'bash' is not recognized...`

✅ Cách xử lý:
- Không cần gõ `bash`. Chạy trực tiếp:
  ```bash
  npm install
  npm run dev
  ```
- Hoặc đổi terminal sang **Git Bash** trong VS Code:
  - Terminal → Select Default Profile → Git Bash

### 8.2 Không gọi được API
- Kiểm tra `VITE_API_BASE_URL` đúng chưa
- Backend đã chạy chưa
- Backend đã bật CORS cho domain frontend chưa

### 8.3 Tailwind không ăn style
- Kiểm tra `tailwind.config.js` phần `content`
- Kiểm tra `index.css` đã được import trong `main.tsx` chưa

---

## 9) License

Dự án phục vụ mục đích học tập / nội bộ.
