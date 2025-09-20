//const express = require("express");
const express = require("ultimate-express");
const router = express.Router();
const projectTypeController = require("../../controllers/project-types/project-type-controller");

router.post("/companyId", projectTypeController.get_project_types_by_company);
router.post("/select-project-types", projectTypeController.select_project_types);
router.post("/add", projectTypeController.create_project_type);
router.put("/:id", projectTypeController.update_project_type);
router.post("/:id", projectTypeController.delete_project_type);

module.exports = router;
