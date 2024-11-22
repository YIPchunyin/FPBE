// utils/responseFormatter.js
const formatComment = (comment) => ({
  _id: comment._id,
  content: comment.content,
  likes: comment.likes,
  permission : comment.permission,
  Creation_time: new Date(comment.Creation_time).toLocaleString("en-US", {
    timeZone: "Asia/Shanghai",
  }),
  user: comment.user_id
    ? {
        _id: comment.user_id._id,
        username: comment.user_id.username,
        role: comment.user_id.role,
        img_path: comment.user_id.img_path,
        name: comment.user_id.name,
      }
    : null,
});
module.exports = {
  formatComment,
};
