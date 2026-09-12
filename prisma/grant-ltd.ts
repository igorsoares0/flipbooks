import { createScriptClient } from "./client";

// Grants the Lifetime Deal to an account until Paddle checkout exists.
// Usage: npm run grant-ltd -- someone@example.com
const email = process.argv[2];
if (!email) {
  console.error("Usage: npm run grant-ltd -- <email>");
  process.exit(1);
}

const prisma = createScriptClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`No account for ${email}. Sign up first.`);
  const active = await prisma.subscription.findFirst({ where: { userId: user.id, plan: "LIFETIME", status: "ACTIVE" } });
  if (active) {
    console.info(`${email} already has the Lifetime Deal.`);
    return;
  }
  await prisma.subscription.create({ data: { userId: user.id, plan: "LIFETIME", status: "ACTIVE" } });
  console.info(`Granted the Lifetime Deal to ${email}.`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
