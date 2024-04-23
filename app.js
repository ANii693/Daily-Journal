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
  "Welcome to Daily Journal, your go-to destination for daily inspiration, insightful reflections, and captivating stories. Our mission is to provide you with a platform where you can explore new ideas, express yourself freely, and embark on a journey of self-discovery. Whether you're looking for thought-provoking articles, motivational quotes, or simply a space to unwind and reflect, you'll find it all here at Daily Journal. At Daily Journal, we believe that every day is an opportunity to learn, grow, and make a difference. Our curated collection of articles covers a wide range of topics, from personal development and mindfulness to technology and innovation. Whether you're a seasoned professional or a curious learner, our content is designed to inspire and empower you to reach your full potential.Join us on this journey of exploration and discovery as we navigate the complexities of life, celebrate our triumphs, and learn from our challenges. Together, let's create a community where ideas flourish, creativity thrives, and connections are forged. Welcome to Daily Journal – where every day brings new possibilities and endless opportunities for growth.";
const aboutContent =
  "Hey there, I'm Anirudh Rai, but you can call me Anii or Akhil. I'm a Full-Stack Developer based in Bangalore, India, with a passion for crafting dynamic web applications and implementing on-demand feature additions. Constantly driven by the thrill of exploring new technologies, I'm always on the lookout for innovative solutions to challenges. Collaboration fuels my creativity, and I'm eager to join forces on exciting projects. Currently, I'm diving deep into a three-month training and internship program at Teachnook & Immensphere, where I'm sharpening my skills and expanding my horizons. Let's connect and embark on a journey to create something extraordinary together!";
const contactContent =
  "You can easily get in touch with me through various channels. Drop me an email at anirudhrai503@gmail.com for any inquiries or collaborations. Prefer instant messaging? Reach out to me on WhatsApp at +91 9353777209. If you're interested in checking out my coding projects, head over to my GitHub profile at github.com/ANii693. Want to stay updated on my latest thoughts and musings? Follow me on Twitter at twitter.com/ANii693. And if you're into visual storytelling, feel free to connect with me on Instagram at instagram.com/anii_akhil/. Whatever your preferred platform, I'm here and eager to connect. Looking forward to hearing from you!";

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
