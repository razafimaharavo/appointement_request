import RomanticDate from "@/components/date/RomanticDate";
import { getInvitation, notificationList } from "@/lib/managed-invitations";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata = {
  title: "Une invitation pour toi · Juste nous deux",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default async function InvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = getInvitation(token);
  if (!invitation || invitation.revoked_at)
    return (
      <main className="romantic-world">
        <section className="invitation-scene">
          <div className="book-content">
            <div className="step">
              <span className="eyebrow">JUSTE NOUS DEUX</span>
              <h1>
                Cette invitation
                <br />
                n’est plus <em>disponible.</em>
              </h1>
              <p>
                Le lien est invalide ou a été révoqué.
                <br />
                Demande un nouveau lien à la personne qui te l’a envoyé. 🌷
              </p>
            </div>
          </div>
        </section>
      </main>
    );
  const notification = notificationList(invitation.id).find(
    (v) => v.kind === invitation.status,
  );
  return (
    <RomanticDate
      recipient={{
        token,
        id: invitation.id,
        firstName: invitation.first_name,
        status: invitation.status,
        response: invitation.response_json
          ? JSON.parse(invitation.response_json)
          : null,
        emailSent: notification?.state === "sent",
      }}
    />
  );
}
