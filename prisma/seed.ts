import { PrismaClient, ProgramType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding BigDwich...');

  // Clean (optional – careful in prod)
  // await prisma.walletPass.deleteMany();
  // await prisma.loyaltyHistory.deleteMany();
  // await prisma.membership.deleteMany();
  // await prisma.program.deleteMany();
  // await prisma.company.deleteMany();
  // await prisma.user.deleteMany();

  const company = await prisma.company.upsert({
    where: { slug: 'bigdwich' },
    update: {},
    create: {
      name: 'BigDwich',
      slug: 'bigdwich',
      logoUrl:
        'https://via.placeholder.com/400x400/4B0E7A/FFFFFF?text=BIGDWICH', // replace with real logo URL
      primaryColor: '#4B0E7A',
      secondaryColor: '#00D4C8',
      accentColor: '#E91E8C',
      heroImageUrl: null,
      website: 'https://instagram.com/big.dwich',
      supportEmail: 'contact@bigdwich.fr',
      isActive: true,
    },
  });

  const pointsProgram = await prisma.program.upsert({
    where: {
      companyId_slug: { companyId: company.id, slug: 'points' },
    },
    update: {},
    create: {
      companyId: company.id,
      name: 'BigDwich Points',
      slug: 'points',
      type: ProgramType.POINTS,
      description: 'Gagne des points à chaque commande et échange-les contre des récompenses !',
      primaryColor: '#4B0E7A',
      secondaryColor: '#00D4C8',
      settings: {
        pointsPerEuro: 1,
        currency: 'EUR',
        rewardThreshold: 50,
        rewardDescription: 'Sandwich gratuit',
      },
      isActive: true,
    },
  });

  const stampsProgram = await prisma.program.upsert({
    where: {
      companyId_slug: { companyId: company.id, slug: 'stamps' },
    },
    update: {},
    create: {
      companyId: company.id,
      name: 'Carte Tampons BigDwich',
      slug: 'stamps',
      type: ProgramType.STAMPS,
      description: '10 tampons = 1 sandwich offert. Le lourd entre 2 pains !',
      primaryColor: '#4B0E7A',
      secondaryColor: '#00D4C8',
      settings: {
        stampsRequired: 10,
        rewardDescription: '1 sandwich au choix offert',
        stampIcon: '🍔',
      },
      isActive: true,
    },
  });

  console.log('✅ Company:', company.name, `(${company.slug})`);
  console.log('✅ POINTS program:', pointsProgram.slug);
  console.log('✅ STAMPS program:', stampsProgram.slug);
  console.log('');
  console.log('NFC join links:');
  console.log(`  http://localhost:3000/join/bigdwich/points`);
  console.log(`  http://localhost:3000/join/bigdwich/stamps`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
