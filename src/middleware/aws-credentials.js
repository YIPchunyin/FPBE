// aws-credentials.js
const { S3 } = require("@aws-sdk/client-s3");
require("dotenv").config();

const s3 =  new S3({
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
  region: process.env.AWS_REGION,
});

// 上传文件的函数
async function uploadFile(params) {
  try {
    const data = await s3.putObject(params); // 使用 putObject 方法
    // console.log("Upload Success", data); // 输出上传成功的信息

    // 构造 S3 对象的 URL
    const imageUrl = `https://${params.Bucket}.s3.amazonaws.com/${params.Key}`;
    console.log("File URL:", imageUrl); // 输出文件 URL
    data.imageUrl = imageUrl
    // console.log("data:", data)
    return data; // 返回文件 URL
  } catch (err) {
    console.error("Error uploading file", err);
    throw err; // 抛出错误以便捕获
  }
}
module.exports = { s3, uploadFile };