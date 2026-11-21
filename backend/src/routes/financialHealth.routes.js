import { Router } from 'express';

import { authenticate } from '../middlewares/authenticate.js';
import * as FinancialHealth from '../models/financialHealth.model.js';

const router = Router();

router.use(authenticate);

router.get('/', async (req, res) => {
  const result = await FinancialHealth.getFinancialHealth(
    req.userId
  );

  return res.json(result);
});

export default router;
