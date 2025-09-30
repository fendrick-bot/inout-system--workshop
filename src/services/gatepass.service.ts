import { db } from '../db';
import { gatePasses, gatePassLogs, users } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { generateQRData, generateQRCodeImage, saveQRCodeImage } from '../utils/qrcode';
import { env } from '../config/env';

export class GatePassService {
  async createGatePass(userId: string) {
    // Check for existing active gate pass
    const existingPass = await db.select()
      .from(gatePasses)
      .where(
        and(
          eq(gatePasses.userId, userId),
          eq(gatePasses.status, 'active')
        )
      )
      .limit(1);

    if (existingPass.length > 0) {
      const pass = existingPass[0];
      if (new Date(pass.validUntil) > new Date()) {
        throw new Error('You already have an active gate pass');
      }
    }

    const validFrom = new Date();
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + env.GATE_PASS_VALIDITY_DAYS);

    const [gatePass] = await db.insert(gatePasses).values({
      userId,
      qrCode: '', // Temporary
      status: 'active',
      validFrom,
      validUntil,
    }).returning();

    const qrData = generateQRData(userId, gatePass.id);
    const qrCodeImage = await generateQRCodeImage(qrData);
    const qrCodePath = await saveQRCodeImage(qrData, gatePass.id);

    const [updatedPass] = await db.update(gatePasses)
      .set({ 
        qrCode: qrData,
        qrCodePath: qrCodePath
      })
      .where(eq(gatePasses.id, gatePass.id))
      .returning();

    return { ...updatedPass, qrCodeImage };
  }

  async refreshGatePass(userId: string) {
    // Expire old gate passes
    await db.update(gatePasses)
      .set({ status: 'expired' })
      .where(
        and(
          eq(gatePasses.userId, userId),
          eq(gatePasses.status, 'active')
        )
      );

    return this.createGatePass(userId);
  }

  async getActiveGatePass(userId: string) {
    const [gatePass] = await db.select()
      .from(gatePasses)
      .where(
        and(
          eq(gatePasses.userId, userId),
          eq(gatePasses.status, 'active')
        )
      )
      .orderBy(desc(gatePasses.createdAt))
      .limit(1);

    if (!gatePass) {
      return null;
    }

    // Check if expired
    if (new Date(gatePass.validUntil) < new Date()) {
      await db.update(gatePasses)
        .set({ status: 'expired' })
        .where(eq(gatePasses.id, gatePass.id));
      return null;
    }

    const qrCodeImage = await generateQRCodeImage(gatePass.qrCode);
    return { ...gatePass, qrCodeImage };
  }

  async scanQRCode(
    qrData: string,
    scannedBy: string,
    entryType: 'inward' | 'outward',
    location?: string,
    notes?: string
  ) {
    let parsedData;
    try {
      parsedData = JSON.parse(qrData);
    } catch {
      throw new Error('Invalid QR code format');
    }

    const { userId, gatePassId } = parsedData;

    const [gatePass] = await db.select()
      .from(gatePasses)
      .where(eq(gatePasses.id, gatePassId))
      .limit(1);

    if (!gatePass) {
      throw new Error('Gate pass not found');
    }

    if (gatePass.status !== 'active') {
      throw new Error(`Gate pass is ${gatePass.status}`);
    }

    if (new Date(gatePass.validUntil) < new Date()) {
      await db.update(gatePasses)
        .set({ status: 'expired' })
        .where(eq(gatePasses.id, gatePassId));
      throw new Error('Gate pass has expired');
    }

    if (gatePass.userId !== userId) {
      throw new Error('Gate pass mismatch');
    }

    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user || !user.isActive) {
      throw new Error('User not found or inactive');
    }

    const [log] = await db.insert(gatePassLogs).values({
      gatePassId,
      userId,
      scannedBy,
      entryType,
      location,
      notes,
    }).returning();

    return {
      log,
      user: {
        id: user.id,
        fullName: user.fullName,
        studentId: user.studentId,
        department: user.department,
        email: user.email,
      },
      gatePass: {
        validUntil: gatePass.validUntil,
      },
    };
  }

  async getUserLogs(userId: string, limit = 50) {
    const logs = await db.select({
      id: gatePassLogs.id,
      entryType: gatePassLogs.entryType,
      scannedAt: gatePassLogs.scannedAt,
      location: gatePassLogs.location,
      notes: gatePassLogs.notes,
      scannedBy: {
        id: users.id,
        fullName: users.fullName,
      },
    })
      .from(gatePassLogs)
      .leftJoin(users, eq(gatePassLogs.scannedBy, users.id))
      .where(eq(gatePassLogs.userId, userId))
      .orderBy(desc(gatePassLogs.scannedAt))
      .limit(limit);

    return logs;
  }

  async getAllLogs(limit = 100) {
    const logs = await db.select({
      id: gatePassLogs.id,
      entryType: gatePassLogs.entryType,
      scannedAt: gatePassLogs.scannedAt,
      location: gatePassLogs.location,
      notes: gatePassLogs.notes,
      user: {
        id: users.id,
        fullName: users.fullName,
        studentId: users.studentId,
        department: users.department,
      },
    })
      .from(gatePassLogs)
      .leftJoin(users, eq(gatePassLogs.userId, users.id))
      .orderBy(desc(gatePassLogs.scannedAt))
      .limit(limit);

    return logs;
  }
}