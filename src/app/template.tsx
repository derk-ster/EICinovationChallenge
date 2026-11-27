/** Re-mounts on every navigation so each page eases in. It never delays navigation. */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-in">{children}</div>;
}
