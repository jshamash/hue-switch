// https://github.com/peter-murray/node-hue-api
var hue = require("node-hue-api"),
	rp = require('request-promise'),
	moment = require('moment'),
	dash_button = require('node-dash-button'),
	Hs100Api = require('hs100-api'),
	hs100client = new Hs100Api.Client(),
	config = require('config');

// Time between successive dash firings that must be exceeded in order to send a request
var THRESHOLD_SECONDS = config.get('constants.thresholdSeconds');
// Sometimes the hue api responds with success but does not take action; retrying seems to fix.
var RETRY = config.get('constants.retry');

var dash = dash_button(config.get('dash.mac'));

var date;

var hueConfig = config.get('hue');
var groupUrl = `http://${hueConfig.ip}/api/${hueConfig.key}/groups/${hueConfig.group}`;


var plug;
hs100client.startDiscovery().on('plug-new', (newPlug) => {
	plug = newPlug;
});

dash.on("detected", function() {
	console.log("detected!");
	var newDate = moment();
	if (date && newDate.diff(date, 'seconds') <= THRESHOLD_SECONDS) {
		console.log("ignoring");
		return;
	}
	date = newDate;
	isOn()
		.then(function(wasOn) {
			if (wasOn) {
				return retry(RETRY, turnOff).then(console.log('turned off'));
			} else {
				return retry(RETRY, turnOn).then(console.log('turned on'));
			}
		})
		.catch((err) => console.log(err));
});

function isOn() {
	return rp({
		uri: groupUrl,
		json: true
	}).then((response) => {
		console.log(response);
		return response.state.all_on;
	})
}

function turnOn() {
	return rp({
		method: 'PUT',
		uri: groupUrl + '/action',
		body: {
			on: true,
			scene: hueConfig.scene,
			bri: hueConfig.brightness,
		},
		json: true
	}).then((response) => {
		console.log(response);
		if (plug) plug.setPowerState(true);
	})
}

function turnOff() {
	return rp({
		method: 'PUT',
		uri: groupUrl + '/action',
		body: {
			on: false
		},
		json: true
	}).then((response) => {
		console.log(response);
		if (plug) plug.setPowerState(false);
	})
}

function retry(n, promise) {
	console.log("Attempt: " + n);
	if (n <= 1) return promise();
	return promise().then(retry(n - 1, promise));
}