//const express = require("express");
const express = require("ultimate-express");
const router = express.Router();
const verifyToken = require("../../../verify-token/verify-token");
const User = require("../../../models/user/user-model");

const uuidv4 = require("uuid/v4");

const loginController = require("../controllers/login-controller");

//router.post('/register', loginController.register);

router.route("/login").post(loginController.login);

// Send reset email to user
router.get("/forgotPassword/:email", loginController.forgotPassword);

// reset password by user clickin the link
router.get("/reset/:token", function (req, res) {
  User.findOne(
    {
      resetPasswordToken: req.params.token,
      resetPasswordExpires: { $gt: Date.now() },
    },
    function (err, user) {
      if (!user) {
        // console.log('error', 'Password reset token is invalid or has expired.');
        return res.redirect("/forgot");
      }
      res.render("reset", {
        user: req.user,
      });
    }
  );
});

router.post("/resetPass", loginController.resetPass);
router.post(
  "/changePassword/:id",
  //  verifyToken,
  loginController.changePassword
);
router.post("/logout", loginController.logout);

module.exports = router;
