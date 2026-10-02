/** Trim copy/paste whitespace, but never guess or change the destination folder. */
export function parseFtpDirectory(value) {
  const root = value?.trim();
  const help =
    "GitHub → Settings → Secrets and variables → Actions → Variables → FTP_SERVER_DIR. Saisir uniquement le chemin FTP, par exemple / ou /appointment.brunelcreative.com/ selon la racine du compte FTP.";
  if (!root) throw new Error(`FTP_SERVER_DIR est vide. ${help}`);
  if (/^FTP_SERVER_DIR\s*=/.test(root))
    throw new Error(
      `FTP_SERVER_DIR contient une affectation. Retirer « FTP_SERVER_DIR = » de la valeur. ${help}`,
    );
  if (/^["'`]|["'`]$/.test(root))
    throw new Error(
      `FTP_SERVER_DIR contient des guillemets. Les retirer de la valeur. ${help}`,
    );
  if (!root.startsWith("/"))
    throw new Error(`FTP_SERVER_DIR doit commencer par /. ${help}`);
  if (/[\x00-\x1f\x7f\\]/.test(root))
    throw new Error(
      `FTP_SERVER_DIR contient un retour à la ligne interne, un caractère de contrôle ou une barre inversée. ${help}`,
    );
  if (root.split("/").includes(".."))
    throw new Error(
      `FTP_SERVER_DIR ne doit pas contenir de segment « .. ». ${help}`,
    );
  return root;
}
