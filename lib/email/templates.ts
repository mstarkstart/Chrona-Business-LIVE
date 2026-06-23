import "server-only";

const BRAND = "#6366f1";
const BRAND_DARK = "#4f46e5";

const BASE_STYLE = `
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
  background-color: #f9fafb;
  margin: 0;
  padding: 0;
`.trim();

const CARD_STYLE = `
  max-width: 560px;
  margin: 40px auto;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.06);
  overflow: hidden;
`.trim();

const HEADER_STYLE = `
  background: ${BRAND};
  padding: 28px 40px 24px;
`.trim();

const LOGO_STYLE = `
  color: #111827;
  font-size: 22px;
  font-weight: 800;
  letter-spacing: -0.5px;
  margin: 0;
`.trim();

function emailHeader(title = "Chrona"): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `
    <div style="background:#ffffff;padding:28px 40px;border-bottom:1px solid #f3f4f6;text-align:center;">
      <img src="${appUrl}/chrona-logo.png" alt="Chrona Logo" style="height:36px;width:36px;display:inline-block;vertical-align:middle;margin-right:8px;" />
      <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;font-size:20px;font-weight:800;color:#111827;letter-spacing:-0.5px;vertical-align:middle;display:inline-block;margin-top:2px;">${title}</span>
    </div>
  `.trim();
}

const BODY_STYLE = `
  padding: 36px 40px 28px;
`.trim();

const HEADING_STYLE = `
  font-size: 20px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 16px;
`.trim();

const TEXT_STYLE = `
  font-size: 15px;
  line-height: 1.6;
  color: #374151;
  margin: 0 0 24px;
`.trim();

const BUTTON_STYLE = `
  display: inline-block;
  background: ${BRAND};
  color: #ffffff;
  text-decoration: none;
  font-size: 15px;
  font-weight: 600;
  padding: 12px 28px;
  border-radius: 8px;
  letter-spacing: 0.1px;
`.trim();

const FOOTER_STYLE = `
  padding: 20px 40px 28px;
  border-top: 1px solid #f3f4f6;
  font-size: 12px;
  color: #9ca3af;
  line-height: 1.5;
`.trim();

function priorityBadge(priority: string): string {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    urgent: { color: "#dc2626", bg: "#fef2f2", label: "Urgent" },
    high:   { color: "#ea580c", bg: "#fff7ed", label: "High" },
    normal: { color: "#2563eb", bg: "#eff6ff", label: "Normal" },
    low:    { color: "#6b7280", bg: "#f9fafb", label: "Low" },
  };
  const p = map[priority] ?? map.normal;
  return `<span style="display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600;color:${p.color};background:${p.bg};border:1px solid ${p.color}22;">${p.label}</span>`;
}

// ─── Invitation Email ────────────────────────────────────────────────────────

export interface InvitationEmailOpts {
  workspaceName: string;
  inviterName: string;
  inviteUrl: string;
  role: string;
}

export function invitationEmail(opts: InvitationEmailOpts): { subject: string; html: string } {
  const { workspaceName, inviterName, inviteUrl, role } = opts;
  const subject = `You're invited to join ${workspaceName} on Chrona`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    ${emailHeader("Chrona")}
    <div style="${BODY_STYLE}">
      <h1 style="${HEADING_STYLE}">You've been invited!</h1>
      <p style="${TEXT_STYLE}">
        <strong>${inviterName}</strong> has invited you to join
        <strong>${workspaceName}</strong> as <strong>${role}</strong>.
      </p>
      <p style="margin:0 0 32px;">
        <a href="${inviteUrl}" style="${BUTTON_STYLE}">Accept Invitation</a>
      </p>
      <p style="font-size:13px;color:#6b7280;margin:0;">
        Or copy and paste this link into your browser:<br>
        <span style="color:${BRAND};word-break:break-all;">${inviteUrl}</span>
      </p>
    </div>
    <div style="${FOOTER_STYLE}">
      This invite expires in 14 days. If you didn't expect this invitation, you can safely ignore this email.
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}

// ─── Task Assignment Email ───────────────────────────────────────────────────

