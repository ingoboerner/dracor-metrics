const express = require('express');
const {name, version} = require('../package.json');

const router = express.Router();

/* GET home page. */
// eslint-disable-next-line no-unused-vars
router.get('/', (req, res, next) => {
  res.json({name, version});
});

module.exports = router;
