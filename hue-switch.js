// https://github.com/peter-murray/node-hue-api
var hue = require("node-hue-api"),
	rp = require('request-promise'),
	moment = require('moment'),
	dash_button = require('node-dash-button')

// Time between successive dash firings that must be exceeded in order to send a request
var THRESHOLD_SECONDS = 7;
// Sometimes the hue api responds with success but does not take action; retrying seems to fix.
var RETRY = 3;

var dash = dash_button("a0:02:dc:de:42:66");

var date;
var groupUrl = 'http://192.168.100.7/api/463d68a912fe9d6a36c555965efa04cb/groups/0'

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
			scene: "KgtEyWsJambbljC",
			bri: 255
		},
		json: true
	}).then((response) => {
		console.log(response);
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
	})
}

function retry(n, promise) {
	console.log("Attempt: " + n);
	if (n <= 1) return promise();
	return promise().then(retry(n - 1, promise));
}