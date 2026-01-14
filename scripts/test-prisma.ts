
import { prisma } from '../src/lib/prisma';

async function main() {
  try {
    console.log('Testing Prisma connection...');

    // @ts-ignore
    if (prisma.companyAnalyst) {
      console.log('✅ SUCCESS: CompanyAnalyst model exists on Prisma client');
    } else {
      console.error('❌ ERROR: CompanyAnalyst model DOES NOT exist on Prisma client');
      console.log('Keys available on prisma:', Object.keys(prisma).filter(k => !k.startsWith('_')));
    }
  } catch (e) {
    console.error('Error:', e);
  } finally {
    await prisma.$disconnect();
  }
}

main();
