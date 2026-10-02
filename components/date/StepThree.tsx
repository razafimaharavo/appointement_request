"use client";
import { useState } from "react";
import { CalendarDays } from "lucide-react";
import { isFuture, localDate, type DateInvitation } from "@/lib/invitation";
export default function StepThree({
  value,
  next,
  busy,
}: {
  value: DateInvitation;
  next: (date: string, time: string) => void;
  busy: boolean;
}) {
  const [date, setDate] = useState(value.date);
  const [time, setTime] = useState(value.time);
  const [error, setError] = useState("");
  return (
    <div className="step">
      <span className="eyebrow">GARDONS UN MOMENT POUR NOUS</span>
      <div className="step-icon">
        <CalendarDays size={36} strokeWidth={1.2} />
      </div>
      <h1>
        Quand es-tu <em>libre ?</em> 💕
      </h1>
      <p>
        Choisis le jour et l’heure.
        <br />
        Je m’occupe de te faire sourire.
      </p>
      <form
        className="date-form"
        onSubmit={(e) => {
          e.preventDefault();
          if (!isFuture(date, time)) {
            setError("Choisis une date et une heure à venir.");
            return;
          }
          setError("");
          next(date, time);
        }}
      >
        <div className="field-row">
          <label>
            Le jour
            <input
              type="date"
              required
              min={localDate()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={busy}
            />
          </label>
          <label>
            L’heure
            <input
              type="time"
              required
              value={time}
              onChange={(e) => setTime(e.target.value)}
              disabled={busy}
            />
          </label>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="primary" disabled={busy}>
          Fixer la date 💗
        </button>
      </form>
      <span className="little-note">
        Un petit rendez-vous à inscrire dans nos souvenirs.
      </span>
    </div>
  );
}
