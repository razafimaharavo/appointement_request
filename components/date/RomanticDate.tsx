"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Heart, ArrowLeft } from "lucide-react";
import {
  responseSchema,
  type DateResponse,
  type DateInvitation,
} from "@/lib/invitation";
import PageFlip from "./PageFlip";
import FloatingHearts from "./FloatingHearts";
import MusicController from "./MusicController";
import ProgressHearts from "./ProgressHearts";
import StepOne from "./StepOne";
import StepTwo from "./StepTwo";
import StepThree from "./StepThree";
import StepFour from "./StepFour";
import StepFive from "./StepFive";
const STORAGE = "juste-nous-deux-v1";
type Saved = {
  step: number;
  invitation: DateInvitation;
  id: string;
  sent: boolean;
  timezoneOffset: number;
};
const initial: Saved = {
  step: 0,
  invitation: { accepted: false, date: "", time: "", food: "" },
  id: "",
  sent: false,
  timezoneOffset: 0,
};
type Recipient = {
  token: string;
  id: string;
  firstName: string;
  status: "pending" | "accepted" | "declined" | "completed";
  response: DateResponse | null;
  emailSent: boolean;
};
export default function RomanticDate({ recipient }: { recipient?: Recipient }) {
  const storageKey = recipient ? `${STORAGE}:${recipient.token}` : STORAGE;
  const [actionError, setActionError] = useState("");
  const [declineEmail, setDeclineEmail] = useState("");
  const [data, setData] = useState<Saved>(initial);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [declined, setDeclined] = useState(false);
  const [celebrate, setCelebrate] = useState(false);
  const [status, setStatus] = useState<"sending" | "sent" | "error">("sending");
  const [retryCount, setRetryCount] = useState(0);
  const locked = useRef(false);
  const request = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Restore browser-only storage after hydration; one intentional initial state update.
  useEffect(() => {
    let saved: Saved = { ...initial, id: crypto.randomUUID() };
    try {
      const raw = sessionStorage.getItem(storageKey);
      if (raw) {
        const v = JSON.parse(raw);
        const inv = v.invitation;
        const valid =
          inv &&
          typeof inv.accepted === "boolean" &&
          typeof inv.date === "string" &&
          typeof inv.time === "string" &&
          typeof inv.food === "string" &&
          (inv.otherFood === undefined || typeof inv.otherFood === "string");
        if (
          valid &&
          Number.isInteger(v.step) &&
          v.step >= 0 &&
          v.step <= 4 &&
          typeof v.sent === "boolean" &&
          /^[a-f0-9-]{36}$/.test(v.id) &&
          (v.step < 4 ||
            responseSchema.safeParse({
              ...inv,
              id: v.id,
              timezoneOffset: v.timezoneOffset,
            }).success)
        )
          saved = v;
      }
    } catch {}
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Synchronize with browser storage after hydration.
    setData(
      recipient
        ? {
            ...saved,
            id: recipient.id,
            sent: recipient.emailSent,
            ...(recipient.status === "completed" && recipient.response
              ? {
                  step: 4,
                  invitation: recipient.response,
                  timezoneOffset: recipient.response.timezoneOffset,
                }
              : {}),
            ...(recipient.status === "accepted" && saved.step === 0
              ? { step: 1, invitation: { ...saved.invitation, accepted: true } }
              : {}),
          }
        : saved,
    );
    setDeclined(recipient?.status === "declined");
    setReady(true);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [recipient, storageKey]);
  useEffect(() => {
    if (ready)
      try {
        sessionStorage.setItem(storageKey, JSON.stringify(data));
      } catch {}
  }, [data, ready, storageKey]);
  useEffect(() => {
    if (!ready || data.step !== 4 || request.current) return;
    if (data.sent) return;
    request.current = true;
    fetch(
      recipient
        ? `/api/invitations/${recipient.token}`
        : "/api/send-date-response",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          recipient
            ? {
                action: "complete",
                response: {
                  ...data.invitation,
                  id: data.id,
                  timezoneOffset: data.timezoneOffset,
                },
              }
            : {
                ...data.invitation,
                id: data.id,
                timezoneOffset: data.timezoneOffset,
              },
        ),
      },
    )
      .then(async (res) => {
        const result = await res.json();
        if (!res.ok || (recipient && result.email !== "sent"))
          throw new Error("send");
        setData((v) => ({ ...v, sent: true }));
        setStatus("sent");
      })
      .catch(() => setStatus("error"))
      .finally(() => {
        request.current = false;
      });
  }, [
    ready,
    data.step,
    data.sent,
    data.id,
    data.invitation,
    data.timezoneOffset,
    retryCount,
    recipient,
  ]);
  const turning = useCallback((value: boolean) => {
    setBusy(value);
    locked.current = value;
  }, []);
  function advance(changes: Partial<DateInvitation> = {}) {
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    if (data.step === 0) setCelebrate(true);
    timer.current = setTimeout(
      () => {
        setData((v) => ({
          ...v,
          step: v.step + 1,
          invitation: { ...v.invitation, ...changes },
          timezoneOffset:
            changes.date && changes.time
              ? new Date(`${changes.date}T${changes.time}`).getTimezoneOffset()
              : v.timezoneOffset,
        }));
        if (data.step === 3) setCelebrate(true);
        else setCelebrate(false);
      },
      data.step === 0 ? 650 : 150,
    );
  }
  async function answer(accepted: boolean) {
    if (!recipient) {
      if (accepted) advance({ accepted: true });
      else setDeclined(true);
      return;
    }
    if (locked.current) return;
    locked.current = true;
    setBusy(true);
    setActionError("");
    try {
      const res = await fetch(`/api/invitations/${recipient.token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: accepted ? "accept" : "decline" }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Réponse non enregistrée.");
      locked.current = false;
      setBusy(false);
      if (accepted) advance({ accepted: true });
      else {
        setDeclined(true);
        setDeclineEmail(
          result.email === "sent"
            ? "Ta réponse a bien été transmise."
            : "Ta réponse est enregistrée. La notification reste en attente d’envoi.",
        );
      }
    } catch (error) {
      locked.current = false;
      setBusy(false);
      setActionError(
        error instanceof Error
          ? error.message
          : "Connexion impossible. Réessaie.",
      );
    }
  }
  const steps = [
    <StepOne
      key="one"
      firstName={recipient?.firstName}
      onYes={() => void answer(true)}
      onNo={() => void answer(false)}
      busy={busy}
    />,
    <StepTwo key="two" next={() => advance()} busy={busy} />,
    <StepThree
      key="three"
      value={data.invitation}
      next={(date, time) => advance({ date, time })}
      busy={busy}
    />,
    <StepFour
      key="four"
      value={data.invitation}
      next={(food, otherFood) => advance({ food, otherFood })}
      busy={busy}
    />,
    data.step === 4 ? (
      <StepFive
        key="five"
        firstName={recipient?.firstName}
        value={data.invitation}
        status={data.sent ? "sent" : status}
        retry={() => {
          setStatus("sending");
          setRetryCount((v) => v + 1);
        }}
      />
    ) : null,
  ];
  return (
    <main className="romantic-world">
      <FloatingHearts celebrate={celebrate} />
      <header className="site-header">
        <Link
          href={recipient ? `/invitation/${recipient.token}` : "/"}
          className="brand"
        >
          <Heart size={22} strokeWidth={1.3} />
          <span>
            juste nous deux<span className="brand-dot">.</span>
          </span>
        </Link>
        <MusicController />
      </header>
      <section className="invitation-scene" aria-label="Ton invitation">
        <div className="invitation-overline">
          <span /> UNE INVITATION À ÉCRIRE ENSEMBLE <span />
        </div>
        <div className="book-wrap">
          <div className="ribbon" aria-hidden="true" />
          <PageFlip pageKey={data.step} onTurning={turning}>
            <div
              className={`book-content ${busy ? "is-busy" : ""}`}
              inert={busy || !ready}
            >
              <div className="page-top">
                <span>NOTRE PETITE HISTOIRE</span>
                <span>CHAPITRE {String(data.step + 1).padStart(2, "0")}</span>
              </div>
              {declined ? (
                <div className="step declined">
                  <div className="step-icon">♡</div>
                  <h1>
                    Merci pour
                    <br />
                    ta <em>sincérité.</em>
                  </h1>
                  <p>
                    Aucun souci, je respecte ton choix.
                    <br />
                    Prends soin de toi. 🌷
                  </p>
                  {declineEmail && <p role="status">{declineEmail}</p>}
                  <button
                    className="secondary"
                    onClick={() => setDeclined(false)}
                  >
                    <ArrowLeft size={15} /> Revenir à l’invitation
                  </button>
                </div>
              ) : (
                steps[data.step]
              )}
              {actionError && (
                <p className="form-error" role="alert">
                  {actionError}
                </p>
              )}
              <div className="page-bottom">
                <span>avec un peu de courage & beaucoup de cœur</span>
                <span>{String(data.step + 1).padStart(2, "0")}</span>
              </div>
            </div>
          </PageFlip>
        </div>
        <ProgressHearts step={data.step} />
        <div className="chapter-caption">
          {declined
            ? "Sans pression, toujours."
            : `Une question à la fois. Un sourire à chaque page.`}
        </div>
      </section>
      <footer className="site-footer">
        <span>FAIT AVEC LE CŒUR</span>
        <Heart size={12} />
        <span>ET UNE PENSÉE POUR TOI</span>
      </footer>
    </main>
  );
}
