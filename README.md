# A1K41 Winter Cup – Tỉ số trực tiếp

Web hiển thị tỉ số, bảng xếp hạng, sơ đồ knock-out và thống kê. Admin nhập/sửa tỉ số → mọi máy khác tự thấy sau vài giây.

> **Trang web công khai không có lối vào Admin** (không có nút Admin, đường link `/#admin` không còn tác dụng).
> Giao diện Admin chỉ xuất hiện khi chạy local (`npm run dev`) hoặc khi build với biến `VITE_ENABLE_ADMIN=true`
> (ví dụ một dự án Vercel riêng chỉ dành cho người quản trị).

## Cách hoạt động
- **Frontend**: Vite + React (thư mục `src/`).
- **Backend**: Vercel Functions trong `api/`
  - `GET  /api/tournament-state`  – ai cũng đọc được dữ liệu giải đấu
  - `POST /api/admin/login`       – kiểm tra mật khẩu (biến môi trường `ADMIN_PASSWORD`), trả token 24 giờ
  - `POST /api/admin/save-state`  – chỉ admin có token mới ghi được
- **Lưu trữ**: Upstash Redis (gắn qua Vercel Storage). Mọi người xem đều đọc cùng một nguồn dữ liệu.
- Các máy tự cập nhật mỗi 5 giây (và ngay khi mở lại tab).

## Biến môi trường (Vercel)
| Tên | Ghi chú |
|---|---|
| `ADMIN_PASSWORD` | Bạn tự đặt. Bắt buộc. |
| `KV_REST_API_URL`, `KV_REST_API_TOKEN` | Vercel tự thêm khi kết nối Upstash Redis. |

## Hướng dẫn deploy Vercel chi tiết
Xem file **[HUONG_DAN_VERCEL.md](./HUONG_DAN_VERCEL.md)**. Mở `/api/health` trên link Vercel để biết thiếu cấu hình gì.

## Quy tắc ghi nhận bàn thắng
- **Own Goal**: trong Admin → *Thêm Bàn Thắng* → loại **Own Goal**, chọn đội và cầu thủ đã đá phản.
  Own Goal **không tính bàn cho bất kỳ đội nào** (tỉ số giữ nguyên) và **không tính bàn thắng/kiến tạo cho bất kỳ cầu thủ nào**.
  Ngoài trang Trận Đấu chỉ hiện chữ **Own Goal**; chi tiết trận vẫn hiện tên cầu thủ; mục Thống kê vẫn ghi nhận số lần đá phản.
- **Phạt đền**: bàn thắng từ chấm phạt đền không có kiến tạo.
- Cầu thủ ghi bàn không thể là người kiến tạo cho chính bàn thắng đó.

## Chạy thử trên máy
```bash
npm install
npm run dev        # dùng local-server.ts, lưu vào data/tournament_state.json
                   # có giao diện Admin (nút Admin hoặc /#admin); mật khẩu mặc định: a1k41league (hoặc đặt ADMIN_PASSWORD)
```
