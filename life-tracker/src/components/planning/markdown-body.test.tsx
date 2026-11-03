import assert from "node:assert/strict";
import test from "node:test";
import { renderToStaticMarkup } from "react-dom/server";
import { MarkdownBody } from "./markdown-body.tsx";

test("a script tag in Markdown is text, not an element", () => {
  const html = renderToStaticMarkup(<MarkdownBody source={"See <script>alert(1)</script> and **bold**."} />);
  assert.equal(html.includes("<script"), false);
  assert.equal(html.includes("alert(1)"), true);
  assert.equal(html.includes("<strong>bold</strong>"), true);
});
