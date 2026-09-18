import "@supabase/functions-js/edge-runtime.d.ts";
import { withSupabase } from "@supabase/server";
import webpush from "web-push";

const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
// Apple의 web.push.apple.com은 VAPID sub(subject) 클레임이 실제로 존재하는(외부에서 확인 가능한)
// 도메인/메일이어야 하며, .internal 같은 예약 TLD는 "BadJwtToken" 403으로 거부한다.
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") ?? "https://synergy-coaching.pages.dev";

webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

export default {
  fetch: withSupabase({ auth: "user" }, async (req, ctx) => {
    const callerId = ctx.userClaims?.id;
    if (!callerId) {
      return Response.json({ error: "인증 정보가 없습니다." }, { status: 401 });
    }

    const { data: caller, error: callerErr } = await ctx.supabase
      .from("teachers")
      .select("role")
      .eq("auth_user_id", callerId)
      .single();
    if (callerErr || caller?.role !== "admin") {
      return Response.json({ error: "관리자 권한이 없습니다." }, { status: 403 });
    }

    const { announcementId } = await req.json();
    if (!announcementId) {
      return Response.json({ error: "announcementId가 필요합니다." }, { status: 400 });
    }

    const { data: ann, error: annErr } = await ctx.supabaseAdmin
      .from("student_announcements")
      .select("id, title, content, audience_type, class_id, notify_student, notify_parent")
      .eq("id", announcementId)
      .single();
    if (annErr || !ann) {
      return Response.json({ error: "공지사항을 찾을 수 없습니다." }, { status: 404 });
    }

    const subjectTypes: string[] = [];
    if (ann.notify_student) subjectTypes.push("student");
    if (ann.notify_parent) subjectTypes.push("parent");
    if (subjectTypes.length === 0) {
      return Response.json({ ok: true, sent: 0, total: 0 });
    }

    let studentIds: string[];
    if (ann.audience_type === "전체") {
      const { data } = await ctx.supabaseAdmin.from("students").select("id").eq("status", "재원");
      studentIds = (data ?? []).map((s) => s.id);
    } else if (ann.audience_type === "반") {
      const { data } = await ctx.supabaseAdmin
        .from("students")
        .select("id")
        .eq("class_id", ann.class_id)
        .eq("status", "재원");
      studentIds = (data ?? []).map((s) => s.id);
    } else {
      const { data } = await ctx.supabaseAdmin
        .from("student_announcement_targets")
        .select("student_id")
        .eq("announcement_id", ann.id);
      studentIds = (data ?? []).map((r) => r.student_id);
    }

    if (studentIds.length === 0) {
      return Response.json({ ok: true, sent: 0, total: 0 });
    }

    const { data: subs } = await ctx.supabaseAdmin
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("subject_id", studentIds)
      .in("subject_type", subjectTypes);

    const payload = JSON.stringify({
      title: ann.title,
      body: ann.content.length > 80 ? ann.content.slice(0, 80) + "…" : ann.content,
      url: "/",
    });

    let sent = 0;
    const staleIds: string[] = [];
    await Promise.all(
      (subs ?? []).map(async (sub) => {
        try {
          await webpush.sendNotification(
            { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
            payload,
          );
          sent++;
        } catch (err) {
          const statusCode = (err as { statusCode?: number })?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            staleIds.push(sub.id);
          }
        }
      }),
    );

    if (staleIds.length > 0) {
      await ctx.supabaseAdmin.from("push_subscriptions").delete().in("id", staleIds);
    }

    await ctx.supabaseAdmin.from("student_announcements").update({ last_pushed_at: new Date().toISOString() }).eq("id", ann.id);

    return Response.json({ ok: true, sent, total: (subs ?? []).length });
  }),
};
