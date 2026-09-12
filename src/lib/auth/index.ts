import "server-only";

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "@/lib/db";
import { sendEmail } from "@/lib/email";
import { resetPasswordEmail, verifyEmail } from "@/lib/email/templates";

const google =
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? { clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET }
    : undefined;

export const isGoogleEnabled = Boolean(google);

/** Don't block (or time) the auth response on email delivery. */
function deliver(email: Parameters<typeof sendEmail>[0]) {
  sendEmail(email).catch((error) => console.error("[email] delivery failed", error));
}

export const auth = betterAuth({
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    // Accounts work right away; publishing is what requires a verified email.
    requireEmailVerification: false,
    minPasswordLength: 8,
    resetPasswordTokenExpiresIn: 30 * 60,
    revokeSessionsOnPasswordReset: true,
    sendResetPassword: async ({ user, url }) => deliver(resetPasswordEmail({ to: user.email, name: user.name, url })),
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => deliver(verifyEmail({ to: user.email, name: user.name, url })),
  },
  socialProviders: google ? { google } : {},
  // AUTH_RATE_LIMIT=off lets the e2e suite sign in from many parallel workers.
  rateLimit: process.env.AUTH_RATE_LIMIT === "off" ? { enabled: false } : undefined,
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;
