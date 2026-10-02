import { test, expect } from "@playwright/test";
test("refusal is respectful and reversible", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Non", exact: true }).click();
  await expect(page.getByRole("heading")).toContainText("sincérité");
  await page.getByRole("button", { name: "Revenir à l’invitation" }).click();
  await expect(page.getByRole("heading")).toContainText("Tu veux sortir");
});
test("five pages, custom food, one email and refresh", async ({
  page,
}, testInfo) => {
  let requests = 0;
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.route("**/api/send-date-response", async (route) => {
    requests++;
    const data = route.request().postDataJSON();
    expect(data.food).toBe("Autre");
    expect(data.otherFood).toBe("Un pique-nique");
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto("/");
  await page.screenshot({
    path: `/tmp/invitation-${testInfo.project.name}.png`,
    fullPage: true,
  });
  await page.getByRole("button", { name: "Oui 💗" }).click();
  await expect(page.getByRole("heading")).toContainText("vraiment dit");
  await page.getByRole("button", { name: "D’accord, d’accord" }).click();
  await expect(page.getByRole("heading")).toContainText("Quand es-tu");
  const future = new Date(Date.now() + 86400000 * 10);
  const day = `${future.getFullYear()}-${String(future.getMonth() + 1).padStart(2, "0")}-${String(future.getDate()).padStart(2, "0")}`;
  await page.getByLabel("Le jour").fill(day);
  await page.getByLabel("L’heure").fill("18:30");
  await page.getByRole("button", { name: "Fixer la date" }).click();
  await expect(page.getByRole("heading")).toContainText("De quoi as-tu");
  await page.getByRole("radio", { name: "Autre" }).check();
  await page
    .getByLabel("Dis-moi ce qui te ferait plaisir")
    .fill("Un pique-nique");
  await page.getByRole("button", { name: "Je choisis ça" }).click();
  await expect(page.getByRole("heading")).toContainText("Alors c’est");
  await expect(page.getByRole("status")).toContainText("bien arrivé");
  expect(requests).toBe(1);
  await page.reload();
  await expect(page.getByRole("heading")).toContainText("Alors c’est");
  await expect(page.getByRole("status")).toContainText("bien arrivé");
  expect(requests).toBe(1);
  expect(errors).toEqual([]);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
  ).toBe(true);
  await page.screenshot({
    path: `/tmp/invitation-final-${testInfo.project.name}.png`,
    fullPage: true,
  });
});
test("server rejects invalid input and reports missing configuration", async ({
  request,
}) => {
  expect(
    (
      await request.post("/api/send-date-response", {
        data: { accepted: true },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await request.post("/api/send-date-response", {
        headers: { origin: "https://untrusted.example" },
        data: {},
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await request.post("/api/send-date-response", {
        data: {
          id: crypto.randomUUID(),
          accepted: true,
          date: "2090-10-10",
          time: "18:30",
          food: "Pizza",
          timezoneOffset: -180,
        },
      })
    ).status(),
  ).toBe(503);
});
