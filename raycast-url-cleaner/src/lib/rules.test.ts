import { describe, expect, it } from "vitest";
import { cleanText, cleanUrl } from "./cleanUrl";

describe("cleanUrl", () => {
  it("normalizes an Amazon product URL to /dp/<ASIN>", () => {
    const input =
      "https://www.amazon.co.jp/%E3%82%B5%E3%83%B3%E3%83%97%E3%83%AB%E5%95%86%E5%93%81%E5%90%8D/dp/B08N5WRWNW/ref=sr_1_1?keywords=test&qid=1234567890&sr=8-1";
    expect(cleanUrl(input)).toBe("https://www.amazon.co.jp/dp/B08N5WRWNW");
  });

  it("strips all query params from an X/Twitter status URL", () => {
    const input = "https://x.com/someuser/status/1234567890123456789?s=20&t=abcDEF123";
    expect(cleanUrl(input)).toBe("https://x.com/someuser/status/1234567890123456789");
  });

  it("normalizes a youtu.be short link, keeping v and t", () => {
    const input = "https://youtu.be/dQw4w9WgXcQ?si=abc123&t=42";
    expect(cleanUrl(input)).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42");
  });

  it("strips youtube.com/watch params other than v and t", () => {
    const input = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=abc123&feature=share&pp=xyz";
    expect(cleanUrl(input)).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("keeps node-id but drops the share token on a Figma link", () => {
    const input = "https://www.figma.com/design/abcXYZ123/My-File?node-id=1-2&t=someToken-1";
    expect(cleanUrl(input)).toBe("https://www.figma.com/design/abcXYZ123/My-File?node-id=1-2");
  });

  it("keeps node-id but drops the share token on a FigJam board link", () => {
    const input = "https://www.figma.com/board/abcXYZ123/My-Board?node-id=1-2&t=someToken-1";
    expect(cleanUrl(input)).toBe("https://www.figma.com/board/abcXYZ123/My-Board?node-id=1-2");
  });

  it("strips generic utm params from an unrecognized domain", () => {
    const input = "https://example.com/blog/post?utm_source=newsletter&utm_medium=email&id=42";
    expect(cleanUrl(input)).toBe("https://example.com/blog/post?id=42");
  });

  it("leaves an already-clean URL untouched", () => {
    const input = "https://example.com/blog/post?id=42";
    expect(cleanUrl(input)).toBe(input);
  });

  it("returns non-URL strings unchanged", () => {
    expect(cleanUrl("not a url")).toBe("not a url");
  });
});

describe("cleanText", () => {
  it("reports no change and returns original text when there is no URL", () => {
    const result = cleanText("just some text, no links here");
    expect(result.changed).toBe(false);
    expect(result.text).toBe("just some text, no links here");
  });

  it("cleans a URL embedded in a sentence and preserves trailing punctuation", () => {
    const result = cleanText(
      "見て: https://www.amazon.co.jp/some-product-name/dp/B08N5WRWNW/ref=sr_1_1?keywords=test. すごい。",
    );
    expect(result.changed).toBe(true);
    expect(result.text).toBe("見て: https://www.amazon.co.jp/dp/B08N5WRWNW. すごい。");
  });

  it("cleans multiple URLs in the same text", () => {
    const result = cleanText(
      "https://youtu.be/dQw4w9WgXcQ?si=abc and https://x.com/someuser/status/123?s=20",
    );
    expect(result.changed).toBe(true);
    expect(result.text).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ and https://x.com/someuser/status/123",
    );
  });

  it("does not modify text when the only URL is already clean", () => {
    const result = cleanText("check https://example.com/page?id=1 out");
    expect(result.changed).toBe(false);
    expect(result.text).toBe("check https://example.com/page?id=1 out");
  });
});
