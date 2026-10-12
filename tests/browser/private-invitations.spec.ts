import { test, expect, type Page } from "@playwright/test";
test.skip(
  !process.env.TEST_ADMIN_PASSWORD,
  "Run with npm run test:private:e2e and an isolated database.",
);
async function login(page: Page) {
  await page.goto("/admin/invitations");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("Mot de passe").fill(process.env.TEST_ADMIN_PASSWORD!);
  await page.getByRole("button", { name: "Entrer dans mon espace" }).click();
  await expect(page).toHaveURL(/\/admin\/invitations/);
}
async function create(page: Page, name: string) {
  await page.getByLabel("Son prénom").fill(name);
  await page.getByRole("button", { name: "Créer une invitation" }).click();
  const input = page.getByLabel("Lien de la nouvelle invitation");
  await expect(input).toBeVisible();
  return input.inputValue();
}
test("admin creates personalized invitation; five chapters persist; name occurs only at key moments", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await login(page);
  const name = `Sarah ${info.project.name}`;
  const url = await create(page, name);
  await page.screenshot({
    path: `/tmp/admin-invitations-${info.project.name}.png`,
    fullPage: true,
  });
  await page.goto(url);
  await expect(
    page.getByText(`J’ai une petite question pour toi, ${name}… 💕`),
  ).toBeVisible();
  await page.getByRole("button", { name: "Oui 💗" }).click();
  await expect(page.getByRole("heading")).toContainText("vraiment dit");
  await expect(page.getByText(name, { exact: false })).toHaveCount(0);
  await page.getByRole("button", { name: "D’accord, d’accord" }).click();
  await page.getByLabel("Le jour").fill("2090-10-10");
  await page.getByLabel("L’heure").fill("18:30");
  await page.getByRole("button", { name: "Fixer la date" }).click();
  await page.getByRole("radio", { name: "Pizza", exact: false }).check();
  await page.getByRole("button", { name: "Je choisis ça" }).click();
  await expect(
    page.getByText(`${name}, je suis vraiment content que tu aies dit oui. ❤️`),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Réessayer l’envoi" }),
  ).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading")).toContainText("Alors c’est");
  await expect(page.getByText("Pizza", { exact: true })).toBeVisible();
  await page.goto("/admin/invitations");
  const card = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
  await expect(card.getByText("Terminée", { exact: true })).toBeVisible();
  await expect(card).toContainText("Pizza");
  expect(errors).toEqual([]);
  await page.getByRole("button", { name: "Se déconnecter" }).click();
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.goto("/admin/invitations");
  await expect(page).toHaveURL(/\/admin\/login/);
});
test("decline survives refresh; revoked and invalid links cannot be used", async ({
  page,
}, info) => {
  await login(page);
  const name = `Lina ${info.project.name}`;
  const url = await create(page, name);
  await page.goto(url);
  await page.getByRole("button", { name: "Non", exact: true }).click();
  await expect(page.getByRole("heading")).toContainText("sincérité");
  await page.reload();
  await expect(page.getByRole("heading")).toContainText("sincérité");
  await page.goto("/admin/invitations");
  const card = page
    .locator("article")
    .filter({ has: page.getByRole("heading", { name, exact: true }) });
  await expect(card.getByText("Refusée", { exact: true })).toBeVisible();
  page.once("dialog", (dialog) => dialog.accept());
  await card.getByRole("button", { name: "Révoquer" }).click();
  await expect(card.getByText("Lien révoqué", { exact: true })).toBeVisible();
  await page.goto(url);
  await expect(page.getByRole("heading")).toContainText("n’est plus");
  await page.goto("/invitation/invalid");
  await expect(page.getByRole("heading")).toContainText("n’est plus");
});
