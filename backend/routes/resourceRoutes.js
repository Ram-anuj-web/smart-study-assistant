// backend/routes/resourceRoutes.js

const express = require("express");
const router = express.Router();
const { getResources } = require("../controllers/resourceController");
const { validateQuery } = require("../services/resourceService");

// Middleware: validate topic before hitting the controller
router.post("/", (req, res, next) => {
  const { topic } = req.body;

  try {
    validateQuery(topic);
    next(); // topic is clean — pass to getResources
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

router.post("/", getResources);

module.exports = router;