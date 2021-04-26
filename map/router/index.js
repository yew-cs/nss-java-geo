const express = require("express");
const fetch = require("node-fetch");

module.exports = (app) => {
	app.use("/nsc/map", express.static("public"));

	app.route("/nsc/config/*").get((request, response) => {
		fetch("https://riz-inno-sbx-sap-nss-nsaa-srv.cfapps.us10.hana.ondemand.com/netgeoconfig/get(clientId='76785e66-3032-4a27-b53f-4373dd135ce0')")
			.then(parseResponse)
			.then(json => {
				response.setHeader("content-type", "application/json");
				response.send(json);
			});
	});
};

const parseResponse = (response) => {
	if (response.status === 200) {
		return response.json();
	} else {
		throw response;
	}
};