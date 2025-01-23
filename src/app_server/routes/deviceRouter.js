const express = require('express');
const router = express.Router();
const deviceController = require('../Controllers/deviceController');

router.post('/start', deviceController.startDevice);
router.post('/clear-db', deviceController.clearDatabase);
router.post('/stop-monitoring', deviceController.stopContinuousMonitoring);  
router.get('/running-processes', deviceController.getRunningProcesses);

module.exports = router; 