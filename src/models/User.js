const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  password: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  role: { type: String, default: "普通用戶" },
  Creation_time: { type: Date, default: Date.now },
  introduce: { type: String, default: "這位使用者很懒，沒有介紹" },
  img_path: { type: String, default: "https://fppublicstorage.s3.amazonaws.com/images/1731980939091_blob" },
});

module.exports = mongoose.model("User", userSchema);
