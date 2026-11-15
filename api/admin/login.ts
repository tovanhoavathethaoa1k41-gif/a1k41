/**
 * POST /api/admin/login   body: { password }
 * Kiểm tra mật khẩu ở PHÍA SERVER (biến môi trường ADMIN_PASSWORD) và trả về token có chữ ký, hết hạn sau 24 giờ.
 * Mật khẩu không còn nằm trong code frontend nên không ai xem trộm được.
 *
 * File này cố ý độc lập (không import file khác trong /api) — xem ghi chú ở tournament-state.ts.
 */
import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

function safeEqual(a: string, b: string) {
  const ha = createHash('sha256').update(a).digest();
  const hb = createHash('sha256').update(b).digest();
  return timingSafeEqual(ha, hb);
}

function signToken(secret: string) {
  const exp = Date.now() + TOKEN_TTL_MS;
  const sig = createHmac('sha256', secret).update(`admin:${exp}`).digest('hex');
  return `${exp}.${sig}`;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    if (request.method !== 'POST') {
      return jsonResponse({ success: false, error: 'Method not allowed' }, 405);
    }

    const adminPassword = process.env.ADMIN_PASSWORD;
    if (!adminPassword) {
      return jsonResponse(
        { success: false, error: 'Server chưa được cấu hình ADMIN_PASSWORD (xem hướng dẫn deploy).' },
        500
      );
    }

    const body: any = await request.json().catch(() => ({}));
    const password = typeof body?.password === 'string' ? body.password.trim() : '';

    if (!password || !safeEqual(password, adminPassword.trim())) {
      // Làm chậm một chút để gây khó cho việc dò mật khẩu hàng loạt
      await new Promise(resolve => setTimeout(resolve, 600));
      return jsonResponse({ success: false, error: 'Mật khẩu quản trị viên không chính xác.' }, 401);
    }

    return jsonResponse({
      success: true,
      token: signToken(adminPassword.trim()),
      message: 'Đăng nhập Quản trị viên thành công!'
    });
  }
};
