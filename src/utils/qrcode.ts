import QRCode from 'qrcode';
import { randomBytes } from 'crypto';

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