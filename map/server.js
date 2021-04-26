"use strict";

const bodyParser = require("body-parser");
const express = require("express");
const port = process.env.PORT || 3000;
const app = express();
const router = require("./router");
const logger = require("morgan");
const cors = require("cors");

// log requests
app.use(logger("dev"));

app.use(cors());

app.use(bodyParser.urlencoded({
	extended: true
}));
app.use(bodyParser.json());

router(app);

app.listen(port, () => console.log(`Your server is running on port ${port}`)); // eslint-disable-line no-console

module.exports = app;