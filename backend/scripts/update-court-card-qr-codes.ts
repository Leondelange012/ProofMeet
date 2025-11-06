/**
 * Update existing court cards with QR code and verification URL
 * Run this to backfill old court cards with new QR code fields
 */

import { PrismaClient } from '@prisma/client';
import { generateVerificationUrl, generateQRCodeData } from '../src/services/digitalSignatureService';

const prisma = new PrismaClient();

async function updateCourtCardQRCodes() {
  console.log('🔄 Starting court card QR code update...\n');

  try {
    // Find all court cards without verification URLs
    const courtCardsNeedingUpdate = await prisma.courtCard.findMany({
      where: {
        OR: [
          { verificationUrl: null },
          { qrCodeData: null },
        ],
      },
      select: {
        id: true,
        cardNumber: true,
        cardHash: true,
      },
    });

    console.log(`📋 Found ${courtCardsNeedingUpdate.length} court cards needing QR code data\n`);

    if (courtCardsNeedingUpdate.length === 0) {
      console.log('✅ All court cards already have QR codes!');
      return;
    }

    let updated = 0;
    let failed = 0;

    for (const courtCard of courtCardsNeedingUpdate) {
      try {
        // Generate verification URL and QR code data
        const verificationUrl = generateVerificationUrl(courtCard.id);
        const qrCodeData = generateQRCodeData(courtCard.id, courtCard.cardNumber, courtCard.cardHash);

        // Update court card
        await prisma.courtCard.update({
          where: { id: courtCard.id },
          data: {
            verificationUrl,
            qrCodeData,
          },
        });

        console.log(`✅ Updated: ${courtCard.cardNumber} → ${verificationUrl}`);
        updated++;
      } catch (error: any) {
        console.error(`❌ Failed to update ${courtCard.cardNumber}: ${error.message}`);
        failed++;
      }
    }

    console.log('\n📊 Summary:');
    console.log(`   ✅ Updated: ${updated}`);
    console.log(`   ❌ Failed: ${failed}`);
    console.log(`   📈 Total: ${courtCardsNeedingUpdate.length}`);

  } catch (error: any) {
    console.error('❌ Error updating court cards:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

updateCourtCardQRCodes()
  .then(() => {
    console.log('\n✅ QR code update complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ QR code update failed:', error);
    process.exit(1);
  });

