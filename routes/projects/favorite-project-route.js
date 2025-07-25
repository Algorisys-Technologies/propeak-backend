//const express = require('express');
const express = require("ultimate-express");
const router = express.Router();
const verifyToken = require("../../verify-token/verify-token");
var favoriteProjectController = require("../../controllers/project/favorite-project-controller");
const verifyAppLevelAccess = require("../../verify-app-level-access/verify-app-level-access");

// create favorite Project
router.post("/", favoriteProjectController.toggleFavoriteProject);

//get All Favorite Project
router.get("/", favoriteProjectController.getFavoriteProjects);

//get Favorite Projects -
router.post("/projects", favoriteProjectController.getAllProjects);

//delete/update favorite

router.post(
  "/updatefavoriteprojects",
  favoriteProjectController.updateFavoriteProject
);

module.exports = router;
