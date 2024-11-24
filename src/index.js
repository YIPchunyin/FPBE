const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const path = require("path");
const connectToDb = require("./db");
const multer = require("multer");
const s3 = require("./middleware/aws-credentials");
const userRoutes = require("./routes/userRoutes");
const postRoutes = require("./routes/postRoutes");
const router = express.Router();
// const { Server } = require("http");
require("dotenv").config();

const app = express();
app.use(cors())
app.options('*', cors()); // 确保所有 OPTIONS 请求都能正确响应
const port = process.env.PORT || 3001;
//connect to DB
connectToDb();

//
//中間件
//
// 允许来自特定来源的请求

// 使用 body-parser 中間件
app.use(bodyParser.urlencoded({ extended: true })); // 設置 extended 為 true
app.use(bodyParser.json());
// 從「public」目錄提供靜態文件
app.use(express.static(path.join(__dirname, "public")));

//插入用戶路由器模版
app.use("/users", userRoutes);

//插入文章路由器模版
app.use("/posts", postRoutes);


// 处理预检请求
router.options('*', cors());
app.get("/", (req, res) => {
  res.send("Hello World!");
});
// 用圖像回應的路由
app.get("/api/:img", (req, res) => {
  const { img } = req.params;
  const imagePath = path.join(__dirname, "../public/file", img); // 根据实际路径更改
  res.sendFile(imagePath);
});
//aw3
const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post("/upload", upload.single("image"), async (req, res) => {
  const params = {
    Bucket: "fppublicstorage",
    Key: `images/${Date.now()}_${req.file.originalname}`,
    Body: req.file.buffer,
    ContentType: req.file.mimetype,
    ACL: "public-read",
  };

  try {
    const data = await s3.uploadFile(params); // 使用 putObject 方法
    // console.log("Upload Success", data);
    console.log(data.imageUrl);
    res.json({ message: "Upload successful", imageUrl: data.imageUrl });
    return data; // 返回数据以便后续使用
  } catch (err) {
    console.error("Error uploading file:", err);
    res.status(500).json({ err: "Failed to upload file" });
  }
});
// 启动服务器
app.listen(port, () => {
  console.log(`Server is running at http://localhost:${port}`);
});
