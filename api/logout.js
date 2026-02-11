const { clearCookie } = require("./_lib.js");

module.exports = async (req, res) => {
  clearCookie(res, "sf_session");
  res.writeHead(302, { Location: "/" });
  res.end();
};