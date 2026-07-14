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
  await expect(page.getByText("106,1 MHz", { exact: true })).toBeVisible();
});
