// https://github.com/peter-murray/node-hue-api
var hue = require("node-hue-api"),
	HueApi = hue.HueApi,
	lightState = hue.lightState;;

var dash_button = require('node-dash-button');

var dash = dash_button("a0:02:dc:de:42:66");

var hostname = "192.168.0.100",
    username = "463d68a912fe9d6a36c555965efa04cb",
    api = new HueApi(hostname, username),
    state;

dash.on("detected", function (){
	api.lightStatus(1)
		.then(function(state) {
			var wasOn = state.state.on;
			var newState;
			if (wasOn) {
				newState = lightState.create().off();
			} else {
				newState = lightState.create().white(300, 100).on();
			}
			return api.setGroupLightState(0, newState).then(console.log('turned ' + (wasOn ? 'off' : 'on')));
		})
		.fail(function(err) {console.log(err)})
		.done();
});
