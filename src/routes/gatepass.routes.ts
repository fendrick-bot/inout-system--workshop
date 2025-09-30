import { Router } from 'express';
import { GatePassService } from '../services/gatepass.service';
import { authenticate, requireRole, AuthRequest } from '../middleware/auth';
import { validate } from '../middleware/validator';
import { scanQRSchema } from '../validators/gatepass.validator';

const router = Router();
const gatePassService = new GatePassService();

router.use(authenticate);

// Student routes
router.post('/generate', requireRole('student'), async (req: AuthRequest, res, next) => {
  try {
    const gatePass = await gatePassService.createGatePass(req.user!.userId);
    res.status(201).json(gatePass);
  } catch (error: any) {
    if (error.message === 'You already have an active gate pass') {
      return res.status(409).json({ error: error.message });
    }
    next(error);
  }
});

router.post('/refresh', requireRole('student'), async (req: AuthRequest, res, next) => {
  try {
    const gatePass = await gatePassService.refreshGatePass(req.user!.userId);
    res.json(gatePass);
  } catch (error) {
    next(error);
  }
});

router.get('/active', requireRole('student'), async (req: AuthRequest, res, next) => {
  try {
    const gatePass = await gatePassService.getActiveGatePass(req.user!.userId);
    if (!gatePass) {
      return res.status(404).json({ error: 'No active gate pass found' });
    }
    res.json(gatePass);
  } catch (error) {
    next(error);
  }
});

router.get('/logs', requireRole('student'), async (req: AuthRequest, res, next) => {
  try {
    const logs = await gatePassService.getUserLogs(req.user!.userId);
    res.json(logs);
  } catch (error) {
    next(error);
  }
});

// Admin routes
router.post('/scan', requireRole('admin'), validate(scanQRSchema), async (req: AuthRequest, res, next) => {
  try {
    const result = await gatePassService.scanQRCode(
      req.body.qrData,
      req.user!.userId,
      req.body.entryType,
      req.body.location,
      req.body.notes
    );
    res.json(result);
  } catch (error: any) {
    if (error.message.includes('not found') || error.message.includes('expired') || 
        error.message.includes('mismatch') || error.message.includes('Invalid')) {
      return res.status(400).json({ error: error.message });
    }
    next(error);
  }
});

router.get('/logs/all', requireRole('admin'), async (req: AuthRequest, res, next) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const logs = await gatePassService.getAllLogs(limit);
    res.json(logs);
  } catch (error) {
    next(error);
  }
});

export default router;