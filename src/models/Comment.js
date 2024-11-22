const mongoose = require("mongoose");

const CommentSchema = new mongoose.Schema({
  postId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Post",
    required: true,
    index: true,
  },
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
    index: true,
  },
  content: {
    type: String,
    required: true,
  },
  likes: {
    type: Number,
    default: 0,
  },
  // 用於快速查詢點讚狀態
  likingUsers: {
    type: Map,
    of: Boolean,
    default: new Map(),
  },
  // 踩數
  dislikes: {
    type: Number,
    default: 0,
  },
  // 用於快速查詢踩狀態
  dislikingUsers: {
    type: Map,
    of: Boolean,
    default: new Map(),
  },
  //
  Creation_time: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

CommentSchema.index({ postId: 1, Creation_time: -1 });

module.exports = mongoose.model("Comment", CommentSchema);
