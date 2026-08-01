import { describe, expect, it } from "vitest";
import { builtinRules } from "../rules";
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

  it("keeps a youtu.be short URL short, dropping everything but the start time", () => {
    const input = "https://youtu.be/dQw4w9WgXcQ?si=abc123&t=42";
    expect(cleanUrl(input)).toBe("https://youtu.be/dQw4w9WgXcQ?t=42");
  });

  it("shortens a youtube.com/watch URL to youtu.be", () => {
    const input = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=abc123&feature=share&pp=xyz";
    expect(cleanUrl(input)).toBe("https://youtu.be/dQw4w9WgXcQ");
  });

  it("shortens a YouTube Shorts URL to youtu.be", () => {
    const input = "https://www.youtube.com/shorts/dQw4w9WgXcQ?feature=share";
    expect(cleanUrl(input)).toBe("https://youtu.be/dQw4w9WgXcQ");
  });

  it("shortens a YouTube Live URL to youtu.be", () => {
    const input = "https://www.youtube.com/live/dQw4w9WgXcQ?si=abc123&t=90";
    expect(cleanUrl(input)).toBe("https://youtu.be/dQw4w9WgXcQ?t=90");
  });

  it("shortens a YouTube embed URL to youtu.be", () => {
    const input = "https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1";
    expect(cleanUrl(input)).toBe("https://youtu.be/dQw4w9WgXcQ");
  });

  it("keeps the playlist a video URL is played from", () => {
    const input = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLabc123&index=3&pp=xyz";
    expect(cleanUrl(input)).toBe("https://youtu.be/dQw4w9WgXcQ?list=PLabc123");
  });

  it("keeps only the playlist id on a playlist URL", () => {
    const input = "https://www.youtube.com/playlist?list=PLabc123&si=abc123";
    expect(cleanUrl(input)).toBe("https://www.youtube.com/playlist?list=PLabc123");
  });

  it("turns an embedded playlist URL into the playlist page", () => {
    const input = "https://www.youtube.com/embed/videoseries?list=PLabc123&autoplay=1";
    expect(cleanUrl(input)).toBe("https://www.youtube.com/playlist?list=PLabc123");
  });

  it("cleans a YouTube Music URL without moving it off music.youtube.com", () => {
    const input = "https://music.youtube.com/watch?v=dQw4w9WgXcQ&si=abc123&feature=share";
    expect(cleanUrl(input)).toBe("https://music.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("leaves a youtube.com/watch URL on youtube.com when the shortening rule is disabled", () => {
    const rules = builtinRules.filter((rule) => rule.id !== "builtin.youtube.shorten");
    const input = "https://www.youtube.com/shorts/dQw4w9WgXcQ?feature=share";
    expect(cleanUrl(input, rules)).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("drops the URL-encoded file name slug and share token on a Figma URL", () => {
    const input =
      "https://www.figma.com/design/abcXYZ123/%E3%83%86%E3%82%B9%E3%83%88%E3%83%95%E3%82%A1%E3%82%A4%E3%83%AB?node-id=1-2&t=someToken-1";
    expect(cleanUrl(input)).toBe("https://www.figma.com/design/abcXYZ123/?node-id=1-2");
  });

  it("drops the URL-encoded board name slug and share token on a FigJam board URL", () => {
    const input =
      "https://www.figma.com/board/6hPPMM8nyNLsjjgN14uoLv/%E3%81%BE%E3%81%AA%E3%81%B3K12-%E6%B1%BA%E6%B8%88%E5%9F%BA%E7%9B%A4-%E6%A8%99%E3%83%97%E3%83%AD%E7%94%A8%E8%B3%87%E6%96%99?node-id=971-8416";
    expect(cleanUrl(input)).toBe("https://www.figma.com/board/6hPPMM8nyNLsjjgN14uoLv/?node-id=971-8416");
  });

  it("leaves a Figma URL without a name slug untouched aside from query cleanup", () => {
    const input = "https://www.figma.com/design/abcXYZ123/?node-id=1-2&t=someToken-1";
    expect(cleanUrl(input)).toBe("https://www.figma.com/design/abcXYZ123/?node-id=1-2");
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
    const result = cleanText("just some text, no URLs here");
    expect(result.changed).toBe(false);
    expect(result.text).toBe("just some text, no URLs here");
  });

  it("cleans a URL embedded in a sentence and preserves trailing punctuation", () => {
    const result = cleanText(
      "見て: https://www.amazon.co.jp/some-product-name/dp/B08N5WRWNW/ref=sr_1_1?keywords=test. すごい。",
    );
    expect(result.changed).toBe(true);
    expect(result.text).toBe("見て: https://www.amazon.co.jp/dp/B08N5WRWNW. すごい。");
  });

  it("cleans multiple URLs in the same text", () => {
    const result = cleanText("https://youtu.be/dQw4w9WgXcQ?si=abc and https://x.com/someuser/status/123?s=20");
    expect(result.changed).toBe(true);
    expect(result.text).toBe("https://youtu.be/dQw4w9WgXcQ and https://x.com/someuser/status/123");
  });

  it("does not modify text when the only URL is already clean", () => {
    const result = cleanText("check https://example.com/page?id=1 out");
    expect(result.changed).toBe(false);
    expect(result.text).toBe("check https://example.com/page?id=1 out");
  });
});
