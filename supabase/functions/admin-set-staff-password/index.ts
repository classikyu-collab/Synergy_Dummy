import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";

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

    const { teacherId, password } = await req.json();
    if (!teacherId || !password) {
      return Response.json({ error: "teacherId와 password가 필요합니다." }, { status: 400 });
    }
    if (password.length < 6) {
      return Response.json({ error: "비밀번호는 6자 이상이어야 합니다." }, { status: 400 });
    }

    const { data: target, error: targetErr } = await ctx.supabaseAdmin
      .from("teachers")
      .select("auth_user_id, legacy_id")
      .eq("id", teacherId)
      .single();
    if (targetErr || !target?.auth_user_id) {
      return Response.json({ error: "대상 계정을 찾을 수 없습니다." }, { status: 404 });
    }

    const { error: pwErr } = await ctx.supabaseAdmin.auth.admin.updateUserById(target.auth_user_id, {
      password,
    });
    if (pwErr) {
      return Response.json({ error: "비밀번호 변경 실패: " + pwErr.message }, { status: 500 });
    }

    return Response.json({ ok: true, legacy_id: target.legacy_id });
  }),
};
