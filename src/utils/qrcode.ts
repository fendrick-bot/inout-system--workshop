import QRCode from 'qrcode';
import { randomBytes } from 'crypto';
import path from 'path';

export const generateQRData = (userId: string, gatePassId: string): string => {
  const timestamp = Date.now();
  const random = randomBytes(16).toString('hex');
  return JSON.stringify({
    userId,
    gatePassId,
    timestamp,
    signature: random,
  });
};

export const generateQRCodeImage = async (data: string): Promise<string> => {
  return await QRCode.toDataURL(data, {
    errorCorrectionLevel: 'H',
    type: 'image/png',
    width: 300,
  });
};

export const saveQRCodeImage = async (data: string, gatePassId: string): Promise<string> => {
  const fileName = `qr_${gatePassId}_${Date.now()}.png`;
  const filePath = path.join(process.cwd(), 'public', 'qrcodes', fileName);
  await QRCode.toFile(filePath, data, {
    errorCorrectionLevel: 'H',
    type: 'png',
    width: 300,
  });
  return `/qrcodes/${fileName}`;
};