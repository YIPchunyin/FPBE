// routes/postRoutes.js
const express = require("express");
require("dotenv").config();
const router = express.Router();
const PostController = require("../controllers/postController");
const CommentController = require("../controllers/commentController");
const { validateToken, extractUserId } = require("../middleware/authMiddleware");
// 睇posts
router.get("/", PostController.getAllPosts);
//創建文章
router.post("/create-post", validateToken, PostController.createPost);
//獲取文章數據爲了編輯
router.get("/:postId/edit", extractUserId, PostController.getPostById);
//更新文章
router.post("/:postId/edit", validateToken, PostController.editPost);
//刪除文章
router.post("/:postId/delete", validateToken, PostController.deletePost);
//獲取文章數據
router.get('/:postId/getPostData', extractUserId, PostController.getPostById)
//获取文章评论
router.get('/:postId/comments/:page/:limit', extractUserId, CommentController.getPostComments)
//获取文章通过userid
router.get('/:userId', PostController.getPostsByUser)
// 
router.get('/test/test',PostController.test)
// 根據排序條件查詢post
router.get('/sort/:sort/:order', PostController.getPostsBySort)

//获取文章评论数量
router.get('/:postId/comments/count', extractUserId, CommentController.getPostCommentsCount)
//睇帶有評論的帖子：
router.get("/:postId", extractUserId, PostController.getPostWithComments);
// 評論
// 獲取帖子的評論：/router.get '/'
router.get("/:postId/comments", CommentController.getPostComments);
//////提交評論
router.post("/:postId/comments",validateToken,CommentController.createComment);
////刪除評論
router.post(
  "/:postId/comments/:commentId/delete",
  validateToken,
  CommentController.deleteComment
);
//// Like  點讚評論：
router.post(
  "/:postId/comments/:commentId/like",
  validateToken,
  CommentController.toggleLike
);
//dislike 踩評論
router.post(
  "/:postId/comments/:commentId/dislike",
  validateToken,
  CommentController.toggleDislike
);
///搜索帖子
router.post("/search", PostController.searchPosts);
///獲取文章的相關推薦
router.get("/recommendations/:postId", PostController.getRecommendations);

///根据postId获取所有action状态
router.get("/:postId/actions", extractUserId, PostController.getPostActions);
//// 點讚帖子
router.post("/:postId/like", validateToken, PostController.togglePostLike);
// 收藏帖子
router.post("/:postId/collect", validateToken, PostController.toggleCollect);


module.exports = router;
