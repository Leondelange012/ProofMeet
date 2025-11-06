/**
 * Blockchain-Style Attendance Ledger
 * Immutable, tamper-proof attendance records with cryptographic verification
 */

import crypto from 'crypto';
import { logger } from '../utils/logger';

export interface AttendanceBlock {
  blockId: string;
  recordId: string;
  participantId: string;
  courtRepId: string;
  meetingId: string;
  timestamp: Date;
  data: {
    joinTime: Date;
    leaveTime: Date | null;
    duration: number;
    attendancePercent: number;
    verificationSignals: string[];
    engagementScore?: number;
    flags?: string[];
  };
  previousHash: string;
  hash: string;
  signature: string;
  nonce: number;
}

export interface ChainVerification {
  isValid: boolean;
  totalBlocks: number;
  invalidBlocks: string[];
  errors: string[];
}

/**
 * Generate cryptographic hash for a block
 */
export function generateBlockHash(block: Omit<AttendanceBlock, 'hash' | 'signature'>): string {
  const data = JSON.stringify({
    blockId: block.blockId,
    recordId: block.recordId,
    participantId: block.participantId,
    courtRepId: block.courtRepId,
    meetingId: block.meetingId,
    timestamp: block.timestamp,
    data: block.data,
    previousHash: block.previousHash,
    nonce: block.nonce,
  });

  return crypto
    .createHash('sha256')
    .update(data)
    .digest('hex');
}

/**
 * Generate digital signature for a block
 */
export function signBlock(hash: string, privateKey: string): string {
  try {
    return crypto
      .createSign('RSA-SHA256')
      .update(hash)
      .sign(privateKey, 'hex');
  } catch (error: any) {
    logger.error('Failed to sign block:', error);
    throw new Error('Block signing failed');
  }
}

/**
 * Verify block signature
 */
export function verifyBlockSignature(
  hash: string,
  signature: string,
  publicKey: string
): boolean {
  try {
    return crypto
      .createVerify('RSA-SHA256')
      .update(hash)
      .verify(publicKey, signature, 'hex');
  } catch (error: any) {
    logger.error('Failed to verify block signature:', error);
    return false;
  }
}

/**
 * Create immutable attendance block
 */
export function createAttendanceBlock(
  attendanceRecord: any,
  previousHash: string = '0',
  privateKey?: string
): AttendanceBlock {
  const blockId = crypto.randomUUID();
  const nonce = Math.floor(Math.random() * 1000000);

  const blockData: Omit<AttendanceBlock, 'hash' | 'signature'> = {
    blockId,
    recordId: attendanceRecord.id,
    participantId: attendanceRecord.participantId,
    courtRepId: attendanceRecord.courtRepId,
    meetingId: attendanceRecord.externalMeetingId,
    timestamp: new Date(),
    data: {
      joinTime: attendanceRecord.joinTime,
      leaveTime: attendanceRecord.leaveTime,
      duration: attendanceRecord.totalDurationMin,
      attendancePercent: Number(attendanceRecord.attendancePercent || 0),
      verificationSignals: [
        attendanceRecord.verificationMethod || 'UNKNOWN',
      ],
      engagementScore: attendanceRecord.engagementScore,
      flags: attendanceRecord.flags || [],
    },
    previousHash,
    nonce,
  };

  // Generate hash
  const hash = generateBlockHash(blockData);

  // Sign block (use server key if not provided)
  const signature = privateKey 
    ? signBlock(hash, privateKey)
    : generateDefaultSignature(hash);

  const block: AttendanceBlock = {
    ...blockData,
    hash,
    signature,
  };

  logger.info(`Created immutable block for attendance ${attendanceRecord.id}`, {
    blockId,
    hash: hash.substring(0, 16) + '...',
  });

  return block;
}

/**
 * Generate default signature when private key not available
 * In production, always use proper RSA keys
 */
function generateDefaultSignature(hash: string): string {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  return crypto
    .createHmac('sha256', secret)
    .update(hash)
    .digest('hex');
}

/**
 * Verify default signature
 */
export function verifyDefaultSignature(hash: string, signature: string): boolean {
  const secret = process.env.JWT_SECRET || 'dev-secret';
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(hash)
    .digest('hex');
  
  return signature === expectedSignature;
}

/**
 * Verify single block integrity
 */
export function verifyBlockIntegrity(block: AttendanceBlock): boolean {
  // Recreate hash from block data
  const expectedHash = generateBlockHash(block);
  
  if (expectedHash !== block.hash) {
    logger.error(`Block hash mismatch for ${block.blockId}`);
    return false;
  }

  // Verify signature
  const signatureValid = verifyDefaultSignature(block.hash, block.signature);
  
  if (!signatureValid) {
    logger.error(`Invalid signature for block ${block.blockId}`);
    return false;
  }

  return true;
}

