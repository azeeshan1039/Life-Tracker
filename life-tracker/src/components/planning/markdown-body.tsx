import ReactMarkdown from "react-markdown";

export function MarkdownBody({ source }: { source: string }) {
  return (
    <div className="note">
      <ReactMarkdown>{source}</ReactMarkdown>
    </div>
  );
}
