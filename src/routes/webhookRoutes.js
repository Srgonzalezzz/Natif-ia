import express from 'express';
import webhookController from '../controllers/webhookController.js';

const router = express.Router();

router.get('/webhook', webhookController.verifyWebhook);
router.post('/webhook', webhookController.handleIncoming);

export default router;
