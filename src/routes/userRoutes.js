const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const Post = require("../models/Post");
const PostActions = require("../models/PostActions");

const router = express.Router();
require("dotenv").config();
const { validateToken } = require("../middleware/authMiddleware");
const mongoose = require("mongoose");

// 取得使用者的範例路由
router.get("/", async (req, res) => {
  const posts = await User./*db.collection("users").*/ find(); /*.toArray()*/
  res.json(posts);
});
router.post("/get-user-info", validateToken,
  async (req, res) => {
    const userId = req.userId
    //根据用户id查询用户信息 不顯示出密碼
    const user = await User.findOne({ _id: userId }).select("-password");
    if (!user) {
      return res.json({ status: 404, message: "User not found" });
    }
    // console.log("user:", user) ;
    console.log('已有token自动登录');
    //返回用户信息
    res.json({
      status: 200,
      user
    });
  });
router.post("/get-user",
  async (req, res) => {
    const { userId } = req.body
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
        return res.json({ status: 400, message: "用户名或密码不能为空" });
      }

      const user = await User./*db.collection("users").*/ findOne({
        $or: [{ email: usernameOrEmail }, { username: usernameOrEmail }],
      });

      if (!user) {
        return res.json({ status: 401, message: "用戶名不存在" });
      }
      //驗證
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.json({ status: 401, message: "密码错误" });
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
      res.json({
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
      console.log(error);
      res.json({status: 500, message: "Server error" });
    }
  }
);


//
//userprofile
// 根據ID取得使用者資料
router.get("/userprofile/:userId", validateToken, async (req, res) => {
  const { userId } = req.params;
  console.log("userId:", userId);
  try {
    //驗證用戶ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    // 查找用戶
    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // 查找用戶創建的文章
    const userPosts = await Post.find({ user_id: userId })
      .sort({ Creation_time: -1 }) // 按創建時間降序排序
      .select("-__v -content") // 排除版本和內容字段
      .lean();
    //格式化用戶文章
    const formattedUserPosts = userPosts.map((post) => ({
      postId: post._id, // Ensure postId is included
      title: post.title,
      views: post.views || 0, // Include views, default to 0 if not present
      createdAt: new Date(post.Creation_time).toLocaleString("en-HK", {
        timeZone: "Asia/Hong_Kong",
      }),
    }));
    //查找該用戶收藏過的貼文id
    const postActions = await PostActions.find({ collectedBy: userId });
    const collectedPostIds = postActions.map((action) => action.postId);
    //查找收藏過的貼文
    const collectedPosts = await Post.find({ _id: { $in: collectedPostIds } })
      .select("-__v") // Exclude version field
      .populate("user_id", "username name role") // Optionally populate user information
      .lean()
      .sort({ Creation_time: -1 });
    //格式化收藏貼文
    const formattedCollectedPosts = collectedPosts.map((post) => ({
      postId: post._id,
      title: post.title,
      author: post.user_id.username,
      createdAt: new Date(post.Creation_time).toLocaleString("en-HK", {
        timeZone: "Asia/Hong_Kong",
      }),
      views: post.views || 0, // Include views, default to 0 if not present
      // Include any other needed fields
    }));
    res.json({
      user: {
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        Creation_time: user.Creation_time,
        introduce: user.introduce,
        img_path: user.img_path,
      },
      userPosts: formattedUserPosts,
      collectedPosts: formattedCollectedPosts,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ error: error.message });
  }
});
//更新用戶信息包括密碼在用戶profile界面修改
router.put("/:userId", validateToken, async (req, res) => {
  const { userId } = req.params;
  const { name, email, introduce, img_path, password } = req.body;
  console.log("input userId:", userId);
  try {
    //驗證用戶ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    //確保用戶正在更新自己的信息
    if (req.userId !== userId) {
      return res
        .json({ status: 403, message: "You are not authorized to update this profile" });
    }

    // 查找用戶並更新字段
    const updateData = {
      name,
      email,
      introduce,
      img_path,
    };

    //如果密碼被更新，則加密
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    //更新用戶信息
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, {
      new: true,
      runValidators: true,
    });

    console.log('updatedUser',updatedUser)
    if (!updatedUser) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({
      username: updatedUser.username,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      Creation_time: updatedUser.Creation_time.toLocaleString("en-HK", {
        timeZone: "Asia/Hong_Kong",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }),
      introduce: updatedUser.introduce,
      img_path: updatedUser.img_path,
    });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ error: error.message });
  }
});
// 驗證密碼
router.post("/check-password", validateToken, async (req, res) => {
  // 接收用戶ID和當前密碼
  const { userId, currentPassword } = req.body;

  try {
    // 驗證用戶ID
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ error: "Invalid user ID format" });
    }

    // 查找用戶
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ valid: false, message: "User not found" });
    }

    // 比對密碼
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    // 返回結果返回結果
    return res.json({ valid: isMatch });
  } catch (error) {
    console.error("Error checking password:", error);
    return res.status(500).json({ error: error.message });
  }
});
module.exports = router;
