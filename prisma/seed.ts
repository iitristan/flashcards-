import { PrismaClient } from "@prisma/client";

async function main() {
  console.log("No seed data configured. Sign up and create decks in the app.");
}

main()
  .then(async () => {
    const prisma = new PrismaClient();
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    process.exit(1);
  });
