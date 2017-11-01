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

var dates = {};

var hueConfig = config.get('hue');
var groupUrl = `http://${hueConfig.ip}/api/${hueConfig.key}/groups/${hueConfig.group}`;

var hs100config = config.get('hs100');
var plug = hs100client.getPlug({
    host: hs100config.ip,
    timeout: hs100config.timeout,
});

var dashConfigs = config.get('dash');
dashConfigs.forEach(dashConfig => {
    var dash = dash_button(dashConfig.mac);
    dash.on("detected", () => dashHandler(dashConfig));
})

function dashHandler(dashConfig) {
    console.log("dash pressed: " + dashConfig.id);
    var newDate = moment();
    if (dates[dashConfig.id] && newDate.diff(dates[dashConfig.id], 'seconds') <= THRESHOLD_SECONDS) {
        console.log("ignoring");
        return;
    }
    dates[dashConfig.id] = newDate;

    isOn().then(wasOn => {
        var shouldTurnOff = wasOn && dashConfig.offSwitch;
        if (shouldTurnOff) {
            return retry(RETRY, turnOff).then(console.log('turned off'));
        } else {
            var scenes = dashConfig.scenes;
            var randomScene = scenes[Math.floor(Math.random() * scenes.length)];
            return retry(RETRY, () => turnOn(randomScene)).then(console.log('turned on ' + randomScene.name));
        }
    }).catch(err => console.log("ERROR: " + err));
}

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

function turnOn(scene) {
    var plugPowerState = scene.hs100 || false;
    var plugChange = plug.setPowerState(plugPowerState).catch(reason => {
        return Promise.reject("HS100 failure: " + reason);
    });

    var hueOn = rp({
        method: 'PUT',
        uri: groupUrl + '/action',
        body: {
            on: true,
            scene: scene.id,
            bri: scene.brightness,
        },
        json: true,
        timeout: hueConfig.timeout,
    }).catch(reason => {
        return Promise.reject("Hue failure: " + reason);
    });

    return Promise.all([plugChange, hueOn])
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