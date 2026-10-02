export default function ProgressHearts({ step }: { step: number }) {
  return (
    <div
      className="progress-hearts"
      role="img"
      aria-label={`Étape ${step + 1} sur 5`}
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i <= step ? "filled" : ""}>
          {i <= step ? "♥" : "♡"}
        </span>
      ))}
    </div>
  );
}
