const express = require('express');
const router = express.Router();
const LinkModel = require('../models/linkModel');
const LinkController = require('../controllers/linkController');

module.exports = (pool) => {
  const linkModel = new LinkModel(pool);
  const linkController = new LinkController(linkModel);

  router.post('/', (req, res) => linkController.createLink(req, res));
  router.get('/', (req, res) => linkController.getAllLinks(req, res));
  router.get('/:code', (req, res) => linkController.getLinkByCode(req, res));
  router.delete('/:code', (req, res) => linkController.deleteLink(req, res));

  return router;
};