export interface TaskAssignmentEmailOpts {
  taskTitle: string;
  assignerName: string;
  workspaceName: string;
  taskUrl: string;
  priority: string;
  dueDate?: string | null;
}

export function taskAssignmentEmail(opts: TaskAssignmentEmailOpts): { subject: string; html: string } {
  const { taskTitle, assignerName, workspaceName, taskUrl, priority, dueDate } = opts;
  const subject = `New task assigned: ${taskTitle}`;

  const dueDateHtml = dueDate
    ? `<p style="font-size:13px;color:#6b7280;margin:0 0 20px;">
        <strong style="color:#374151;">Due:</strong> ${new Date(dueDate).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
      </p>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    ${emailHeader("Chrona")}
    <div style="${BODY_STYLE}">
      <h1 style="${HEADING_STYLE}">You have a new task</h1>
      <p style="font-size:20px;font-weight:600;color:#111827;margin:0 0 12px;">${taskTitle}</p>
      <p style="margin:0 0 16px;">${priorityBadge(priority)}</p>
      ${dueDateHtml}
      <p style="${TEXT_STYLE}">
        Assigned by <strong>${assignerName}</strong> in <strong>${workspaceName}</strong>.
      </p>
      <p style="margin:0 0 32px;">
        <a href="${taskUrl}" style="${BUTTON_STYLE}">View Task</a>
      </p>
    </div>
    <div style="${FOOTER_STYLE}">
      You're receiving this because you were assigned a task in ${workspaceName}.
      To manage your notification preferences, visit your account settings.
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}

// ─── Task Completion Email ───────────────────────────────────────────────────

export interface TaskCompletionEmailOpts {
  taskTitle: string;
  completedByName: string;
  workspaceName: string;
}

export function taskCompletionEmail(opts: TaskCompletionEmailOpts): { subject: string; html: string } {
  const { taskTitle, completedByName, workspaceName } = opts;
  const subject = `✅ Task completed: ${taskTitle}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    ${emailHeader("Chrona")}
    <div style="${BODY_STYLE}">
      <p style="font-size:32px;margin:0 0 16px;">🎉</p>
      <h1 style="${HEADING_STYLE}">Great news!</h1>
      <p style="${TEXT_STYLE}">
        <strong>${completedByName}</strong> just completed a task in
        <strong>${workspaceName}</strong>:
      </p>
      <p style="font-size:18px;font-weight:600;color:#111827;margin:0 0 24px;padding:16px;background:#f0fdf4;border-left:3px solid #22c55e;border-radius:4px;">
        ${taskTitle}
      </p>
      <p style="font-size:14px;color:#6b7280;margin:0;">
        Keep the momentum going — the team is making great progress!
      </p>
    </div>
    <div style="${FOOTER_STYLE}">
      You received this because you're a member of ${workspaceName} on Chrona.
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}

// ─── Weekly Digest Email ─────────────────────────────────────────────────────

export interface DigestTask {
  title: string;
  priority: string;
  dueDate?: string | null;
}

export interface WeeklyDigestEmailOpts {
  userName: string;
  workspaceName: string;
  completedCount: number;
  pendingCount: number;
  overdueCount: number;
  topTasks: DigestTask[];
}

