const express = require('express');
const router = express.Router();
const hmreController = require('../Controllers/hmreController');

router.post('/start', hmreController.startHMRE);
router.post('/clear-db', hmreController.clearDatabase);
router.post('/stop-monitoring', hmreController.stopContinuousMonitoring);  
router.get('/running-processes', hmreController.getRunningProcesses);

module.exports = router; 