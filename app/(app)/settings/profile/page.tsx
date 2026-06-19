import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth/session";
import { Card } from "@/components/dashboard/Cards";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutoSaveForm } from "@/components/settings/AutoSaveForm";
import { AvatarUploader } from "@/components/settings/AvatarUploader";

async function save(formData: FormData) {
  "use server";
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  await supabase.from("profiles").update({
    first_name: String(formData.get("first_name") ?? ""),
    last_name: String(formData.get("last_name") ?? ""),
    preferred_name: String(formData.get("preferred_name") ?? "") || null,
    date_of_birth: String(formData.get("date_of_birth") ?? "") || null,
    gender: String(formData.get("gender") ?? "") || null,
    pronouns: String(formData.get("pronouns") ?? "") || null,
    personal_phone: String(formData.get("personal_phone") ?? "") || null,
  }).eq("id", user.id);
  revalidatePath("/settings/profile");
  revalidatePath("/dashboard");
}

async function saveAvatar(url: string) {
  "use server";
  const user = await requireUser();
  const supabase = await createSupabaseServerClient();
  await supabase.from("profiles").update({
    avatar_url: url,
  }).eq("id", user.id);
  revalidatePath("/settings/profile");
  revalidatePath("/dashboard");
}

export default async function ProfileSettings() {
  const user = await requireUser();
  const p = user.profile;

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      <h1 className="text-2xl font-semibold">Profile</h1>
      <Card className="flex flex-col md:flex-row gap-6 p-6">
        <div className="flex shrink-0 items-center justify-center md:border-r md:border-border md:pr-6 pb-6 md:pb-0">
          <AvatarUploader userId={user.id} initialUrl={(p as any)?.avatar_url ?? null} onUploadComplete={saveAvatar} />
        </div>
        <div className="flex-1">
          <AutoSaveForm action={save} className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><Label>First name</Label><Input name="first_name" defaultValue={p?.first_name ?? ""} /></div>
            <div><Label>Last name</Label><Input name="last_name" defaultValue={p?.last_name ?? ""} /></div>
            <div><Label>Preferred name</Label><Input name="preferred_name" defaultValue={p?.preferred_name ?? ""} /></div>
            <div><Label>DOB</Label><Input name="date_of_birth" type="date" defaultValue={p?.date_of_birth ?? ""} /></div>
            <div><Label>Gender</Label><Input name="gender" defaultValue={p?.gender ?? ""} /></div>
            <div><Label>Pronouns</Label><Input name="pronouns" defaultValue={p?.pronouns ?? ""} /></div>
            <div className="md:col-span-2"><Label>Personal phone</Label><Input name="personal_phone" defaultValue={p?.personal_phone ?? ""} /></div>
          </AutoSaveForm>
        </div>
      </Card>
    </div>
  );
}
