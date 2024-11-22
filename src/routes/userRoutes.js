const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const router = express.Router();
require("dotenv").config();
const { validateToken } = require("../middleware/authMiddleware");

// 取得使用者的範例路由
router.get("/", async (req, res) => {
  const posts = await User./*db.collection("users").*/ find(); /*.toArray()*/
  res.json(posts);
});
router.post("/get-user-info",validateToken,
  async (req, res) => {
    const userId = req.userId
    //根据用户id查询用户信息 不顯示出密碼
    const user = await User.findOne({ _id: userId }).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    // console.log("user:", user);
    console.log('已有token自动登录');
    //返回用户信息
    res.json({
      status: 200,
      user
    });
  });
  router.post("/get-user",
    async (req, res) => {
      const {userId} = req.body
      //根据用户id查询用户信息 不顯示出密碼
      const user = await User.findOne({ _id: userId }).select("-password");
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      //返回用户信息
      res.json({
        status: 200,
        user
      });
    });

// 注冊用戶
router.post("/Create-user", async (req, res) => {
  let { username, name, password, email } = req.body;

  console.log("Creating user:", { username, email });
  try {
    // 验证输入
    if (!username || !password || !email) {
      return res.status(400).json({ message: "All fields are required" });
    }

    // 通过电子邮件检查现有用户
    let existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "邮箱已存在" });
    }

    // 通过用户名检查现有用户
    existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(409).json({ message: "用户名已存在" });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({
      username,
      name,
      password: hashedPassword, // 加密
      email,
      role: "普通用户",
      Creation_time: new Date(),
    });

    // 保存用户
    await user.save();
    console.log("User created successfully");

    // 生成 JWT token
    const token = jwt.sign(
      { userId: user._id, username: user.username }, 
      process.env.JWT_TOKEN,
      { expiresIn: "10h" }
    );

    // 返回成功消息和 token
    res.json({
      status: 200,
      message: "user_created",
      token: token, // 返回生成的 token
      data: {
        username: user.username,
        email: user.email,
        _id: user._id,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error" });
  }
});
//用戶登入
router.post(
  "/Check-login",
  /*validateToken,*/
  async (req, res) => {
    let { usernameOrEmail, password } = req.body;
    try {
      if (!usernameOrEmail || !password) {
        return res.status(400).json({ message: "用户名或密码不能为空" });
      }

      const user = await User./*db.collection("users").*/ findOne({
        $or: [{ email: usernameOrEmail }, { username: usernameOrEmail }],
      });

      if (!user) {
        return res.status(401).json({ message: "用户名不存在" });
      }
      //驗證
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(401).json({ message: "密码错误" });
      }

      //試token key
      if (!process.env.JWT_TOKEN) {
        console.error("JWT_TOKEN is not defined in the environment variables.");
        process.exit(1); // Stop the server if JWT_TOKEN is not set
      }
      const token = jwt.sign(
        { userId: user._id, username: user.username },
        process.env.JWT_TOKEN,
        { expiresIn: "10h" }
      );
      console.log("username:", user.username, "token:", token);
      res.status(200).json({
        status: 200,
        message: "登入成功",
        data: {
          username: user.username,
          email: user.email,
          _id: user._id,
        },
        token: token,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

module.exports = router;
