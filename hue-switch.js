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

var hs100config = config.get('hs100');
var plug = hs100client.getPlug({
	host: hs100config.ip,
	timeout: hs100config.timeout,
});

dash.on("detected", function() {
	console.log("detected!");
	var newDate = moment();
	if (date && newDate.diff(date, 'seconds') <= THRESHOLD_SECONDS) {
		console.log("ignoring");
		return;
	}
	date = newDate;
	isOn().then(wasOn => {
		if (wasOn) {
			return retry(RETRY, turnOff).then(console.log('turned off'));
		} else {
			return retry(RETRY, turnOn).then(console.log('turned on'));
		}
	}).catch(err => console.log("ERROR: " + err));
});

function isOn() {
	return rp({
		uri: groupUrl,
		json: true,
		timeout: hueConfig.timeout,
	}).then(response => {
		return response.state.all_on;
	}).catch(reason => {
		return plug.getPowerState().catch(reason => {
			return Promise.reject("Couldn't get power state from Hue or HS100");
		});
	});
}

function turnOn() {
	var plugOn = plug.setPowerState(true).catch(reason => {
		return Promise.reject("HS100 failure: " + reason);
	});

	var hueOn = rp({
		method: 'PUT',
		uri: groupUrl + '/action',
		body: {
			on: true,
			scene: hueConfig.scene,
			bri: hueConfig.brightness,
		},
		json: true,
		timeout: hueConfig.timeout,
	}).catch(reason => {
		return Promise.reject("Hue failure: " + reason);
	});

	return Promise.all([plugOn, hueOn])
}

function turnOff() {
	var plugOff = plug.setPowerState(false).catch(reason => {
		return Promise.reject("HS100 failure: " + reason);
	});

	var hueOff = rp({
		method: 'PUT',
		uri: groupUrl + '/action',
		body: {
			on: false
		},
		json: true,
		timeout: hueConfig.timeout,
	}).catch(reason => {
		return Promise.reject("Hue failure: " + reason);
	});

	return Promise.all([plugOff, hueOff])
}

function retry(n, promise) {
	console.log("Attempts remaining: " + n);
	if (n <= 1) return promise();
	return promise().catch(reason => {
		return retry(n - 1, promise)
	});
}