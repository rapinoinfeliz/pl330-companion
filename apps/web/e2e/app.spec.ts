import { test, expect } from "@playwright/test";
test("navega pelo diário e propagação", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("O que vale sintonizar agora")).toBeVisible();
  await page.getByRole("link", { name: "Diário de escuta" }).click();
  await expect(
    page.getByRole("heading", { name: "Diário de escuta" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Propagação" }).click();
  await expect(page.getByRole("heading", { name: "Propagação" })).toBeVisible();
});
test("identifica uma emissora FM pelo catálogo local", async ({ page }) => {
  await page.goto("/identificar?frequency=106.1&unit=MHz");
  await page.getByRole("button", { name: "Buscar possibilidades" }).click();
  await expect(
    page.getByRole("heading", { name: "Rádio Coroado FM" }),
  ).toBeVisible();
  await expect(page.getByText("106,1 MHz", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("FUNDACAO FREI ROGERIO", { exact: true }).first()).toBeVisible();
});
test("consulta o catálogo oficial por cidade e faixa", async ({ page }) => {
  await page.goto("/catalogo");
  await expect(page.getByText("18.052")).toBeVisible();
  await page.getByPlaceholder("Nome, cidade, indicativo ou frequência…").fill("Curitibanos");
  await page.getByRole("combobox").first().selectOption("FM");
  await expect(page.getByText("FUNDACAO FREI ROGERIO", { exact: true })).toHaveCount(2);
});
test("usa as mesmas notas de propagação na visão geral e no painel", async ({ page }) => {
  await page.route("**/api/space-weather/current", (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        data: {
          kpMinute: Array.from({ length: 20 }, (_, index) => ({
            time_tag: new Date(Date.UTC(2026, 6, 14, 0, index)).toISOString(),
            estimated_kp: 1.2,
          })),
          f107Detail: [{ time_tag: "2026-07-14T00:00:00Z", flux: 115 }],
          alerts: [],
        },
        snapshots: [{ collected_at: "2026-07-14T00:00:00Z" }],
      }),
    }),
  );
  await page.goto("/");
  const summary = await page
    .getByRole("heading", { name: "Bandas para experimentar", exact: true })
    .locator("xpath=following-sibling::div[1]")
    .locator("section")
    .allInnerTexts();
  await page.getByRole("link", { name: "Propagação" }).click();
  await expect(
    page.getByRole("heading", { name: "Propagação", exact: true }),
  ).toBeVisible();
  const detail = await page
    .getByRole("heading", { name: "Bandas para experimentar agora" })
    .locator("xpath=../..")
    .locator("xpath=following-sibling::div[1]")
    .locator("section")
    .allInnerTexts();
  expect(summary).toHaveLength(3);
  for (let index = 0; index < summary.length; index += 1) {
    const [name, scoreText] = summary[index].split("\n");
    expect(detail[index].split("\n")[0]).toBe(name);
    expect(detail[index]).toContain(scoreText.split("/")[0]);
  }
});
