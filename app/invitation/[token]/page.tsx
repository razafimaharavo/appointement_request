import RomanticDate from "@/components/date/RomanticDate";
import { getInvitation, notificationList } from "@/lib/managed-invitations";
import type { Metadata } from "next";
export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ token: string }>;
}): Promise<Metadata> {
  const { token } = await params;
  const invitation = getInvitation(token);
  const firstName =
    invitation && !invitation.revoked_at ? invitation.first_name : null;
  const available = firstName !== null;
  const title = available
    ? `💌 Une invitation pour ${firstName}`
    : "Une invitation privée · Juste nous deux";
  return {
    title,
    description: available
      ? `${firstName}, une petite enveloppe t’attend. 💕`
      : "Une petite invitation privée.",
    robots: { index: false, follow: false },
    referrer: "no-referrer",
    openGraph: available
      ? {
          title,
          description: `${firstName}, une petite enveloppe t’attend. 💕`,
          images: [`/invitation/${token}/opengraph-image`],
        }
      : undefined,
  };
}
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
