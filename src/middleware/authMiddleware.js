//匯入和環境變數：
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_TOKEN;
//中介件功能
const validateToken = (req, res, next) => {
  const authHeader = req.headers['authorization']; // 获取 Authorization 头
  if (!authHeader) {
    return res.status(403).json({ message: "Token is required" });
  }
  const token = authHeader.split(' ')[1]; // 提取 Bearer token
  if (!token) {
    return res.status(403).json({ message: "Token is required" });
  }
  // 验证 token
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.json({ status: 401, message: "Invalid token" });
    }
    req.userId = decoded.userId; // 将 userId 附加到请求对象
    next(); // 继续处理请求
  });
};
const extractUserId = (req, res, next) => {
  const authHeader = req.headers['authorization']; // 获取 Authorization 头
  if (!authHeader) {
    req.userId = false; // 如果 token 不存在，设置 userId 为 false
    return next(); // 继续处理请求
  }
  const token = authHeader.split(' ')[1]; // 提取 Bearer token
  if (!token) {
    req.userId = false; // 如果 token 不存在，设置 userId 为 false
    return next(); // 继续处理请求
  }
  // 验证 token
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) {
    req.userId = false; // 如果没有提供 token，设置 userId 为 false
    } else {
      req.userId = decoded.userId; // 将 userId 附加到请求对象
    }
    next(); // 继续处理请求
  });
};
module.exports = { validateToken, extractUserId };
