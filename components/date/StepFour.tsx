"use client";
import { useState } from "react";
import { foods, type DateInvitation } from "@/lib/invitation";
export default function StepFour({
  value,
  next,
  busy,
}: {
  value: DateInvitation;
  next: (food: string, otherFood: string) => void;
  busy: boolean;
}) {
  const [food, setFood] = useState(value.food);
  const [other, setOther] = useState(value.otherFood || "");
  return (
    <div className="step food-step">
      <span className="eyebrow">LE BONHEUR SE PARTAGE AUSSI À TABLE</span>
      <h1>
        De quoi as-tu <em>envie ?</em> 🍽️
      </h1>
      <p>Une envie, un plaisir… à toi de choisir.</p>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (food && (food !== "Autre" || other.trim()))
            next(food, other.trim());
        }}
      >
        <fieldset disabled={busy}>
          <legend className="sr-only">Choisis un plat</legend>
          <div className="food-grid">
            {foods.map(([emoji, name]) => (
              <label
                key={name}
                className={`food-choice ${food === name ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name="food"
                  value={name}
                  checked={food === name}
                  onChange={() => setFood(name)}
                  required
                />
                <span className="food-emoji">{emoji}</span>
                <span>{name}</span>
                <span className="selection-dot" />
              </label>
            ))}
          </div>
          {food === "Autre" && (
            <label className="other-field">
              Dis-moi ce qui te ferait plaisir
              <input
                autoFocus
                required
                maxLength={120}
                value={other}
                onChange={(e) => setOther(e.target.value)}
                placeholder="Un petit resto, ton plat préféré…"
              />
            </label>
          )}
        </fieldset>
        <button
          className="primary"
          disabled={busy || !food || (food === "Autre" && !other.trim())}
        >
          Je choisis ça 💕
        </button>
      </form>
    </div>
  );
}
