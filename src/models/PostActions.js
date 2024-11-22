// models/PostActions.js
const mongoose = require("mongoose");

const postActionsSchema = new mongoose.Schema(
  {
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Post",
      required: true,
      unique: true,
    },
    likes: {
      type: Number,
      default: 0,
    },
    likedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
      },
    ],
    collections: {
      type: Number,
      default: 0,
    },
    collectedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: [],
      },
    ],
    views: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Existing methods...

postActionsSchema.methods.toggleLike = async function (userId) {
  const index = this.likedBy.indexOf(userId);
  if (index === -1) {
    this.likedBy.push(userId);
    this.likes += 1;
  } else {
    this.likedBy.splice(index, 1);
    this.likes -= 1;
  }
  await this.save();
};

postActionsSchema.methods.toggleCollect = async function (userId) {
  const index = this.collectedBy.indexOf(userId);
  if (index === -1) {
    this.collectedBy.push(userId);
    this.collections += 1;
  } else {
    this.collectedBy.splice(index, 1);
    this.collections -= 1;
  }
  await this.save();
};

postActionsSchema.methods.incrementViews = async function () {
  this.views += 1;
  await this.save();
};

// Add to collection
postActionsSchema.methods.addToCollect = async function (userId) {
  if (!this.collectedBy.includes(userId)) {
    this.collectedBy.push(userId);
    this.collections += 1;
    await this.save();
  }
};

// Remove from favorites
postActionsSchema.methods.removeFromCollect = async function (userId) {
  const index = this.collectedBy.indexOf(userId);
  if (index !== -1) {
    this.collectedBy.splice(index, 1);
    this.collections -= 1;
    await this.save();
  }
};

const PostActions = mongoose.model("PostActions", postActionsSchema);
module.exports = PostActions;
