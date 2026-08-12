import { describe, expect, it } from "vitest";
import { builtinRules, defaultDisabledBuiltinRuleIds } from "../rules";
import { cleanText, cleanUrl } from "./cleanUrl";

/** The rules an as-installed extension runs with, i.e. without the ones that ship switched off. */
const asInstalledRules = builtinRules.filter((rule) => !defaultDisabledBuiltinRuleIds.includes(rule.id));

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

  // `builtin.youtube.shorten` ships switched off (see `defaultDisabledBuiltinRuleIds`), so the
  // youtu.be results below are what the user gets after enabling it, not the as-installed default.
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

  it("keeps a YouTube embed URL embeddable, dropping only its tracking parameters", () => {
    const input = "https://www.youtube.com/embed/dQw4w9WgXcQ?si=abc123";
    expect(cleanUrl(input)).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ");
  });

  it("keeps the player options on a YouTube embed URL", () => {
    const input = "https://www.youtube.com/embed/dQw4w9WgXcQ?si=abc123&autoplay=1&start=42";
    expect(cleanUrl(input)).toBe("https://www.youtube.com/embed/dQw4w9WgXcQ?autoplay=1&start=42");
  });

  it("keeps the playlist a video URL is played from", () => {
    const input = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&list=PLabc123&index=3&pp=xyz";
    expect(cleanUrl(input)).toBe("https://youtu.be/dQw4w9WgXcQ?list=PLabc123");
  });

  it("keeps only the playlist id on a playlist URL", () => {
    const input = "https://www.youtube.com/playlist?list=PLabc123&si=abc123";
    expect(cleanUrl(input)).toBe("https://www.youtube.com/playlist?list=PLabc123");
  });

  it("keeps an embedded playlist URL on /embed/videoseries", () => {
    const input = "https://www.youtube.com/embed/videoseries?list=PLabc123&autoplay=1&si=abc123";
    expect(cleanUrl(input)).toBe("https://www.youtube.com/embed/videoseries?list=PLabc123&autoplay=1");
  });

  // The order YouTube's share dialog writes them in: si first, list second.
  it("keeps the playlist id on an embedded playlist URL that leads with the share token", () => {
    const input = "https://www.youtube.com/embed/videoseries?si=NlMCeEhG0GtWvaez&list=PL50C2A0ACF997D114";
    expect(cleanUrl(input)).toBe("https://www.youtube.com/embed/videoseries?list=PL50C2A0ACF997D114");
  });

  it("cleans a YouTube Music URL without moving it off music.youtube.com", () => {
    const input = "https://music.youtube.com/watch?v=dQw4w9WgXcQ&si=abc123&feature=share";
    expect(cleanUrl(input)).toBe("https://music.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("leaves a youtube.com/watch URL on youtube.com when the shortening rule is off, as it is by default", () => {
    const input = "https://www.youtube.com/shorts/dQw4w9WgXcQ?feature=share";
    expect(cleanUrl(input, asInstalledRules)).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  });

  it("strips all query params from a Google Meet meeting URL", () => {
    const input = "https://meet.google.com/abc-defg-hij?authuser=0&hs=122&pli=1";
    expect(cleanUrl(input)).toBe("https://meet.google.com/abc-defg-hij");
  });

  it("strips all query params from a Google Meet calendar lookup URL", () => {
    const input = "https://meet.google.com/lookup/team-standup?authuser=1";
    expect(cleanUrl(input)).toBe("https://meet.google.com/lookup/team-standup");
  });

  it("leaves an already-clean Google Meet meeting URL untouched", () => {
    const input = "https://meet.google.com/abc-defg-hij";
    expect(cleanUrl(input)).toBe(input);
  });

  it("cleans only tracking params on a Google Meet URL that is not a meeting URL", () => {
    const input = "https://meet.google.com/landing?utm_source=newsletter&hl=ja";
    expect(cleanUrl(input)).toBe("https://meet.google.com/landing?hl=ja");
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

  it("keeps the Dev Mode parameter on a Figma URL", () => {
    const input = "https://www.figma.com/design/abcXYZ123/SomeFile?node-id=1-2&m=dev&t=someToken-1";
    expect(cleanUrl(input)).toBe("https://www.figma.com/design/abcXYZ123/?node-id=1-2&m=dev");
  });

  it("keeps the ready-for-dev parameter on a Figma URL", () => {
    const input = "https://www.figma.com/design/abcXYZ123/SomeFile?node-id=1-2&ready-for-dev=1&t=someToken-1";
    expect(cleanUrl(input)).toBe("https://www.figma.com/design/abcXYZ123/?node-id=1-2&ready-for-dev=1");
  });

  it("keeps the pinned version on a Figma URL", () => {
    const input = "https://www.figma.com/design/abcXYZ123/SomeFile?node-id=1-2&version-id=987654321&t=someToken-1";
    expect(cleanUrl(input)).toBe("https://www.figma.com/design/abcXYZ123/?node-id=1-2&version-id=987654321");
  });

  it("keeps the prototype playback parameters on a Figma prototype URL", () => {
    const input =
      "https://www.figma.com/proto/abcXYZ123/SomeFile?page-id=0%3A1&node-id=1-2&starting-point-node-id=1%3A2&scaling=scale-down&content-scaling=fixed&t=someToken-1";
    expect(cleanUrl(input)).toBe(
      "https://www.figma.com/proto/abcXYZ123/?page-id=0%3A1&node-id=1-2&starting-point-node-id=1%3A2&scaling=scale-down&content-scaling=fixed",
    );
  });

  it("drops the name slug on a Figma Slides URL", () => {
    const input = "https://www.figma.com/slides/abcXYZ123/SomeDeck?node-id=1-2&t=someToken-1";
    expect(cleanUrl(input)).toBe("https://www.figma.com/slides/abcXYZ123/?node-id=1-2");
  });

  it("drops the name slug on a Figma Make URL", () => {
    const input = "https://www.figma.com/make/abcXYZ123/SomeApp?node-id=1-2&t=someToken-1";
    expect(cleanUrl(input)).toBe("https://www.figma.com/make/abcXYZ123/?node-id=1-2");
  });

  it("keeps the last path segment of a non-file figma.com page", () => {
    const input = "https://www.figma.com/legal/us/privacy?t=someToken-1";
    expect(cleanUrl(input)).toBe("https://www.figma.com/legal/us/privacy");
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

describe("cleanUrl with the as-installed rules", () => {
  it("keeps a youtube.com/watch URL on youtube.com, dropping everything but the start time", () => {
    const input = "https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=abc123&feature=share&t=42";
    expect(cleanUrl(input, asInstalledRules)).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42");
  });

  it("expands a youtu.be URL to youtube.com, since the shortening rule is the one that ships off", () => {
    const input = "https://youtu.be/dQw4w9WgXcQ?si=abc123&t=42";
    expect(cleanUrl(input, asInstalledRules)).toBe("https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42");
  });

  it("still cleans the sites the shortening rule has nothing to do with", () => {
    expect(cleanUrl("https://x.com/someuser/status/123?s=20", asInstalledRules)).toBe(
      "https://x.com/someuser/status/123",
    );
    expect(cleanUrl("https://example.com/post?utm_source=news&id=42", asInstalledRules)).toBe(
      "https://example.com/post?id=42",
    );
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
