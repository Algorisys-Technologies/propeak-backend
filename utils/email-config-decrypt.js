const { decrypt } = require("./crypto.server");

function decryptAuth(authentication = [], companyId) {
  if (!Array.isArray(authentication)) return [];

  return authentication.map((auth) => ({
    username: auth.username,
    password: decrypt(auth.password, companyId),
  }));
}

function decryptEmailConfigs(emailConfigs = [], companyId) {
  return emailConfigs.map((config) => {
    const obj = config.toObject ? config.toObject() : config;
    obj.authentication = decryptAuth(obj.authentication, companyId);
    return obj;
  });
}

function decryptSingleEmailConfig(emailConfig, companyId) {
  const obj = emailConfig.toObject ? emailConfig.toObject() : emailConfig;
  obj.authentication = decryptAuth(obj.authentication, companyId);
  return obj;
}

module.exports = {
  decryptAuth,
  decryptEmailConfigs,
  decryptSingleEmailConfig,
};
