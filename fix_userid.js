const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "demo@user.com" },
    update: {},
    create: {
      email: "demo@user.com",
      password: "123456",
      fullName: "Demo User",
    },
  });

  console.log("✅ demo user id =", user.id);

  const result = await prisma.application.updateMany({
    where: { userId: null },
    data: { userId: user.id },
  });

  console.log("✅ updated applications =", result.count);
}

main()
  .catch((e) => {
    console.error("❌ ERROR:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
