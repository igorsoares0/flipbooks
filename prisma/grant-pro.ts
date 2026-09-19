import { createScriptClient } from "./client";

// Grants Pro by hand, without Paddle: for comps, partners and support.
// Usage: npm run grant-pro -- someone@example.com
const email = process.argv[2];
if (!email) {
  console.error("Usage: npm run grant-pro -- <email>");
  process.exit(1);
}

const prisma = createScriptClient();

async function main() {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) throw new Error(`No account for ${email}. Sign up first.`);
  const active = await prisma.subscription.findFirst({ where: { userId: user.id, plan: "PRO", status: "ACTIVE" } });
  if (active) {
    console.info(`${email} already has Pro.`);
    return;
  }
  await prisma.subscription.create({ data: { userId: user.id, plan: "PRO", status: "ACTIVE" } });
  console.info(`Granted Pro to ${email}.`);
}

main()
  .catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
