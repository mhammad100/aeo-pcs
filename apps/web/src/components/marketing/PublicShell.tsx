import PublicFooter from "./PublicFooter";
import PublicHeader from "./PublicHeader";

export default function PublicShell({
  children,
  hero = false,
}: {
  children: React.ReactNode;
  hero?: boolean;
}) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {hero ? (
        children
      ) : (
        <>
          <PublicHeader />
          <main style={{ flex: 1 }}>{children}</main>
          <PublicFooter />
        </>
      )}
    </div>
  );
}
