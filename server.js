const express = require("express");
require("dotenv").config();
const authProtecter = require("./middlewares/auth");

const ideaRouter = require("./routes/ideaRouter");
const userRouter = require("./routes/userRouter");

const app = express();
const cors = require("cors");



const port = process.env.PORT || 6001;
const path = require("path")
const corsOptions = {
  // origin: 'https://prizeboxmatching2-ae9a0ce954b9.herokuapp.com/'
  origin: ['https://prizevaultoperatorpanel-8e104cfe7c31.herokuapp.com', 'https://prizeboxuser.herokuapp.com', 'https://prizeboxmatchinginstance2-28f86e5c6786.herokuapp.com/'],

};
app.use(cors(corsOptions))
app.use(express.json());

// get driver connection
app.use("/api/ideas", authProtecter, ideaRouter);

app.use("/api/users", authProtecter, userRouter);

app.use(express.static(path.join(__dirname, "client", "build")))
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "build", "index.html"));
});

app.listen(port, () => {
  
  
});