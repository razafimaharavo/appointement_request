import { setTimeout as delay } from "node:timers/promises";
export function isTransientFtpError(error) {
  if ([421, 425, 426, 450, 451].includes(error?.code)) return true;
  // Some shared-hosting FTPS nodes intermittently omit an intermediate
  // certificate. A fresh TLS connection can then validate normally. Retrying
  // does not weaken certificate verification: Node still rejects every
  // connection whose chain is invalid.
  if (error?.code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE") return true;
  if (
    ["ECONNRESET", "ECONNABORTED", "ETIMEDOUT", "EPIPE", "EAI_AGAIN"].includes(
      error?.code,
    )
  )
    return true;
  // Other TLS, authentication, permissions and quota errors must not be bypassed.
  if (error?.code) return false;
  return /Server sent FIN packet unexpectedly|Timeout|timed out|connection (?:closed|reset)|socket is closed/i.test(
    error?.message || "",
  );
}
export async function withFtpRetry(
  operation,
  {
    reconnect,
    close,
    wait = (ms) => delay(ms),
    onRetry = (attempt, error) => {
      void attempt;
      void error;
    },
    attempts = 4,
  },
) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      await reconnect();
      return await operation();
    } catch (error) {
      close();
      if (attempt === attempts || !isTransientFtpError(error)) throw error;
      onRetry(attempt, error);
      await wait(Math.min(2000 * 2 ** (attempt - 1), 15000));
    }
  }
}
