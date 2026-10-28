import { ImageResponse } from "next/og";
import { getInvitation } from "@/lib/managed-invitations";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function InvitationOpenGraphImage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invitation = getInvitation(token);
  const firstName =
    invitation && !invitation.revoked_at ? invitation.first_name : "toi";

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        alignItems: "center",
        justifyContent: "center",
        background: "#fff6f4",
        color: "#573843",
        fontFamily: "Georgia, serif",
      }}
    >
      <div
        style={{
          display: "flex",
          width: 820,
          minHeight: 390,
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid #edc9d3",
          borderRadius: 28,
          background: "#fffdf9",
          boxShadow: "0 18px 60px rgba(136, 76, 99, 0.13)",
        }}
      >
        <div style={{ display: "flex", fontSize: 100, lineHeight: 1 }}>💌</div>
        <div
          style={{
            display: "flex",
            marginTop: 25,
            fontSize: 30,
            color: "#bd6680",
          }}
        >
          JUSTE NOUS DEUX
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 18,
            fontSize: 62,
            color: "#9f4b68",
          }}
        >
          Pour {firstName}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 20,
            fontSize: 28,
            color: "#795560",
          }}
        >
          Une petite invitation t’attend
        </div>
      </div>
    </div>,
    size,
  );
}
