const express = require('express');
const router = express.Router();
const cacheController = require('../Controllers/cacheController');

router.post('/start', cacheController.startCache);
router.post('/clear-db', cacheController.clearDatabase);
router.post('/stop-monitoring', cacheController.stopContinuousMonitoring);  
router.get('/running-processes', cacheController.getRunningProcesses);

module.exports = router; 