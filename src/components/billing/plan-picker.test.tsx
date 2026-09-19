// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { PlanPicker } from "./plan-picker";

vi.mock("@/lib/actions/billing", () => ({ startCheckout: vi.fn(async () => ({ ok: false, error: "nope" })) }));

describe("plan picker", () => {
  it("shows the yearly price first and switches to monthly", async () => {
    render(<PlanPicker mode="marketing" />);
    expect(screen.getByTestId("pro-price").textContent).toBe("$15");
    expect(screen.getByTestId("pro-billing").textContent).toBe("$180 billed yearly");

    await userEvent.click(screen.getByRole("radio", { name: "Monthly" }));
    expect(screen.getByTestId("pro-price").textContent).toBe("$22");
    expect(screen.getByTestId("pro-billing").textContent).toMatch(/Billed monthly/);
  });

  it("sends visitors to sign up, then to billing for Pro", () => {
    render(<PlanPicker mode="marketing" />);
    expect(screen.getByRole("link", { name: "Get Pro" }).getAttribute("href")).toBe("/register?next=/dashboard/billing");
    expect(screen.getByRole("link", { name: "Start free" }).getAttribute("href")).toBe("/register");
  });

  it("explains when billing isn't configured instead of opening checkout", async () => {
    render(<PlanPicker mode="billing" paddle={null} />);
    await userEvent.click(screen.getByRole("button", { name: /Upgrade to Pro · \$180\/year/ }));
    expect(screen.getByRole("alert").textContent).toMatch(/isn't set up/);
  });
});
