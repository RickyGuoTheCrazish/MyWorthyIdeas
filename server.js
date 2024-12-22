const express = require("express");
const app = express();
const cors = require("cors");


require("dotenv").config();
const port = process.env.PORT || 6001;
const path = require("path")
const corsOptions = {
  // origin: 'https://prizeboxmatching2-ae9a0ce954b9.herokuapp.com/'
  origin: ['https://prizevaultoperatorpanel-8e104cfe7c31.herokuapp.com', 'https://prizeboxuser.herokuapp.com', 'https://prizeboxmatchinginstance2-28f86e5c6786.herokuapp.com/'],

};
app.use(cors(corsOptions))
app.use(express.json());

// get driver connection

 
app.use(express.static(path.join(__dirname, "client", "build")))
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "build", "index.html"));
});

app.listen(port, () => {
  
  
});