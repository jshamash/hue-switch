// https://github.com/peter-murray/node-hue-api
var hue = require("node-hue-api"),
	moment = require('moment'),
	HueApi = hue.HueApi,
	lightState = hue.lightState;

var dash_button = require('node-dash-button');

var dash = dash_button("a0:02:dc:de:42:66");

var THRESHOLD_SECONDS = 5;

var hostname = "192.168.100.7",
    username = "463d68a912fe9d6a36c555965efa04cb",
    api = new HueApi(hostname, username),
    date;

dash.on("detected", function() {
	console.log("detected!");
	var newDate = moment();
	if (date && newDate.diff(date, 'seconds') <= THRESHOLD_SECONDS) {
		console.log("ignoring");
		return;
	}
	date = newDate;
	api.lightStatus(2)
		.then(function(state) {
			var wasOn = state.state.on;
			var newState;
			if (wasOn) {
				newState = lightState.create().off();
			} else {
				newState = lightState.create().on().bri(255);
			}
			return api.setGroupLightState(0, newState).then(console.log('turned ' + (wasOn ? 'off' : 'on')));
		})
		.fail(function(err) {console.log(err)})
		.done();
});
