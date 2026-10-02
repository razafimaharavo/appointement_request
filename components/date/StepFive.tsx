"use client";
import { motion, useReducedMotion } from "framer-motion";
import { formatDate, type DateInvitation } from "@/lib/invitation";
export default function StepFive({
  value,
  status,
  retry,
}: {
  value: DateInvitation;
  status: "sending" | "sent" | "error";
  retry: () => void;
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className="step final-step"
      initial="hidden"
      animate="visible"
      variants={{
        visible: { transition: { staggerChildren: reduced ? 0 : 0.3 } },
      }}
    >
      {[
        <span className="eyebrow" key="eyebrow">
          LE DÉBUT D’UN JOLI SOUVENIR
        </span>,
        <div className="final-seal" key="heart">
          ♥
        </div>,
        <h1 key="title">
          Alors c’est <em>décidé…</em> 💕
        </h1>,
        <p key="yes">Je suis vraiment content que tu aies dit oui.</p>,
        <div className="appointment" key="date">
          <span>Je passerai te chercher 🚗💗</span>
          <strong>{formatDate(value.date)}</strong>
          <span className="appointment-time">
            à {value.time.replace(":", "h")}
          </span>
          <div className="appointment-food">
            Et j’ai bien retenu :<br />
            <b>{value.food === "Autre" ? value.otherFood : value.food}</b> 😌
          </div>
        </div>,
        <p key="rest">
          Pour le reste…
          <br />
          <em>laisse-moi m’en occuper.</em> ✨
        </p>,
        <div className="signature" key="signature">
          J’ai déjà hâte de te voir. ❤️
        </div>,
      ].map((child, i) => (
        <motion.div
          className="reveal"
          key={i}
          variants={{
            hidden: { opacity: 0, y: reduced ? 0 : 12 },
            visible: { opacity: 1, y: 0 },
          }}
        >
          {child}
        </motion.div>
      ))}
      <div className="send-status" role="status">
        {status === "sending" ? (
          "Ton petit mot est en chemin…"
        ) : status === "sent" ? (
          "Ton petit mot est bien arrivé ♡"
        ) : (
          <>
            Tes choix sont enregistrés ici. Le petit mot n’a pas pu partir.
            <button className="text-button" onClick={retry}>
              Réessayer l’envoi
            </button>
          </>
        )}
      </div>
    </motion.div>
  );
}