/**
 * Verify entire attendance chain for a participant or court card
 */
export function verifyAttendanceChain(blocks: AttendanceBlock[]): ChainVerification {
  const errors: string[] = [];
  const invalidBlocks: string[] = [];

  if (blocks.length === 0) {
    return {
      isValid: true,
      totalBlocks: 0,
      invalidBlocks: [],
      errors: [],
    };
  }

  // Sort blocks by timestamp
  const sortedBlocks = [...blocks].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  // Verify each block
  for (let i = 0; i < sortedBlocks.length; i++) {
    const block = sortedBlocks[i];

    // 1. Verify block integrity (hash and signature)
    if (!verifyBlockIntegrity(block)) {
      errors.push(`Block ${block.blockId} failed integrity check`);
      invalidBlocks.push(block.blockId);
      continue;
    }

    // 2. Verify chain linkage (previousHash matches)
    if (i > 0) {
      const previousBlock = sortedBlocks[i - 1];
      if (block.previousHash !== previousBlock.hash) {
        errors.push(
          `Block ${block.blockId} previousHash doesn't match previous block hash`
        );
        invalidBlocks.push(block.blockId);
      }
    } else {
      // First block should have genesis previousHash
      if (block.previousHash !== '0' && block.previousHash !== '') {
        errors.push(`First block ${block.blockId} doesn't link to genesis`);
        invalidBlocks.push(block.blockId);
      }
    }
  }

  const isValid = invalidBlocks.length === 0;

  logger.info(`Chain verification complete:`, {
    totalBlocks: sortedBlocks.length,
    valid: isValid,
    invalidCount: invalidBlocks.length,
  });

  return {
    isValid,
    totalBlocks: sortedBlocks.length,
    invalidBlocks,
    errors,
  };
}

/**
 * Create merkle root for a set of blocks (for efficient verification)
 */
export function createMerkleRoot(blocks: AttendanceBlock[]): string {
  if (blocks.length === 0) return '';
  if (blocks.length === 1) return blocks[0].hash;

  const hashes = blocks.map(b => b.hash);

  while (hashes.length > 1) {
    const newHashes: string[] = [];
    
    for (let i = 0; i < hashes.length; i += 2) {
      if (i + 1 < hashes.length) {
        const combined = hashes[i] + hashes[i + 1];
        const hash = crypto.createHash('sha256').update(combined).digest('hex');
        newHashes.push(hash);
      } else {
        // Odd number, duplicate last hash
        newHashes.push(hashes[i]);
      }
    }
    
    hashes.length = 0;
    hashes.push(...newHashes);
  }

  return hashes[0];
}

/**
 * Export attendance chain for court presentation
 */
export function exportChainForCourt(blocks: AttendanceBlock[]): string {
  const chainData = {
    version: '1.0',
    exportDate: new Date().toISOString(),
    totalBlocks: blocks.length,
    merkleRoot: createMerkleRoot(blocks),
    blocks: blocks.map(block => ({
      blockId: block.blockId,
      recordId: block.recordId,
      timestamp: block.timestamp,
      hash: block.hash,
      signature: block.signature,
      data: block.data,
    })),
    verification: verifyAttendanceChain(blocks),
  };

  return JSON.stringify(chainData, null, 2);
}

/**
 * Detect tampering in attendance record
 */
export function detectTampering(
  storedBlock: AttendanceBlock,
  attendanceRecord: any
): { tampered: boolean; differences: string[] } {
  const differences: string[] = [];

  // Check if critical fields match
  if (storedBlock.recordId !== attendanceRecord.id) {
    differences.push('Record ID mismatch');
  }

  if (storedBlock.data.duration !== attendanceRecord.totalDurationMin) {
    differences.push(
      `Duration changed: ${storedBlock.data.duration} -> ${attendanceRecord.totalDurationMin}`
    );
  }

  if (Math.abs(storedBlock.data.attendancePercent - attendanceRecord.attendancePercent) > 0.1) {
    differences.push(
      `Attendance % changed: ${storedBlock.data.attendancePercent} -> ${attendanceRecord.attendancePercent}`
    );
  }

  // Verify block hasn't been altered
  if (!verifyBlockIntegrity(storedBlock)) {
    differences.push('Block integrity compromised');
  }

  return {
    tampered: differences.length > 0,
    differences,
  };
}

