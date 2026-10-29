/** Plain-text content with blank-line paragraph breaks. */
export function Paragraphs({ text, className }: { text: string; className?: string }) {
  return (
    <div className={className}>
      {text.split(/\n\s*\n/).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </div>
  );
}
