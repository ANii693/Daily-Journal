const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const _ = require("lodash");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");

require("dotenv").config();

const homeStartingContent =
  "Lacus vel facilisis volutpat est velit egestas dui id ornare. Semper auctor neque vitae tempus quam. Sit amet cursus sit amet dictum sit amet justo. Viverra tellus in hac habitasse. Imperdiet proin fermentum leo vel orci porta. Donec ultrices tincidunt arcu non sodales neque sodales ut. Mattis molestie a iaculis at erat pellentesque adipiscing. Magnis dis parturient montes nascetur ridiculus mus mauris vitae ultricies. Adipiscing elit ut aliquam purus sit amet luctus venenatis lectus. Ultrices vitae auctor eu augue ut lectus arcu bibendum at. Odio euismod lacinia at quis risus sed vulputate odio ut. Cursus mattis molestie a iaculis at erat pellentesque adipiscing.";
const aboutContent =
  "Hac habitasse platea dictumst vestibulum rhoncus est pellentesque. Dictumst vestibulum rhoncus est pellentesque elit ullamcorper. Non diam phasellus vestibulum lorem sed. Platea dictumst quisque sagittis purus sit. Egestas sed sed risus pretium quam vulputate dignissim suspendisse. Mauris in aliquam sem fringilla. Semper risus in hendrerit gravida rutrum quisque non tellus orci. Amet massa vitae tortor condimentum lacinia quis vel eros. Enim ut tellus elementum sagittis vitae. Mauris ultrices eros in cursus turpis massa tincidunt dui.";
const contactContent =
  "Scelerisque eleifend donec pretium vulputate sapien. Rhoncus urna neque viverra justo nec ultrices. Arcu dui vivamus arcu felis bibendum. Consectetur adipiscing elit duis tristique. Risus viverra adipiscing at in tellus integer feugiat. Sapien nec sagittis aliquam malesuada bibendum arcu vitae. Consequat interdum varius sit amet mattis. Iaculis nunc sed augue lacus. Interdum posuere lorem ipsum dolor sit amet consectetur adipiscing elit. Pulvinar elementum integer enim neque. Ultrices gravida dictum fusce ut placerat orci nulla. Mauris in aliquam sem fringilla ut morbi tincidunt. Tortor posuere ac ut consequat semper viverra nam libero.";

const app = express();

const PORT = process.env.PORT || 3000;

app.set("view engine", "ejs");

app.use(cookieParser());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let posts = [];

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.DB_URL);
    console.log("MongoDB Connected");
  } catch (error) {
    console.log(error);
    process.exit(1);
  }
};

connectDB()
  .then(async () => {
    const adminSchema = new mongoose.Schema({
      name: String,
      password: String,
    });

    const Admin = mongoose.model("Admin", adminSchema);

    const entrySchema = new mongoose.Schema({
      title: String,
      description: String,
    });

    const Entry = mongoose.model("Entry", entrySchema);

    const data = await Entry.find();

    data.forEach((obj) => {
      const post = {
        title: obj.title,
        body: obj.description,
      };
      posts.push(post);
    });

    const isAuthenticated = async (req, res, next) => {
      const { token } = req.cookies;
      if (token) {
        const decoded = jwt.verify(token, process.env.secretkey);

        req.user = await Admin.findById(decoded._id);

        next();
      } else {
        res.redirect("/login");
      }
    };

    app.get("/login", async (req, res) => {
      const admin = await Admin.findOne({ name: "admin" });

      if (!admin) {
        const pass = process.env.pass;
        const hashedPassword = await bcrypt.hash(pass, 10);
        await Admin.create({
          name: "admin",
          password: hashedPassword,
        });
      }

      res.render("login");
    });

    app.post("/login", async (req, res) => {
      const { name, password } = req.body;

      let admin = await Admin.findOne({ name });

      if (!admin) return res.render("login", { message: "Incorrect Username" });

      const isMatch = await bcrypt.compare(password, admin.password);
      if (!isMatch)
        return res.render("login", { name, message: "Incorrect Password" });

      const token = jwt.sign({ _id: admin._id }, process.env.secretkey);

      res.cookie("token", token, {
        httpOnly: true,
        expires: new Date(Date.now() + 60 * 1000),
      });
      res.redirect("/compose");
    });

    app.get("/", function (req, res) {
      res.render("home", { content: homeStartingContent, blog: posts });
    });

    app.get("/about", function (req, res) {
      res.render("about", { content: aboutContent });
    });

    app.get("/contact", function (req, res) {
      res.render("contact", { content: contactContent });
    });

    app.get("/compose", isAuthenticated, function (req, res) {
      res.render("compose");
    });

    app.post("/compose", async function (req, res) {
      const { postTitle, postBody } = req.body;

      await Entry.create({
        title: postTitle,
        description: postBody,
      });

      const post = {
        title: postTitle,
        body: postBody,
      };
      posts.push(post);

      res.redirect("/");
    });

    app.get("/posts/:postTitle", function (req, res) {
      const requestTitle = req.params.postTitle;
      posts.forEach(function (obj) {
        if (_.lowerCase(obj.title) === _.lowerCase(requestTitle)) {
          res.render("post", { postTitle: obj.title, postBody: obj.body });
        }
      });
    });
  })
  .catch((e) => console.log(e));

app.listen(PORT, function () {
  console.log(`server is started on port ${PORT}`);
});
