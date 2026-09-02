export function FrontSummary({ html }: { html: string }) {
  // Trusted hardcoded copy at this stage (mirrors the mockup's innerHTML usage).
  // Plan §9: once this is curator-authored, it needs server-side allow-list sanitization first.
  return <div className="fd-summary" dangerouslySetInnerHTML={{ __html: html }} />;
}
