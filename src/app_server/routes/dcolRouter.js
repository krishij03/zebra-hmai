const express = require('express');
const router = express.Router();
const dcolController = require('../Controllers/dcolController');

router.post('/start', dcolController.startDCOL);
router.post('/clear-db', dcolController.clearDatabase);
router.post('/stop-monitoring', dcolController.stopContinuousMonitoring);  
router.get('/running-processes', dcolController.getRunningProcesses);

module.exports = router; 