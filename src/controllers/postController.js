// controllers/postController.js
const Post = require("../models/Post");
const Comment = require("../models/Comment");
const { formatComment } = require("../utils/responseFormatter");
const natural = require('natural');
const { TfIdf } = natural;
const nodejieba = require('nodejieba');
const mongoose = require("mongoose");
const PostActions = require("../models/PostActions");

class PostController {
  static async test(req, res) {
    //獲取所有post
    const posts = await Post.find();
    //遍歷所有post
    for (let i = 0; i < posts.length; i++) {
      //找出postid對應的 action
      const actions = await PostActions.findOne({ postId: posts[i]._id });
      console.log('after', actions.createdAt)
      actions.createdAt = posts[i].Creation_time;
      console.log('before', actions.createdAt)

      //更新action
      await actions.save();
    }
    res.json({ message: "test success" });
  }
  // 睇posts
  static async getAllPosts(_, res) {
    try {
      //只找出前48篇
      const posts = await Post.find()
        .sort({ Creation_time: -1 })
        .select("_id title img_path Creation_time")
      res.json(posts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      res
        .status(500)
        .json({ message: "Error fetching posts", error: error.message });
    }
  }

  static async getPostsByUser(req, res) {
    const { userId } = req.params;
    try {
      const posts = await Post.find({ user_id: userId })
        .sort({ Creation_time: -1 })
        .populate("user_id", "username name role")
        .select("-__v -content")
      res.json(posts);
    } catch (error) {
      console.error("Error fetching posts by user:", error);
      res
        .status(500)
        .json({ message: "Error fetching posts by user", error: error.message });
    }
  }

  //創建文章
  static async createPost(req, res) {
    try {
      const { title, img_path, content } = req.body;
      const user_id = req.userId;
      const short_content = content.replace(/<[^>]+>/g, "");
      const newPost = new Post({
        title,
        img_path,
        content,
        short_content,
        user_id,
        Creation_time: new Date(),
      });

      console.log("成功創建文章,文章編號：", newPost._id);
      // Save the post
      const savedPost = await newPost.save();
      const newPostAction = new PostActions({
        postId: savedPost._id,
        createdAt: new Date(),
      });
      await newPostAction.save()
      // Log the saved post
      console.log("Saved post:", savedPost);

      // Send response with both message and postId
      res.status(200).json({
        status: 200,
        message: "post_created",
        postId: savedPost._id.toString(),
      });
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({
        message: "cannot_create_newPost",
        error: error.message,
      });
    }
  }

  //單純返回文章和user信息
  static async getPostById(req, res) {
    try {
      const { postId } = req.params;
      const userId = req.userId;
      //找出该userid的数据

      let post = await Post.findById(postId).populate(
        "user_id",
        "username name img_path role"
      );
      if (!post) {
        return res.json({ status: 404, message: "Post not found" });
      }
      let permission = false;
      //如果找到user
      if (userId) {
        const user = await mongoose.model("User").findById(userId);
        if (post.user_id._id.toString() === userId || user.role === "admin") {
          permission = true;
        }
      }
      const postaction = await PostActions.findOne({ postId: post._id });
      await postaction.incrementViews(post._id);
      res.json({ post, permission });
    } catch (error) {
      console.error("Error fetching post by id:", error);
      res.status(500).json({ error: error.message });
    }
  }


  //編輯帖子
  static async editPost(req, res) {
    try {
      const { postId } = req.params;
      const { title, img_path, content } = req.body;
      const userId = req.userId;
      const user = await mongoose.model("User").findById(userId);
      let post = await Post.findOne({ _id: postId });
      if (user.role !== "admin") {
        // 檢查帖子是否存在且用戶是發帖人
        if (!post) {
          post = await Post.findOne({ _id: postId, user_id: userId });
          return res
            .status(404)
            .json({ message: "Post not found or unauthorized" });
        }
      }
      const short_content = content.replace(/<[^>]+>/g, "");
      // 更新帖子
      post.title = title || post.title;
      post.img_path = img_path || post.img_path;
      post.content = content || post.content;
      post.short_content = short_content,
        post.Update_time = new Date();
      const updatedPost = await post.save();
      const populatedPost = await Post.findById(updatedPost._id).populate(
        "user_id",
        "username name role"
      );

      res.json({ status: 200, message: "Post updated successfully", post: populatedPost });
    } catch (error) {
      console.error("Error updating post:", error);
      res
        .status(500)
        .json({ message: "Error updating post", error: error.message });
    }
  }

  //刪除帖子
  static async deletePost(req, res) {
    try {
      let { postId } = req.params;
      postId = new mongoose.Types.ObjectId(postId);
      const userId = req.userId;
      const user = await mongoose.model("User").findById(userId);
      let post = await Post.findOne({ _id: postId });
      const postacion = await PostActions.findOne({ postId: postId });

      if (user.role !== "admin") {
        // 檢查帖子是否存在且用戶是發帖人
        post = await Post.findOne({ _id: postId, user_id: userId });
        if (!post) {
          return res.json({ status: 404, message: "Post not found or unauthorized" });
        }
      }
      // 刪除帖子
      await post.deleteOne();
      await postacion.deleteOne();
      res.json({ status: 200, message: "Post deleted successfully" });
    } catch (error) {
      console.error("Error deleting post:", error);
      res.json({ status: 500, message: "Error deleting post", error: error.message });
    }
  }
  //睇帶有評論的帖子：// router.get("/:postId"
  // controllers/commentController.js
  static async getPostWithComments(req, res) {
    try {
      const { postId } = req.params;
      const post = await Post.findById(postId).populate(
        "user_id",
        "username name img_path name role"
      );

      if (!post) {
        return res.status(404).json({ message: "Post not found" });
      }

      // Get comments for this post with populated user data
      const comments = await Comment.find({ postId })
        .sort({ Creation_time: -1 })
        .populate("user_id", "username name img_path name role");


      // Check if the user is logged in
      let userId = req.userId; // Assuming userId is already set in the request
      const userCommentStatus = {};

      if (userId) {
        // For each comment, check if the user has liked or disliked it
        for (let comment of comments) {
          userCommentStatus[comment._id] = {
            hasLiked: comment.likingUsers.has(userId) || false,
            hasDisliked: comment.dislikingUsers.has(userId) || false,
          };
        }
      }

      // Format comments with user status
      const formattedComments = comments.map(comment => ({
        ...formatComment(comment),
        hasLiked: userCommentStatus[comment._id]?.hasLiked || false,
        hasDisliked: userCommentStatus[comment._id]?.hasDisliked || false,
        dislikes: comment.dislikingUsers.size,
      }));

      const formattedPost = {
        _id: post._id,
        title: post.title,
        content: post.content,
        img_path: post.img_path,
        Creation_time: new Date(post.Creation_time).toLocaleString("en-US", {
          timeZone: "Asia/Shanghai",
        }),
        user: post.user_id
          ? {
            _id: post.user_id._id,
            username: post.user_id.username,
            role: post.user_id.role,
            img_path: post.user_id.img_path,
            name: post.user_id.name,
          }
          : null,
      };
      //阅读量+1
      const postaction = await PostActions.findOne({ postId: post._id });
      await postaction.incrementViews(post._id);
      res.json({
        post: formattedPost,
        comments: formattedComments,
      });
    } catch (error) {
      console.error("Error fetching post with comments:", error);
      res.status(500).json({ error: error.message });
    }
  }



  // 搜索帖子
  static async searchPosts(req, res) {
    try {
      const { keyword } = req.body;  // 从请求体中获取关键字
      console.log(`Searching for keyword: ${keyword}`);
      // 使用正则表达式进行模糊匹配
      const regex = new RegExp(keyword, 'i');  // 'i' 表示不区分大小写
      // 查询符合条件的帖子  模糊查询
      const posts = await Post.find(
        { $or: [{ title: regex }, { short_content: regex }] }
      )
        .sort({ Creation_time: -1 })  // 按创建时间降序排序
        .populate("user_id", "username name role");  // 填充用户信息
      // 返回搜索结果
      res.json({
        status: 200,
        message: "Search completed successfully",
        posts
      });
    } catch (error) {
      console.error("Error searching posts:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // 获取一篇帖子所有的action状态byPostId
  static async getPostActions(req, res) {
    try {
      const { postId } = req.params;
      let userId = req.userId;
      const objectIdPostId = new mongoose.Types.ObjectId(postId);
      let postAction = await PostActions.findOne({ postId: objectIdPostId });
      if (!postAction) {
        //add
        const newPostAction = new PostActions({
          postId: objectIdPostId,
        });
        await newPostAction.save()
        postAction = await PostActions.findOne({ postId: objectIdPostId });
      }
      // 如果userid在likedBy中，返回true
      let isLiked = postAction.likedBy.includes(userId);
      // 如果userid在collectedBy中，返回true
      let isCollected = postAction.collectedBy.includes(userId);
      //返回postId、点赞量、收藏量、瀏覽量、
      res.json({
        postId,
        likes: postAction.likes,
        collections: postAction.collections,
        views: postAction.views,
        isLiked,
        isCollected,
      });
    } catch (error) {
      console.error("Error fetching post actions:", error);
      res.status(500).json({ error: error.message });
    }
  }

  // 點讚貼文
  static async togglePostLike(req, res) {
    try {
      const { postId } = req.params;
      const userId = req.userId;
      // 轉換為 ObjectId
      const objectIdPostId = new mongoose.Types.ObjectId(postId);

      // 使用 findOne 而不是 find
      let postAction = await PostActions.findOne({ postId: objectIdPostId });

      // 如果不存在，則創建新的 PostActions
      if (!postAction) {
        postAction = new PostActions({
          postId: objectIdPostId,
          likes: 0,
          collections: 0,
          views: 0,
          likedBy: [],
          collectedBy: [],
        });
        await postAction.save();
        console.log("Created new postAction:", postAction);
      }

      await postAction.toggleLike(userId);
      res.json({
        status: 200,
        message: "Like toggled",
        likes: postAction.likes,
        hasLiked: postAction.likedBy.includes(userId),
      });
    } catch (error) {
      res.status(500).json({ message: "Server error", error });
    }
  }


  // 收藏
  // Toggle Collection (Favorite/Unfavorite)
  static async toggleCollect(req, res) {
    try {
      const { postId } = req.params;
      let userId = req.userId; // Extract userId from request
      userId = new mongoose.Types.ObjectId(userId);
      const objectIdPostId = new mongoose.Types.ObjectId(postId);
      let postAction = await PostActions.findOne({ postId: objectIdPostId });
      if (!postAction) {
        postAction = new PostActions({
          postId: objectIdPostId,
          likes: 0,
          collections: 0,
          views: 0,
          likedBy: [],
          collectedBy: [],
        });
        await postAction.save();
        return res.json({ status: 200, message: "PostAction created" });
      }
      // Check if the userId already exists in collectedBy
      const index = postAction.collectedBy.indexOf(userId);
      if (index === -1) {
        // Add to collections
        await postAction.addToCollect(userId);
        const collections = postAction.collectedBy.length;
        return res.json({
          status: 200,
          message: "Added to favorites",
          postId,
          collections,
          isCollected: true,
        });
      } else {
        // Remove from collections
        await postAction.removeFromCollect(userId);
        const collections = postAction.collectedBy.length;
        return res.json({
          status: 200,
          message: "Removed from favorites",
          postId,
          collections,
          isCollected: false,
        });
      }
    } catch (error) {
      res.status(500).json({ status: 500, message: "Server error", error });
    }
  }

  // sort
  static async getPostsBySort(req, res) {
    const { sort, order } = req.params;
    const orderNum = order === 'desc' ? -1 : 1;
    console.log(sort, orderNum)
    let posts = null;
    //sort: 1: 按views排序 2: 按likes排序 3: 按collections排序
    if (sort == 'views') {
      posts = await PostActions.find()
        .sort({ views: orderNum })
        .populate("postId", "title img_path content user_id Creation_time");
    }
    else if (sort == 'likes') {
      posts = await PostActions.find()
        .sort({ likes: -1 })
        .populate("postId", "title img_path content user_id Creation_time");
    }
    else if (sort == 'collections') {
      posts = await PostActions.find()
        .sort({ collections: orderNum })
        .populate("postId", "title img_path content user_id Creation_time");
    }
    else {
      posts = await Post.find()
        .sort({ Creation_time: -1 })
        .populate("user_id", "username name role")
        .select("-__v -content")
      return res.json(posts);
    }
    const jsonPosts = posts.map(post => {
      if (!post.postId) {
        // console.warn(`Missing postId for post: ${JSON.stringify(post)}`);
        return null;
      }
      return {
        _id: post.postId._id,
        title: post.postId.title,
        img_path: post.postId.img_path,
        content: post.postId.content,
        user_id: post.postId.user_id,
        Creation_time: new Date(post.postId.Creation_time).toLocaleString("en-US", {
          timeZone: "Asia/Shanghai",
        }),
      };
    }).filter(result => result !== null); // 过滤掉无效的结果
    res.json(jsonPosts);
  }

  // 获取post的相关推荐
  static async getRecommendations(req, res) {
    const { postId } = req.params;

    // 获取所有帖子以便进行文本相似度比较
    const posts = await Post.find();

    // 获取目标帖子的内容
    const targetPost = await Post.findById(postId);
    if (!targetPost) {
      return res.status(404).json({ error: 'Post not found' });
    }

    const similarities = [];

    // 计算该post与其他所有帖子的文本相似度
    for (let i = 0; i < posts.length; i++) {
      if (posts[i]._id.toString() !== postId) { // 排除自身
        const similarity = calculateJaccardSimilarity(targetPost.short_content, posts[i].short_content);
        similarities.push({
          index: i,
          similarity,
        });
      }
    }

    // 将相似度排序并过滤掉相似度为零的帖子
    const sortedRecommendations = similarities
      .filter(item => item.similarity > 0) // 过滤掉相似度为零的帖子
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5) // 取出前五个最相似的帖子
      .map(({ index, similarity }) => ({
        _id: posts[index]._id,
        title: posts[index].title,
        img_path: posts[index].img_path,
        similarity,
      }));

    // 返回结果
    res.json({
      recommendations: sortedRecommendations,
    });
  }

}

// 计算 Jaccard 相似度的函数
function calculateJaccardSimilarity(textA, textB) {
  const setA = new Set(segmentText(textA)); // 使用分词处理
  const setB = new Set(segmentText(textB));
  const intersection = new Set([...setA].filter(x => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size; // 返回 Jaccard 相似度
}

// 更新分词函数
function segmentText(text) {
  const englishWords = text.split(/\W+/).filter(Boolean); // 英文分词
  const chineseWords = nodejieba.cut(text); // 使用 nodejieba 进行中文分词
  return [...englishWords, ...chineseWords]; // 合并分词结果
}
module.exports = PostController;
