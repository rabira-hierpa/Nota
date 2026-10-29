import { afterEach, describe, expect, it } from "vitest";
import { currentMessages } from "@/lib/i18n";
import { useLocaleStore } from "@/stores/locale-store";

afterEach(() => useLocaleStore.setState({ locale: "en" }));

describe("useLocaleStore", () => {
  it("starts in English", () => {
    expect(useLocaleStore.getState().locale).toBe("en");
    expect(currentMessages().sections.all).toBe("Notes");
  });

  it("switches the interface's words to Amharic", () => {
    useLocaleStore.getState().setLocale("am");
    expect(useLocaleStore.getState().locale).toBe("am");
    expect(currentMessages().sections.all).toBe("ማስታወሻዎች");
  });
});
