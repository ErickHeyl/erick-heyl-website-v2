import { expect, test, type Page } from "@playwright/test";

const ADMIN = process.env.E2E_ADMIN_TOKEN || "dev-dj-admin";
const SHOTS = "docs/song-requests-demo";

async function reset(page: Page, mode: "empty" | "seed") {
  const res = await page.request.get(`/api/song-requests/dev-seed${mode === "empty" ? "?empty=1" : ""}`);
  expect(res.ok()).toBeTruthy();
}

const item = (page: Page, text: string | RegExp) => page.locator("#sr-list > li").filter({ hasText: text });

async function expectNoHorizontalScroll(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

test.describe.configure({ mode: "serial" });

test("full guest + admin flow", async ({ page, browser, baseURL }, info) => {
  await reset(page, "empty");
  await page.goto("/dj/requests");
  await expect(page.getByText("No requests yet, be the first!")).toBeVisible();
  await expectNoHorizontalScroll(page);

  // 1. Search for a real song and submit it.
  const search = page.locator("#sr-search");
  await search.fill("september earth wind fire");
  // Wait for real iTunes results (rows with artwork), not just the "Searching…" placeholder.
  await expect(page.locator("#sr-results [role=option] img").first()).toBeVisible({ timeout: 15_000 });
  const firstSong = page.locator("#sr-results [role=option]").first();
  await expect(page.locator("#sr-results")).toContainText("Can't find it? Request");
  await expectNoHorizontalScroll(page);
  await firstSong.click();
  await expect(page.locator("#sr-selected")).toBeVisible();
  const chosenTitle = (await page.locator("#sr-selected-title").textContent())!.trim();
  await page.locator("#sr-name").fill("E2E Guest");
  await page.locator("#sr-note").fill("for the birthday dance!");
  await page.locator("#sr-submit").click();
  await expect(page.locator("#sr-toast")).toHaveText("Added! 🎶");
  const songItem = item(page, chosenTitle);
  await expect(songItem).toContainText("E2E Guest");
  await expect(songItem).toContainText("for the birthday dance!");
  await expect(songItem.locator("img")).toHaveCount(1);
  await expect(songItem.locator("button").last()).toBeDisabled(); // requester's own vote counted

  // 2. Free-text ("custom") request via the "Can't find it?" option.
  await search.fill("my uncle's polka jam");
  const customOpt = page.locator("#sr-results [role=option]").filter({ hasText: "Can't find it?" });
  await expect(customOpt).toBeVisible();
  await customOpt.click();
  await expect(page.locator("#sr-custom")).toBeVisible();
  await expect(page.locator("#sr-custom-title")).toHaveValue("my uncle's polka jam");
  await page.locator("#sr-custom-artist").fill("Uncle Bob");
  await page.locator("#sr-submit").click();
  await expect(page.locator("#sr-toast")).toHaveText("Added! 🎶");
  await expect(item(page, "my uncle's polka jam")).toContainText("Uncle Bob");
  await expect(item(page, "my uncle's polka jam")).toContainText("custom");

  // 3. Duplicate (different case/punctuation) => upvotes the existing entry.
  await search.fill("My Uncles Polka Jam");
  await page.locator("#sr-results [role=option]").filter({ hasText: "Can't find it?" }).click();
  await page.locator("#sr-custom-artist").fill("uncle bob");
  await page.locator("#sr-submit").click();
  await expect(page.locator("#sr-toast")).toHaveText("Already on the list, we upvoted it for you");
  await expect(page.locator("#sr-list > li")).toHaveCount(2);
  await expect(item(page, "my uncle's polka jam").locator(".sr-votes")).toHaveText("2");

  // 4. Upvote from a different "browser" (fresh localStorage), once only.
  const ctx2 = await browser.newContext({ baseURL, viewport: page.viewportSize()! });
  const guest2 = await ctx2.newPage();
  await guest2.goto("/dj/requests");
  const upBtn = item(guest2, chosenTitle).locator("button").last();
  await expect(upBtn.locator(".sr-votes")).toHaveText("1");
  await upBtn.click();
  await expect(upBtn.locator(".sr-votes")).toHaveText("2");
  await expect(upBtn).toBeDisabled();
  await guest2.reload();
  await expect(item(guest2, chosenTitle).locator(".sr-votes")).toHaveText("2");
  await expect(item(guest2, chosenTitle).locator("button").last()).toBeDisabled(); // remembered in localStorage

  // 5. Sorting: Newest puts the polka request first.
  await guest2.getByRole("button", { name: "Newest" }).click();
  await expect(guest2.locator("#sr-list > li").first()).toContainText("polka");

  // 6. Admin: mark played + hide + delete.
  await page.goto(`/dj/requests?admin=${ADMIN}`);
  await expect(page.getByText("Admin mode.")).toBeVisible();
  await item(page, chosenTitle).getByRole("button", { name: "Mark played" }).click();
  await expect(page.locator("#sr-toast")).toHaveText("Marked played");
  await expect(item(page, chosenTitle)).toContainText("Played");
  await expect(page.locator("#sr-list > li").last()).toContainText(chosenTitle); // played sinks to the bottom
  await item(page, "polka").getByRole("button", { name: "Hide" }).click();
  await expect(item(page, "polka")).toContainText("Hidden");

  // Guests no longer see the hidden song; the played song is greyed at the bottom.
  await guest2.reload();
  await expect(item(guest2, "polka")).toHaveCount(0);
  await expect(item(guest2, chosenTitle)).toContainText("Played");
  await expect(item(guest2, chosenTitle)).toHaveClass(/opacity-50/);

  // Admin API calls without the token are rejected.
  const id = await item(guest2, chosenTitle).getAttribute("data-id");
  const unauth = await guest2.request.patch(`/api/song-requests/${id}`, { data: { status: "pending" } });
  expect(unauth.status()).toBe(401);

  page.once("dialog", (d) => d.accept());
  await item(page, "polka").getByRole("button", { name: "Delete" }).click();
  await expect(page.locator("#sr-toast")).toHaveText("Deleted");
  await expect(item(page, "polka")).toHaveCount(0);

  // Invalid admin token => guest view.
  await guest2.goto("/dj/requests?admin=nope");
  await expect(guest2.getByText("That admin link isn't valid")).toBeVisible();
  await expect(guest2.getByRole("button", { name: "Mark played" })).toHaveCount(0);
  await ctx2.close();
  await expectNoHorizontalScroll(page);
  info.annotations.push({ type: "song", description: chosenTitle });
});

test("free text still works when search fails", async ({ page }) => {
  await reset(page, "empty");
  await page.route("**/api/songs/search**", (route) => route.abort());
  await page.goto("/dj/requests");
  await page.locator("#sr-search").fill("offline anthem");
  const customOpt = page.locator("#sr-results [role=option]").filter({ hasText: "Can't find it?" });
  await expect(customOpt).toBeVisible();
  await expect(page.locator("#sr-results [role=option]")).toHaveCount(1);
  await customOpt.click();
  await page.locator("#sr-submit").click();
  await expect(page.locator("#sr-toast")).toHaveText("Added! 🎶");
  await expect(item(page, "offline anthem")).toBeVisible();
});

test("vibe requests: chips, free text, dedupe, separate list", async ({ page }) => {
  await reset(page, "empty");
  await page.goto("/dj/requests");
  await expect(page.locator("#sr-vibes-section")).toBeHidden();

  await page.getByRole("button", { name: "A vibe" }).click();
  await expect(page.locator("#sr-search")).toBeHidden();
  await expect(page.locator("#sr-submit")).toHaveText(/Request vibe/);

  // Empty submit shows a friendly error.
  await page.locator("#sr-submit").click();
  await expect(page.locator("#sr-form-error")).toHaveText("Pick a vibe or type your own.");

  // Offensive wording is rejected with a friendly message; curse words are fine.
  await page.locator("#sr-vibe-input").fill("f@ggot music");
  await page.locator("#sr-submit").click();
  await expect(page.locator("#sr-form-error")).toHaveText("That wording isn't allowed here. Please keep it friendly.");
  await expect(page.locator("#sr-vibes > li")).toHaveCount(0);
  await page.locator("#sr-vibe-input").fill("");

  // Quick-pick chip.
  await page.locator(".sr-vibe-chip", { hasText: "Afrobeats" }).click();
  await expect(page.locator("#sr-vibe-input")).toHaveValue("Afrobeats");
  await page.locator("#sr-submit").click();
  await expect(page.locator("#sr-toast")).toHaveText("Vibe added! ✨");
  const vibes = page.locator("#sr-vibes > li");
  await expect(vibes).toHaveCount(1);
  await expect(page.locator("#sr-list > li")).toHaveCount(0); // songs list untouched
  await expect(page.locator("#sr-vibe-input")).toHaveValue("");

  // Typed duplicate (different case) upvotes instead.
  await page.locator("#sr-vibe-input").fill("AFROBEATS");
  await page.locator("#sr-submit").click();
  await expect(page.locator("#sr-toast")).toHaveText("That vibe's on the list, we upvoted it for you");
  await expect(vibes).toHaveCount(1);
  await expect(vibes.first().locator(".sr-votes")).toHaveText("2");

  // Free-text vibe, then switching back to songs restores the search box.
  await page.locator("#sr-vibe-input").fill("Songs my mom would dance to");
  await page.locator("#sr-submit").click();
  await expect(vibes).toHaveCount(2);
  await page.getByRole("button", { name: "A song" }).click();
  await expect(page.locator("#sr-search")).toBeVisible();
  await expect(page.locator("#sr-submit")).toHaveText(/Request song/);
  await expectNoHorizontalScroll(page);
});

test("demo screenshots", async ({ page }, info) => {
  // Hide Astro's dev toolbar and wait for artwork so screenshots look like production.
  const prep = async () => {
    await page.addStyleTag({ content: "astro-dev-toolbar{display:none!important}" });
    await page.waitForFunction(() => [...document.images].every((i) => i.complete));
  };
  const shot = async (name: string) => {
    await prep();
    await page.screenshot({ path: `${SHOTS}/${info.project.name}-${name}.png`, fullPage: true });
  };

  await reset(page, "empty");
  await page.goto("/dj/requests");
  await expect(page.getByText("No requests yet, be the first!")).toBeVisible();
  await shot("1-empty");

  await reset(page, "seed");
  await page.goto("/dj/requests");
  await expect(page.locator("#sr-list > li")).toHaveCount(6);
  await expect(page.locator("#sr-vibes > li")).toHaveCount(2);
  await page.getByRole("button", { name: "A vibe" }).click();
  await page.locator(".sr-vibe-chip", { hasText: "Disco & funk" }).click();
  await prep();
  await page.locator("#sr-form").screenshot({ path: `${SHOTS}/${info.project.name}-5-vibe-form.png` });
  await page.getByRole("button", { name: "A song" }).click();
  await page.locator("#sr-search").fill("dancing in the moonlight");
  await expect(page.locator("#sr-results [role=option] img").first()).toBeVisible();
  await page.waitForLoadState("networkidle");
  await prep();
  await page.screenshot({ path: `${SHOTS}/${info.project.name}-2-search.png` }); // viewport: dropdown in view
  await page.locator("#sr-search").fill("");
  await page.locator("#sr-search").blur();

  await page.goto("/dj/requests");
  await page.waitForLoadState("networkidle");
  await expectNoHorizontalScroll(page);
  await shot("3-list");

  await page.goto(`/dj/requests?admin=${ADMIN}`);
  await page.waitForLoadState("networkidle");
  await expect(page.getByText("Admin mode.")).toBeVisible();
  await expectNoHorizontalScroll(page);
  await shot("4-admin");
});
