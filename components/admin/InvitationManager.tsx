"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { InvitationRow } from "@/lib/managed-invitations";
import type { DateResponse } from "@/lib/invitation";
import { formatDate } from "@/lib/invitation";
type Row = InvitationRow & {
  notifications: { id: string; kind: string; state: string }[];
};
const labels = {
  pending: "En attente",
  accepted: "Acceptée",
  declined: "Refusée",
  completed: "Terminée",
};
async function api(url: string, body?: unknown) {
  const response = await fetch(
    url,
    body
      ? {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      : { cache: "no-store" },
  );
  if (response.status === 401) {
    throw new Error("Session expirée.");
  }
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Action impossible.");
  return data;
}
export default function InvitationManager() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [newLink, setNewLink] = useState("");
  const refresh = useCallback(async () => {
    try {
      const data = await api("/api/admin/invitations");
      setRows(data.invitations);
      setLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Chargement impossible.");
    }
  }, []);
  useEffect(() => {
    api("/api/admin/invitations")
      .then((data) => {
        setRows(data.invitations);
        setLoaded(true);
      })
      .catch((e) =>
        setError(e instanceof Error ? e.message : "Chargement impossible."),
      );
  }, [refresh]);
  async function action(id: string, action: "revoke" | "retry") {
    if (
      action === "revoke" &&
      !window.confirm("Révoquer ce lien ? Il ne permettra plus de répondre.")
    )
      return;
    setBusy(true);
    setError("");
    try {
      await api(`/api/admin/invitations/${id}`, { action });
      await refresh();
      setMessage(
        action === "revoke"
          ? "Lien révoqué."
          : "État des notifications actualisé.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Action impossible.");
    } finally {
      setBusy(false);
    }
  }
  function link(token: string) {
    return `${window.location.origin}/invitation/${token}`;
  }
  async function copy(url: string) {
    try {
      await navigator.clipboard.writeText(url);
      setMessage("Lien copié 💌");
    } catch {
      setNewLink(url);
      setMessage("Sélectionne et copie le lien ci-dessous.");
    }
  }
  return (
    <>
      <header className="admin-heading">
        <div>
          <span className="eyebrow">UNE ATTENTION RIEN QUE POUR ELLE</span>
          <h1>
            Mes <em>invitations.</em>
          </h1>
          <p>Quelques mots, un lien privé, un joli début.</p>
        </div>
        <button
          className="secondary"
          onClick={async () => {
            try {
              await api("/api/admin/logout", {});
              router.replace("/admin/login");
              router.refresh();
            } catch {
              setError("Déconnexion impossible, réessaie.");
            }
          }}
        >
          Se déconnecter
        </button>
      </header>
      <section className="admin-card">
        <form
          className="admin-create"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            try {
              const data = await api("/api/admin/invitations", {
                firstName: name,
              });
              setNewLink(link(data.invitation.token));
              setName("");
              setMessage("Une invitation toute particulière est prête 💌");
              await refresh();
            } catch (e) {
              setError(e instanceof Error ? e.message : "Création impossible.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Son prénom
            <input
              required
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sarah"
              autoComplete="off"
            />
          </label>
          <button className="primary" disabled={busy || !name.trim()}>
            Créer une invitation 💌
          </button>
        </form>
        {newLink && (
          <div className="admin-new-link">
            <label>
              Le lien à lui envoyer
              <input
                aria-label="Lien de la nouvelle invitation"
                readOnly
                value={newLink}
                onFocus={(e) => e.target.select()}
              />
            </label>
            <button className="secondary" onClick={() => copy(newLink)}>
              Copier le lien
            </button>
          </div>
        )}
      </section>
      <div aria-live="polite" className="admin-feedback">
        {message}
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error} <Link href="/admin/login">Se reconnecter</Link>
        </p>
      )}
      <div className="admin-list-heading">
        <h2>Les invitations envoyées ou à partager</h2>
        <button className="text-button" onClick={() => refresh()}>
          Actualiser
        </button>
      </div>
      {!loaded && !error && <p>Chargement des invitations…</p>}
      {loaded && rows.length === 0 && (
        <div className="admin-card admin-empty">
          Tout commence par un prénom. Ta première invitation t’attend. ♡
        </div>
      )}
      <div className="admin-invitations">
        {rows.map((row) => {
          const answer: DateResponse | null = row.response_json
            ? JSON.parse(row.response_json)
            : null;
          return (
            <article className="admin-card" key={row.id}>
              <div className="admin-row-title">
                <h2>{row.first_name}</h2>
                <span className={`admin-badge ${row.status}`}>
                  {labels[row.status]}
                </span>
                {row.revoked_at && (
                  <span className="admin-badge revoked">Lien révoqué</span>
                )}
              </div>
              <p>Créée le {new Date(row.created_at).toLocaleString("fr-FR")}</p>
              {answer && (
                <div className="admin-answer">
                  {formatDate(answer.date)} à {answer.time.replace(":", "h")}
                  <br />
                  {answer.food === "Autre" ? answer.otherFood : answer.food}
                </div>
              )}
              {row.notifications.map((n) => (
                <p className="admin-email" key={n.id}>
                  {n.kind === "declined"
                    ? "Notification de refus"
                    : "Confirmation du rendez-vous"}{" "}
                  :{" "}
                  {n.state === "sent"
                    ? "envoyée ✓"
                    : n.state === "uncertain"
                      ? "à vérifier dans Resend avant toute relance"
                      : n.state === "sending"
                        ? "en cours"
                        : "en attente d’envoi"}
                </p>
              ))}
              <div className="admin-actions">
                <button
                  className="secondary"
                  disabled={!!row.revoked_at}
                  onClick={() => copy(link(row.token))}
                >
                  Copier le lien
                </button>
                <button
                  className="secondary"
                  disabled={!!row.revoked_at}
                  onClick={async () => {
                    const url = link(row.token);
                    if (navigator.share) {
                      try {
                        await navigator.share({
                          title: "Une petite invitation pour toi 💕",
                          url,
                        });
                      } catch (e) {
                        if (!(e instanceof Error && e.name === "AbortError"))
                          await copy(url);
                      }
                    } else await copy(url);
                  }}
                >
                  Partager
                </button>
                <button
                  className="text-button"
                  disabled={busy || !!row.revoked_at}
                  onClick={() => action(row.id, "revoke")}
                >
                  Révoquer
                </button>
                {row.notifications.some(
                  (n) => n.state === "pending" || n.state === "sending",
                ) && (
                  <button
                    className="text-button"
                    disabled={busy}
                    onClick={() => action(row.id, "retry")}
                  >
                    Réessayer l’email
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
