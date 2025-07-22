const User = require("../../../models/user/user-model");
const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const async = require("async");
const config = require("../../../config/config");
const AccessRight = require("../../../models/access-right/access-right-model");
const { sendEmail } = require("../../../common/mailer");
const {
  generateAccessToken,
  generateRefreshToken,
  decodeToken,
} = require("../../../verify-token/token-management");
const { ACCESS_TOKEN, REFRESH_TOKEN } = require("../../../common/const");
const Token = require("../../../models/Token/token");
const tokenController = require("../../../controllers/token/token-controller");
const access = require("../../../check-entitlements");
const { logError, logInfo } = require("./../../.././common/logger");
const bcrypt = require("bcrypt");
const saltRounds = 10;
const errors = {
  REGISTER_EMAIL_TAKEN: "Email is unavailable",
  RESET_PASSWORD: "An error has occurred while resetting password",
  REGISTER_GENERAL_ERROR: "An error has occurred while adding/updating user",
  LOGIN_INVALID: "Invalid Email/Password combination",
  LOGIN_GENERAL_ERROR: "Invalid user credentials",
  RESET_EXPIRE: "Your link has expired, kindly reset again",
  PASSWORDS_DONT_MATCH: "Passwords do not match",
  LOGIN_GENERAL_ERROR_DELETE: "An error has occurred while deleting user",
  NOT_AUTHORIZED: "You are not authorized",
  ACTIVE_ERROR: "Your Account is Deactivated",
  LOGIN_LOCKED_ERROR:
    "Your Account has been Locked. Please reset your password to login again.",
  RESET_PASSWORD_ERROR:
    "Your Account has been locked please reset password After One hour",
};
const Company = require("../../../models/company/company-model")

let count = 0;
let isLocked = false;

exports.login = async function (req, res) {
  console.log("in login", req.body);

  if (!req.body.email || !req.body.password) {
    return res.json({ err: errors.LOGIN_INVALID });
  }

  try {
    const user = await User.findOne({ email: req.body.email, companyId: req.body.companyId, isActive: true })
    .select('+password');

    console.log(user, "user")

    if (!user) {
      return res.json({ err: errors.LOGIN_GENERAL_ERROR });
    }

    user.comparePassword(req.body.password, async (err, isMatch) => {
      if (err) {
        return res.json({ err: errors.LOGIN_GENERAL_ERROR });
      }

      if (!isMatch) {
        user.loginAttempts = (user.loginAttempts || 0) + 1;

        if (user.loginAttempts >= config.loginAttemptCount) {
          await lockUserAccount(user.email);
          return res.json({ err: errors.LOGIN_LOCKED_ERROR });
        } else {
          await user.save();
          return res.json({ err: errors.LOGIN_INVALID });
        }
      }

      user.loginAttempts = 0;
      await user.save();

      const [owner, company] = await Promise.all([
        User.findOne({ role: "OWNER", companyId: req.body.companyId }, '_id').lean(),
        Company.findOne({ _id: req.body.companyId }, 'companyName logo').lean()
      ]);
      const userResponse = {
        _id: user._id,
        name: user.name,
        role: user.role,
        email: user.email,
        companyId: user.companyId,
        profilePicture: user.profilePicture,
        ownerId: owner ? owner._id : "",
        isGeoTrackingEnabled: user.isGeoTrackingEnabled,
        companyName: company.companyName,
        logo: company.logo
      };

      const tokenContent = {
        _id: user._id,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        profilePicture: user.profilePicture,
      };

      console.log("tokenContent", tokenContent);

      const [token, refreshToken] = await Promise.all([
        generateAccessToken(tokenContent),
        generateRefreshToken(tokenContent)
      ]);

      res.setHeader(ACCESS_TOKEN, token);
      res.setHeader(REFRESH_TOKEN, refreshToken);

      await tokenController.saveRefreshToken(token, refreshToken, user._id);

      if (user.isLocked) {
        return res.json({ err: errors.LOGIN_LOCKED_ERROR });
      } else {
        return res.json({ success: true, user: userResponse });
      }
    });
  } catch (err) {
    console.error(err);
    return res.json({ success: false, err: errors.LOGIN_GENERAL_ERROR });
  }
};

