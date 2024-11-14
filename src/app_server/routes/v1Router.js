var express = require('express');
var router = express.Router();
var rmf3controller = require('../v1_Controllers/RMF3Controller');
var rmfppcontroller = require('../v1_Controllers/RMFPPController');

// DATA API

router.get('/:lpar/rmf',  rmf3controller.RMFIIImetrics);

router.get('/:lpar/rmf3/:report', function(req, res, next) {
  // Set headers to accept both JSON and XML
  res.format({
    'application/json': function() {
      rmf3controller.RMFIII(req, res);
    },
    'default': function() {
      rmf3controller.RMFIII(req, res);
    }
  });
});

router.get('/:lpar/rmf3/:report/:apiml',  rmf3controller.RMFIII);

router.get('/:lpar/:rmfpp/:report',  rmfppcontroller.rmfpp);

router.get('/:lpar/:rmfpp/:report/:apiml',  rmfppcontroller.rmfpp);

module.exports = router;