// backend/routes/resourceRoutes.js

const express = require("express");
const router = express.Router();
const { getResources } = require("../controllers/resourceController");

router.post("/", getResources);

module.exports = router;