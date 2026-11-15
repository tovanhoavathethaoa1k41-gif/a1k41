# Hướng dẫn deploy & sửa tỉ số trên Vercel (A1 League)

## Vì sao trước đây chỉ sửa được tỉ số ở "bên ngoài" (local / AI Studio) mà trên link Vercel thì không?

- Khi chạy `npm run dev` (hoặc trong AI Studio) web dùng **`local-server.ts`**: tự lưu tỉ số vào file `data/tournament_state.json`, mật khẩu mặc định `a1k41league`. Không cần cấu hình gì.
- Khi chạy trên **Vercel**, web dùng các hàm trong thư mục **`api/`**. Các hàm này cần **2 thứ bạn phải tự cài trên Vercel**:
  1. Biến môi trường **`ADMIN_PASSWORD`** (mật khẩu `a1k41league` **không** áp dụng trên Vercel — mật khẩu là cái bạn tự đặt).
  2. Database **Upstash Redis** (để lưu tỉ số cho mọi người cùng xem).
  
  Thiếu một trong hai thì đăng nhập admin báo lỗi, hoặc đăng nhập được nhưng tỉ số không lưu lên server.

Bản cập nhật này có sẵn **trang chẩn đoán**: mở `https://<link-của-bạn>/api/health` là biết thiếu gì. Bảng Admin cũng tự hiện khung đỏ nêu rõ lỗi.

---

## Các bước cài đặt (làm 1 lần)

### Bước 1 — Đưa code lên Vercel
1. Giải nén file zip, đẩy cả thư mục lên một repo GitHub mới (hoặc kéo thả vào Vercel CLI).
2. Vào https://vercel.com/new → **Import** repo đó.
3. Cấu hình: **Framework Preset = Vite**, Build Command `npm run build`, Output Directory `dist` (Vercel tự nhận, thường không cần sửa) → **Deploy**.

### Bước 2 — Tạo database Redis
1. Vào project trên Vercel → tab **Storage**.
2. Bấm **Create Database** → chọn **Upstash → Redis** (gói Free là đủ) → đặt tên bất kỳ → **Create**.
3. Khi được hỏi gắn vào project: chọn project của bạn, tích **cả 3 môi trường** (Production, Preview, Development) → **Connect**.
4. Vercel tự thêm 2 biến `KV_REST_API_URL` và `KV_REST_API_TOKEN`. Bạn không cần chép tay.

### Bước 3 — Đặt mật khẩu admin
1. Project → **Settings → Environment Variables**.
2. Thêm biến: **Key** = `ADMIN_PASSWORD`, **Value** = mật khẩu của bạn (dài, khó đoán), tích cả 3 môi trường → **Save**.

### Bước 4 — Redeploy (bắt buộc!)
Biến môi trường chỉ có hiệu lực với bản deploy **mới**.
1. Tab **Deployments** → bấm dấu **⋯** ở bản trên cùng → **Redeploy** → xác nhận.
2. Đợi trạng thái **Ready**.

### Bước 5 — Kiểm tra
Mở `https://<link-của-bạn>/api/health`. Kết quả đúng:
```json
{"success":true,"adminPasswordSet":true,"redisConfigured":true,"redisReachable":true}
```

### Bước 6 — Vào giao diện admin
**Trang web công khai không còn nút Admin và không còn `/#admin`.** Giao diện Admin chỉ có khi:
- chạy local bằng `npm run dev`, hoặc
- build với biến môi trường **`VITE_ENABLE_ADMIN=true`** (ví dụ tạo một dự án Vercel riêng, dùng chung database Redis và `ADMIN_PASSWORD`, chỉ dành cho quản trị viên; dự án công khai thì KHÔNG đặt biến này).

Khi giao diện Admin đã bật: bấm nút **Quản Trị Viên** ở góc phải thanh trên cùng (hoặc nút **Admin** ở chân trang), hoặc mở `/#admin`. Nhập mật khẩu ở Bước 3. Từ đó mọi thay đổi **tự lưu lên server ngay** (góc trên bảng admin hiện "Đã lưu lên máy chủ"); các máy khác thấy sau vài giây.

---

## Xử lý sự cố

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|---|---|---|
| `/api/health` hiện trang 404 / HTML | Thư mục `api` chưa lên Vercel, hoặc project bị bật *Deployment Protection* | Kiểm tra repo có thư mục `api/`; Settings → **Deployment Protection** → tắt *Vercel Authentication* cho Production |
| `adminPasswordSet: false` | Chưa tạo `ADMIN_PASSWORD` hoặc chưa Redeploy | Làm lại Bước 3 + 4 |
| `redisConfigured: false` | Chưa kết nối Redis với project | Làm lại Bước 2, nhớ tích đủ môi trường rồi Redeploy |
| `redisReachable: false` | Sai URL/Token Redis | Storage → mở database → kiểm tra lại, gắn lại vào project |
| Đăng nhập báo "Mật khẩu không chính xác" | Dùng nhầm mật khẩu local `a1k41league` | Dùng đúng `ADMIN_PASSWORD` đã đặt trên Vercel |
| Admin sửa được nhưng máy khác không thấy | Lưu server thất bại (hiện khung đỏ/"Lưu thất bại") | Xem `/api/health`; đăng nhập lại (phiên admin hết hạn sau 24 giờ) |
| Mở link preview (…-git-xxx.vercel.app) thì khác link chính | Mỗi domain lưu đăng nhập riêng | Luôn dùng link Production để vào admin |
| Xem link chia sẻ không có ảnh đại diện | Mạng xã hội lưu cache cũ | Dùng công cụ "Sharing Debugger" của Facebook/Zalo để làm mới |

## Bảo mật
- Đổi `ADMIN_PASSWORD` bất cứ lúc nào ở Settings → Environment Variables rồi Redeploy; mọi phiên đăng nhập cũ sẽ tự hết hiệu lực.
- Không đưa file `.env*` lên GitHub (đã có trong `.gitignore`).

---

## Ghi chú về bản cập nhật này (Own Goal, xếp hạng, thẻ phạt)

- **Own Goal**: trong Admin → Thêm Bàn Thắng, chọn đội (VD: PHÔI FC) rồi chọn loại **Own Goal** → đội đó được **+1 bàn**, không cần chọn cầu thủ, không tính bàn thắng/kiến tạo cho ai. Ngoài web chỉ hiện chữ "Own Goal". Xóa được như bàn thắng thường (tỉ số tự trừ 1).
- Loại bàn thắng chỉ còn: **Bóng sống**, **Penalty**, **Own Goal**.
- Đã bỏ "Seed" ở phần Đội bóng; bỏ cột "Bàn thắng ghi được" ở bảng Đội Thủng Lưới.
- **Xếp hạng bảng** (xét ngầm, không hiển thị): Điểm → Hiệu số → Bàn thắng → Đối đầu trực tiếp → Thẻ phạt (đỏ = 2 vàng, ít thẻ hơn xếp trên).
- **Thẻ phạt**: xếp từ nhiều thẻ nhất (đỏ = 2 vàng), hiển thị riêng 2 cột Thẻ vàng / Thẻ đỏ.
- Dữ liệu cũ đã lưu trên Redis vẫn dùng được. Nếu trước đây có Own Goal nhập theo kiểu cũ (chọn cầu thủ), hãy xóa và nhập lại theo cách mới.
- Sau khi đẩy code mới lên GitHub, Vercel sẽ tự deploy lại; không cần đổi biến môi trường.
