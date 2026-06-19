import { type NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireActiveWorkspace, requireUser } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";

export async function POST(request: NextRequest) {
  try {
    const user = await requireUser();
    const active = await requireActiveWorkspace();
    const supabase = await createSupabaseServerClient();

    const body = await request.json() as {
      title: string;
      description?: string | null;
      priority?: string;
      due_date?: string | null;
    };

    if (!body.title?.trim()) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const { data: task, error } = await supabase
      .from("tasks")
      .insert({
        workspace_id: active.workspace.id,
        title: body.title.trim(),
        description: body.description ?? null,
        priority: (["low","normal","high","urgent"].includes(body.priority ?? "") ? body.priority : "normal") as "low" | "normal" | "high" | "urgent",
        due_date: body.due_date ?? null,
        status: "pending",
        created_by: user.id,
      })
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    revalidatePath("/tasks");
    revalidatePath("/dashboard");

    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