export function weeklyDigestEmail(opts: WeeklyDigestEmailOpts): { subject: string; html: string } {
  const { userName, workspaceName, completedCount, pendingCount, overdueCount, topTasks } = opts;
  const subject = `Your Chrona weekly digest — ${workspaceName}`;

  const statBox = (value: number, label: string, color: string) => `
    <td style="text-align:center;padding:16px 12px;">
      <p style="font-size:32px;font-weight:700;color:${color};margin:0 0 4px;">${value}</p>
      <p style="font-size:12px;color:#6b7280;margin:0;text-transform:uppercase;letter-spacing:0.5px;">${label}</p>
    </td>`;

  const taskRows = topTasks.length > 0
    ? topTasks.map((t) => {
        const due = t.dueDate
          ? `<span style="font-size:12px;color:#6b7280;margin-left:8px;">${new Date(t.dueDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>`
          : "";
        return `<li style="padding:10px 0;border-bottom:1px solid #f3f4f6;list-style:none;">
          <span style="font-size:14px;color:#111827;">${t.title}</span>
          ${priorityBadge(t.priority)}
          ${due}
        </li>`;
      }).join("")
    : `<li style="padding:10px 0;list-style:none;color:#6b7280;font-size:14px;">No priority tasks this week — great job!</li>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    ${emailHeader("Chrona")}
    <div style="${BODY_STYLE}">
      <h1 style="${HEADING_STYLE}">Good Monday, ${userName}!</h1>
      <p style="font-size:14px;color:#6b7280;margin:0 0 28px;">Here's your weekly snapshot for <strong style="color:#374151;">${workspaceName}</strong>.</p>

      <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;background:#f9fafb;border-radius:8px;margin-bottom:28px;">
        <tr>
          ${statBox(completedCount, "Completed", "#16a34a")}
          <td style="width:1px;background:#e5e7eb;padding:0;"></td>
          ${statBox(pendingCount, "Pending", BRAND)}
          <td style="width:1px;background:#e5e7eb;padding:0;"></td>
          ${statBox(overdueCount, "Overdue", "#dc2626")}
        </tr>
      </table>

      <h2 style="font-size:15px;font-weight:600;color:#111827;margin:0 0 12px;">Your top priority tasks</h2>
      <ul style="margin:0 0 28px;padding:0;">
        ${taskRows}
      </ul>

      <p style="margin:0 0 32px;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}" style="${BUTTON_STYLE}">Open Chrona</a>
      </p>
    </div>
    <div style="${FOOTER_STYLE}">
      You're receiving this weekly digest as a member of ${workspaceName}.<br>
      To unsubscribe from digest emails, visit your notification settings in Chrona.
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}

// ─── Morning Standup Summaries ────────────────────────────────────────────────

export interface MorningStandupEmailOpts {
  workspaceName: string;
  userName: string;
  summaryText: string;
}

export function morningStandupEmail(opts: MorningStandupEmailOpts): { subject: string; html: string } {
  const { workspaceName, userName, summaryText } = opts;
  const subject = `☀️ Chrona Nexus Standup Summary — ${workspaceName}`;

  // Convert markdown bullet points to HTML formatting for email compatibility
  const htmlSummary = summaryText
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
        return `<li style="margin-bottom:8px;font-size:14px;color:#374151;">${trimmed.substring(1).trim()}</li>`;
      }
      if (trimmed.startsWith("###")) {
        return `<h3 style="font-size:14px;font-weight:700;color:#111827;margin-top:20px;margin-bottom:8px;text-transform:uppercase;letter-spacing:0.5px;">${trimmed.substring(3).trim()}</h3>`;
      }
      if (trimmed.startsWith("##")) {
        return `<h2 style="font-size:15px;font-weight:700;color:#111827;margin-top:24px;margin-bottom:12px;border-bottom:1px solid #e5e7eb;padding-bottom:6px;">${trimmed.substring(2).trim()}</h2>`;
      }
      return `<p style="font-size:14px;line-height:1.6;color:#374151;margin-bottom:12px;">${trimmed}</p>`;
    })
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${subject}</title></head>
<body style="${BASE_STYLE}">
  <div style="${CARD_STYLE}">
    ${emailHeader("Chrona Nexus")}
    <div style="${BODY_STYLE}">
      <h1 style="${HEADING_STYLE}">Good Morning, ${userName}!</h1>
      <p style="font-size:14px;color:#6b7280;margin:0 0 24px;">Here is your automated Morning Standup Summary for <strong style="color:#374151;">${workspaceName}</strong>, compiled by Chrona Nexus.</p>

      <div style="background:#f9fafb;border-radius:12px;padding:20px;border:1px solid #e5e7eb;margin-bottom:28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
        ${htmlSummary}
      </div>

      <p style="margin:0 0 16px;text-align:center;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/timesheets" style="${BUTTON_STYLE}">Open Chrona Timesheets</a>
      </p>
    </div>
    <div style="${FOOTER_STYLE}">
      You are receiving this summary because you are a Manager, Admin, or Owner of ${workspaceName} on Chrona.<br>
      To configure automated reports, visit Settings.
    </div>
  </div>
</body>
</html>`;

  return { subject, html };
}
