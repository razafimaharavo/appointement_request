import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authenticated, SESSION_COOKIE } from "@/lib/admin/auth";
import InvitationManager from "@/components/admin/InvitationManager";
export const dynamic = "force-dynamic";
export default async function AdminInvitations() {
  if (!authenticated((await cookies()).get(SESSION_COOKIE)?.value))
    redirect("/admin/login");
  return <InvitationManager />;
}
