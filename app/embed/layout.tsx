export default function EmbedLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <style>{`body { background: transparent !important; }`}</style>
      {children}
    </>
  );
}
