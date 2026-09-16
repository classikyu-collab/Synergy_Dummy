import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

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

    const { teacherId, legacyId, name, role, status, isMaster } = await req.json();
    if (!teacherId || !legacyId || !name || !role || !status) {
      return Response.json({ error: "필수 항목이 누락되었습니다." }, { status: 400 });
    }
    if (!VALID_ROLES.includes(role)) {
      return Response.json({ error: "role 값이 올바르지 않습니다." }, { status: 400 });
    }

    const { data: target, error: targetErr } = await ctx.supabaseAdmin
      .from("teachers")
      .select("auth_user_id, legacy_id")
      .eq("id", teacherId)
      .single();
    if (targetErr || !target?.auth_user_id) {
      return Response.json({ error: "대상 계정을 찾을 수 없습니다." }, { status: 404 });
    }

    if (legacyId !== target.legacy_id) {
      const { error: emailErr } = await ctx.supabaseAdmin.auth.admin.updateUserById(target.auth_user_id, {
        email: `${legacyId}${STAFF_EMAIL_DOMAIN}`,
      });
      if (emailErr) {
        return Response.json({ error: "로그인 아이디 변경 실패: " + emailErr.message }, { status: 500 });
      }
    }

    const { data: updated, error: updateErr } = await ctx.supabaseAdmin
      .from("teachers")
      .update({ legacy_id: legacyId, name, role, status, is_master: !!isMaster })
      .eq("id", teacherId)
      .select("id, legacy_id, name, role, status, is_master, must_change_password")
      .single();
    if (updateErr) {
      return Response.json({ error: "저장 실패: " + updateErr.message }, { status: 500 });
    }

    return Response.json({ ok: true, teacher: updated });
  }),
};
