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

    const { teacherId } = await req.json();
    if (!teacherId) {
      return Response.json({ error: "teacherId가 필요합니다." }, { status: 400 });
    }
    const { data: target, error: targetErr } = await ctx.supabaseAdmin
      .from("teachers")
      .select("auth_user_id, legacy_id, name")
      .eq("id", teacherId)
      .single();
    if (targetErr || !target) {
      return Response.json({ error: "대상 계정을 찾을 수 없습니다." }, { status: 404 });
    }
    if (target.auth_user_id === callerId) {
      return Response.json({ error: "본인 계정은 삭제할 수 없습니다." }, { status: 400 });
    }

    // 삭제 전에 이 직원이 담임인 반이 있으면 담임 배정을 먼저 해제한다 (FK 제약으로 삭제가 막히는 것을 방지).
    const { data: unassignedClasses, error: unassignErr } = await ctx.supabaseAdmin
      .from("classes")
      .update({ homeroom_teacher_id: null })
      .eq("homeroom_teacher_id", teacherId)
      .select("name");
    if (unassignErr) {
      return Response.json({ error: "담임 배정 해제 실패: " + unassignErr.message }, { status: 500 });
    }

    const { error: deleteErr } = await ctx.supabaseAdmin.from("teachers").delete().eq("id", teacherId);
    if (deleteErr) {
      return Response.json({ error: "삭제 실패: " + deleteErr.message }, { status: 500 });
    }

    if (target.auth_user_id) {
      await ctx.supabaseAdmin.auth.admin.deleteUser(target.auth_user_id);
    }

    return Response.json({
      ok: true,
      name: target.name,
      legacy_id: target.legacy_id,
      unassignedClassNames: (unassignedClasses ?? []).map((c) => c.name),
    });
  }),
};
