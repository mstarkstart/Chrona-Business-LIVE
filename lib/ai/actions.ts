"use server";
import "server-only";
import { askAI } from "./client";

export async function draftTaskDescription(title: string): Promise<string> {
  return askAI(
    "You are a professional project manager. Write a clear, actionable task description in 2–3 sentences. Be specific and professional. Do not include the task title in the description.",
    `Title: ${title}`,
  );
}

export async function suggestProjectTasks(
  projectName: string,
  existingTasks: string[],
): Promise<string[]> {
  const raw = await askAI(
    "You are a project manager. Given a project name and existing tasks, suggest 5 logical next tasks. Return ONLY a JSON array of strings, no explanation, no markdown.",
    `Project: ${projectName}\nExisting tasks:\n${existingTasks.slice(0, 10).join("\n")}`,
  );
  try {
    // Strip markdown code fences if the model includes them despite instructions
    const cleaned = raw.replace(/```json\s*/gi, "").replace(/```\s*/gi, "").trim();
    const parsed = JSON.parse(cleaned);
    if (Array.isArray(parsed)) return parsed.map(String);
    return [];
  } catch {
    return [];
  }
}

export async function suggestDueDate(
  title: string,
  priority: string,
  workloadHours: number,
): Promise<string> {
  return askAI(
    "You are a project planner. Suggest a realistic due date given the task details and current team workload. Return ONLY a date in YYYY-MM-DD format, nothing else.",
    `Task: ${title}\nPriority: ${priority}\nCurrent open workload hours this week: ${workloadHours}`,
  );
}

export async function summarizeComments(comments: string[]): Promise<string> {
  return askAI(
    "You are a concise summarizer. Summarize these task comments in 2–3 sentences. Focus on decisions made and blockers. Be direct and professional.",
    `Comments:\n${comments.join("\n---\n")}`,
  );
}
