import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

const INITIAL_PASSWORD = "123456"; // admin-reset-password와 동일 정책 (Auth 최소 6자)
const STAFF_EMAIL_DOMAIN = "@synergy.internal";
const VALID_ROLES = ["coach", "homeroom_teacher", "admin"];

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    const callerId = ctx.userClaims?.id;
    if (!callerId) {
      return Response.json({ error: "인증 정보가 없습니다." }, { status: 401 });
    }

    const { data: caller, error: callerErr } = await ctx.supabase
      .from("teachers")
      .select("role, is_master")
      .eq("auth_user_id", callerId)
      .single();

    if (callerErr || !(caller?.role === "admin" || caller?.is_master)) {
      return Response.json({ error: "관리자 권한이 없습니다." }, { status: 403 });
    }

    const { legacyId, name, role } = await req.json();
    if (!legacyId || !name || !role) {
      return Response.json({ error: "legacyId, name, role이 모두 필요합니다." }, { status: 400 });
    }
    if (!VALID_ROLES.includes(role)) {
      return Response.json({ error: "role 값이 올바르지 않습니다." }, { status: 400 });
    }

    const email = `${legacyId}${STAFF_EMAIL_DOMAIN}`;

    const { data: created, error: createErr } = await ctx.supabaseAdmin.auth.admin.createUser({
      email,
      password: INITIAL_PASSWORD,
      email_confirm: true,
    });
    if (createErr || !created?.user) {
      return Response.json({ error: "계정 생성 실패: " + (createErr?.message ?? "unknown") }, { status: 500 });
    }

    const { data: teacher, error: insertErr } = await ctx.supabaseAdmin
      .from("teachers")
      .insert({
        legacy_id: legacyId,
        name,
        role,
        status: "재직",
        auth_user_id: created.user.id,
        must_change_password: true,
      })
      .select("id, legacy_id, name, role, status, is_master, must_change_password")
      .single();

    if (insertErr) {
      // 직원 row 생성 실패 시 고아 auth 계정 정리
      await ctx.supabaseAdmin.auth.admin.deleteUser(created.user.id);
      return Response.json({ error: "직원 정보 저장 실패: " + insertErr.message }, { status: 500 });
    }

    return Response.json({ ok: true, teacher });
  }),
};
