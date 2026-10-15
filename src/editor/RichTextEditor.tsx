// The first app screen currently embeds RichEditor directly so the prototype is easy to run.
// Move it here when editor-specific behavior grows; keep HTML and toolbar configuration centralized.
export const EDITOR_BASE_CSS = `
  body { margin: 0; padding: 0; }
  p { margin: 0 0 12px; }
  h1, h2 { line-height: 1.3; }
  ul, ol { padding-left: 24px; }
`;
