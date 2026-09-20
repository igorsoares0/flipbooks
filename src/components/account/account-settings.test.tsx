// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { authClient } from "@/lib/auth/client";
import { AccountSettings } from "./account-settings";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
vi.mock("@/lib/auth/client", () => ({
  authClient: {
    updateUser: vi.fn(async () => ({ error: null })),
    changeEmail: vi.fn(async () => ({ error: null })),
    changePassword: vi.fn(async () => ({ error: null })),
    deleteUser: vi.fn(async () => ({ error: null })),
    requestPasswordReset: vi.fn(async () => ({ error: null })),
  },
}));

const user = { name: "Marina Rocha", email: "marina@studio.co", emailVerified: true };
const mocked = vi.mocked(authClient);

describe("account settings", () => {
  it("saves a new name", async () => {
    render(<AccountSettings user={user} hasPassword />);
    const name = screen.getByLabelText("Name");
    await userEvent.clear(name);
    await userEvent.type(name, "Marina R.");
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(mocked.updateUser).toHaveBeenCalledWith({ name: "Marina R." });
    expect((await screen.findByRole("status")).textContent).toContain("Name saved.");
  });

  it("refuses an empty name without calling the server", async () => {
    render(<AccountSettings user={user} hasPassword />);
    mocked.updateUser.mockClear();
    await userEvent.clear(screen.getByLabelText("Name"));
    await userEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(mocked.updateUser).not.toHaveBeenCalled();
    expect((await screen.findByRole("alert")).textContent).toContain("can't be empty");
  });

  it("explains the two steps when changing a verified email", async () => {
    render(<AccountSettings user={user} hasPassword />);
    await userEvent.type(screen.getByLabelText(/New email/), "new@studio.co");
    await userEvent.click(screen.getByRole("button", { name: "Change email" }));
    expect(mocked.changeEmail).toHaveBeenCalledWith({ newEmail: "new@studio.co", callbackURL: "/dashboard/settings" });
    expect((await screen.findByRole("status")).textContent).toContain("Check marina@studio.co");
  });

  it("changes the password and signs other devices out", async () => {
    render(<AccountSettings user={user} hasPassword />);
    await userEvent.type(screen.getByLabelText("Current password"), "old-password");
    await userEvent.type(screen.getByLabelText("New password"), "new-password");
    await userEvent.click(screen.getByRole("button", { name: "Change password" }));
    expect(mocked.changePassword).toHaveBeenCalledWith({ currentPassword: "old-password", newPassword: "new-password", revokeOtherSessions: true });
  });

  it("offers Google-only accounts a link to set a password", async () => {
    render(<AccountSettings user={user} hasPassword={false} />);
    expect(screen.queryByLabelText("Current password")).toBeNull();
    await userEvent.click(screen.getByRole("button", { name: "Email me a link" }));
    expect(mocked.requestPasswordReset).toHaveBeenCalledWith({ email: user.email, redirectTo: "/reset-password" });
  });

  it("only deletes after DELETE is typed, and then asks for email confirmation", async () => {
    render(<AccountSettings user={user} hasPassword />);
    const button = screen.getByRole("button", { name: "Delete my account" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    await userEvent.type(screen.getByLabelText("Type DELETE to confirm"), "delete");
    expect(button.disabled).toBe(false);
    await userEvent.click(button);
    expect(mocked.deleteUser).toHaveBeenCalledWith({ callbackURL: "/login?deleted=1" });
    expect((await screen.findByRole("status")).textContent).toContain("Check marina@studio.co");
  });
});
