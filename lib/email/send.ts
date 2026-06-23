import "server-only";
import { mailer, FROM, APP_URL } from "./client";
import {
  invitationEmail,
  taskAssignmentEmail,
  taskCompletionEmail,
  weeklyDigestEmail,
  morningStandupEmail,
  type DigestTask,
} from "./templates";

type SendResult = { ok: boolean; error?: string };

// ─── Invitation ──────────────────────────────────────────────────────────────

export interface SendInvitationEmailOpts {
  to: string;
  workspaceName: string;
  inviterName: string;
  inviteToken: string;
  role: string;
}

export async function sendInvitationEmail(opts: SendInvitationEmailOpts): Promise<SendResult> {
  const inviteUrl = `${APP_URL}/invite/${opts.inviteToken}`;
  try {
    const { subject, html } = invitationEmail({
      workspaceName: opts.workspaceName,
      inviterName: opts.inviterName,
      inviteUrl,
      role: opts.role,
    });
    // Non-blocking fire-and-forget in background
    mailer.sendMail({ from: FROM, to: opts.to, subject, html }).catch((err) => {
      console.error("[email] sendInvitationEmail failed in background:", err);
      console.warn("\n[EMAIL FALLBACK] You can manually copy the link: \n" + inviteUrl + "\n");
    });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email] sendInvitationEmail templates failed:", msg);
    return { ok: false, error: msg };
  }
}


// ─── Task Assignment ─────────────────────────────────────────────────────────

export interface SendTaskAssignmentEmailOpts {
  to: string;
  taskTitle: string;
  taskId: string;
  assignerName: string;
  workspaceName: string;
  priority: string;
  dueDate?: string | null;
}

export async function sendTaskAssignmentEmail(opts: SendTaskAssignmentEmailOpts): Promise<SendResult> {
  try {
    const taskUrl = `${APP_URL}/tasks/${opts.taskId}`;
    const { subject, html } = taskAssignmentEmail({
      taskTitle: opts.taskTitle,
      assignerName: opts.assignerName,
      workspaceName: opts.workspaceName,
      taskUrl,
      priority: opts.priority,
      dueDate: opts.dueDate,
    });
    // Non-blocking fire-and-forget in background
    mailer.sendMail({ from: FROM, to: opts.to, subject, html }).catch((err) => {
      console.error("[email] sendTaskAssignmentEmail failed in background:", err);
    });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email] sendTaskAssignmentEmail templates failed:", msg);
    return { ok: false, error: msg };
  }
}

// ─── Task Completion ─────────────────────────────────────────────────────────

export interface SendTaskCompletionEmailOpts {
  to: string;
  taskTitle: string;
  completedByName: string;
  workspaceName: string;
}

export async function sendTaskCompletionEmail(opts: SendTaskCompletionEmailOpts): Promise<SendResult> {
  try {
    const { subject, html } = taskCompletionEmail({
      taskTitle: opts.taskTitle,
      completedByName: opts.completedByName,
      workspaceName: opts.workspaceName,
    });
    // Non-blocking fire-and-forget in background
    mailer.sendMail({ from: FROM, to: opts.to, subject, html }).catch((err) => {
      console.error("[email] sendTaskCompletionEmail failed in background:", err);
    });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email] sendTaskCompletionEmail templates failed:", msg);
    return { ok: false, error: msg };
  }
}

// ─── Weekly Digest ───────────────────────────────────────────────────────────

export interface SendWeeklyDigestEmailOpts {
  to: string;
  userName: string;
  workspaceName: string;
  completedCount: number;
  pendingCount: number;
  overdueCount: number;
  topTasks: DigestTask[];
}

export async function sendWeeklyDigestEmail(opts: SendWeeklyDigestEmailOpts): Promise<SendResult> {
  try {
    const { subject, html } = weeklyDigestEmail({
      userName: opts.userName,
      workspaceName: opts.workspaceName,
      completedCount: opts.completedCount,
      pendingCount: opts.pendingCount,
      overdueCount: opts.overdueCount,
      topTasks: opts.topTasks,
    });
    // Non-blocking fire-and-forget in background
    mailer.sendMail({ from: FROM, to: opts.to, subject, html }).catch((err) => {
      console.error("[email] sendWeeklyDigestEmail failed in background:", err);
    });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email] sendWeeklyDigestEmail templates failed:", msg);
    return { ok: false, error: msg };
  }
}

// ─── Morning Standup Summary ──────────────────────────────────────────────────

export interface SendMorningSummaryEmailOpts {
  to: string;
  userName: string;
  workspaceName: string;
  summaryText: string;
}

export async function sendMorningSummaryEmail(opts: SendMorningSummaryEmailOpts): Promise<SendResult> {
  try {
    const { subject, html } = morningStandupEmail({
      userName: opts.userName,
      workspaceName: opts.workspaceName,
      summaryText: opts.summaryText,
    });
    // Non-blocking fire-and-forget in background
    mailer.sendMail({ from: FROM, to: opts.to, subject, html }).catch((err) => {
      console.error("[email] sendMorningSummaryEmail failed in background:", err);
    });
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[email] sendMorningSummaryEmail templates failed:", msg);
    return { ok: false, error: msg };
  }
}
