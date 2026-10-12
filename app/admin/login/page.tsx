import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authenticated, configured, SESSION_COOKIE } from "@/lib/admin/auth";
import LoginForm from "@/components/admin/LoginForm";
export const dynamic = "force-dynamic";
export default async function LoginPage() {
  if (authenticated((await cookies()).get(SESSION_COOKIE)?.value))
    redirect("/admin/invitations");
  return (
    <section className="admin-card admin-login">
      <span className="eyebrow">TON ESPACE PRIVÉ</span>
      <h1>
        Les petites <em>attentions.</em>
      </h1>
      <p>Un prénom, une invitation, une histoire à écrire.</p>
      {configured() ? (
        <LoginForm />
      ) : (
        <p role="status">
          L’accès privé n’est pas encore configuré. Ajoute ADMIN_PASSWORD_HASH
          dans les variables du serveur.
        </p>
      )}
    </section>
  );
}
