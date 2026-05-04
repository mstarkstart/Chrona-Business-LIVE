import Link from "next/link";
import { Card, CardTitle } from "@/components/dashboard/Cards";

export default function SettingsHome() {
  return (
    <div className="p-6 space-y-4 max-w-3xl">
      <h1 className="text-2xl font-semibold">Settings</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Link href="/settings/profile"><Card className="hover:bg-accent transition"><CardTitle>Profile</CardTitle><p className="mt-2 text-sm">Edit personal info.</p></Card></Link>
        <Link href="/settings/business"><Card className="hover:bg-accent transition"><CardTitle>Business</CardTitle><p className="mt-2 text-sm">Edit business info (employer only).</p></Card></Link>
        <Link href="/settings/multi-function-button"><Card className="hover:bg-accent transition"><CardTitle>Multi-function button</CardTitle><p className="mt-2 text-sm">Customise quick actions.</p></Card></Link>
      </div>
    </div>
  );
}
