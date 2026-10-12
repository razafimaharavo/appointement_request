import "./admin.css";
export const metadata = {
  title: "Espace privé · Juste nous deux",
  robots: { index: false, follow: false },
  referrer: "no-referrer" as const,
};
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="romantic-world admin-world">
      <div className="admin-shell">
        <div className="admin-brand">♡ juste nous deux.</div>
        {children}
      </div>
    </main>
  );
}