async function lockUserAccount(email) {
  try {
    await User.findOneAndUpdate(
      { email, isActive: true },
      { $set: { isLocked: true, lockedDateTime: new Date() } },
      { new: true }
    );
  } catch (err) {
    console.error("Error locking user account:", err);
  }
}
exports.forgotPassword = async function (req, res, next) {
  console.log("Forgot password controller here...");

  try {
    const userEmail = req.params.email;
    console.log("Received email:", userEmail);

    const user = await User.findOne({ email: userEmail });
    if (!user) {
      console.log("User not found for email:", userEmail);
      return res.json({ err: errors.LOGIN_GENERAL_ERROR });
    }

    const userId = user._id;
    const resetLink = `${config.link}reset/${userId}`;
    console.log("Generated reset link:", resetLink);

    const mailOptions = {
      to: user.email,
      from: config.from,
      subject: "Project Management System - Password Reset",
      html: `
        Hi,<br><br>
        You are receiving this because you (or someone else) have requested the reset of the password for your account.<br>
        Please click on the following link, or paste this into your browser to complete the process:<br>
        <a href="${resetLink}">${resetLink}</a><br><br>
        If you did not request this, please ignore this email and your password will remain unchanged.<br><br>
        Thanks,<br>
        ProPeak Team
      `,
    };
    const response = await sendEmail(mailOptions);
    if (response.response) {
      console.error("Error sending email:", response);
      logError(
        response,
        "userController.forgotPassword - Error occurred while sending email " +
          mailOptions.to
      );
      return res.json({ err: "Error sending reset email" });
    } else {
      console.log("Email sent successfully to:", mailOptions.to);
      res.json({
        msg: `An e-mail has been sent to ${mailOptions.to} with further instructions.`,
      });
      logInfo(
        "userController.forgotPassword - An e-mail has been sent to " +
          mailOptions.to +
          " with further instructions."
      );
    }
  } catch (err) {
    console.error("Error in forgotPassword controller:", err);
    next(err);
  }
};

exports.resetPass = async (req, res) => {
  try {
    console.log(req.body, "request body ...............");

    const { userId, password, confirmPassword } = req.body;

    const user = await User.findById(userId);

    if (!user) {
      return res.json({ err: "Invalid user" });
    }

    if (password !== confirmPassword) {
      return res.json({ err: errors.PASSWORDS_DONT_MATCH });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    user.password = hashedPassword;
    user.isLocked = false;

    const result = await user.save();
    console.log(result, "result.................");

    res.json({
      success: true,
      msg: "Successfully updated!",
      result: {
        _id: result._id,
        name: result.name,
        role: result.role,
        email: result.email,
        companyId: result.companyId,
      },
    });
  } catch (err) {
    console.error(err);
    res.json({ err: errors.RESET_PASSWORD });
  }
};

exports.changePassword = async (req, res) => {
  try {
    console.log(req.params, "request body..............");
    console.log("change password controller...................");

    const { newPassword, newConfirmPassword } = req.body;
    const userId = req.params.id;
    console.log(userId, "userId...............");
    const user = await User.findById(userId);

    if (!user) {
      return res.json({ err: errors.INVALID_USER });
    }
    if (newPassword !== newConfirmPassword) {
      return res.json({ err: errors.PASSWORDS_DONT_MATCH });
    }
    bcrypt.hash(newPassword, saltRounds, async (err, hashedPassword) => {
      if (err) {
        return res.json({ err: errors.PASSWORD_HASH_FAILED });
      }
      user.password = hashedPassword;

      const result = await user.save();
      res.json({
        success: true,
        msg: "Password updated successfully!",
        result: {
          _id: result._id,
          name: result.name,
          role: result.role,
          email: result.email,
          companyId: result.companyId,
        },
      });
    });
  } catch (err) {
    console.error(err);
    res.json({ err: errors.RESET_PASSWORD });
  }
};

exports.logout = async function (req, res) {
  try {
    const token = req.headers[ACCESS_TOKEN];
    await tokenController.removeToken(token);
    res.json({
      success: true,
      msg: "Token deleted.",
      token: "",
      refreshToken: "",
    });
  } catch (err) {
    console.error("Logout error:", err);
  }
};
