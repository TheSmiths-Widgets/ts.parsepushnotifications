/* Compatibility for Ti standalone (without Alloy) */
if (typeof OS_ANDROID === "undefined") {
    OS_ANDROID = Ti.Platform.name === "android"; OS_IOS = Ti.Platform.name === "iPhone OS";
}

var Parse,
    HTTPRequest = require('./lib/ts.httprequest/ts.httprequest.js'),
    _iOSData = {
        deviceToken: null,
        installationsId: null,
        channels: []
    };

const TAG = "[ PushNotifications ]",
      NOTIFICATION_TYPES = OS_IOS && [
          Ti.App.iOS.USER_NOTIFICATION_TYPE_ALERT,
          Ti.App.iOS.USER_NOTIFICATION_TYPE_SOUND,
          Ti.App.iOS.USER_NOTIFICATION_TYPE_BADGE],
      KEYS = {
          APP_ID: Ti.App.Properties.getString("Parse_AppId"), 
          REST_API: Ti.App.Properties.getString("Parse_APIKey"),
          CLIENT: Ti.App.Properties.getString("Parse_ClientKey")
      };


/* ------------------ Validations --------------- */
function _ensureParse() {
    return !Parse && "Must be configured first." || null;
}

function _ensureNetwork() {
    return !Ti.Network.online && "Unable to enable notifications. Network not reachable." || null;
}

function _ensureArray(args) {
    return !Array.isArray(args) && "An array is expected" || null;
}

function _ensureNotif(args) {
    return !args && "Invalid notification" || null;
}

/* ----------------- Wrappers --------------- */
function _init(options) {
    var error;

    options = options || {};
    error = _ensureParse();
    error = _ensureNetwork();
    if (error) { return options.onError ? options.onError(error) : Ti.API.error(TAG, error); }

    OS_ANDROID && _initAndroid(options.onOpen, options.onReceive, options.onError);
    OS_IOS && _initIOS(options.onOpen, options.onReceive, options.onError);
}

function _subscribe(options) {
    var error;

    options = options || {};
    error = _ensureArray(options.channels);
    if (error) { return options.onError ? options.onError(error) : Ti.API.error(TAG, error); }

    OS_ANDROID && _subscribeAndroid(options.channels);
    OS_IOS && _subscribeIOS(options.channels);
}

function _unsubscribe(options) {
    var error;

    options = options || {};
    error = _ensureArray(options.channels);
    if (error) { return options.onError ? options.onError(error) : Ti.API.error(TAG, error); }

    OS_ANDROID && _unsubscribeAndroid(options.channels);
    OS_IOS && _unsubscribeIOS(options.channels);
}

function _send(options) {
    var error;
    options = options || {};

    error = _ensureArray(options.channels);
    if (error) { return options.onError ? options.onError(error) : Ti.API.error(TAG, error); }

    /* Format the data by merging channel and notification data */
    options.data = { channels: options.channels, data: options.data || {} };

    /* Proceed with the REST API*/
    new HTTPRequest({
        url: "https://api.parse.com/1/push",
        method: "POST",
        headers: { 
            "Content-Type": "application/json",
            "X-Parse-Application-Id": KEYS.APP_ID,
            "X-Parse-REST-API-Key": KEYS.REST_API
        },
        data: options.data,
        success: options.onSuccess || function () { Ti.API.info(TAG, "Default success callback called."); },
        error: options.onError || function (e) { Ti.API.error(TAG, "Default error callback called;", e); }
    }).send();
}

/* ---------------- CONFIGURATION -------------- */
function _configure(options) {
    options = options || {};
    if (!options.Parse) { throw ("Invalid configuration options. Parse module is missing"); }
    Parse = options.Parse;
}

/* ----------------- ANDROID -------------------*/
function _initAndroid(onOpen, onReceive) {
    Parse.start();
    onOpen && Parse.addEventListener('notificationopen', function (e) {
        delete e.source; delete e.bubbles; delete e.cancelBubble; delete e.type;
        onOpen(e);
    });

    onReceive && Parse.addEventListener('notificationreceive', function (e) {
        delete e.source; delete e.bubbles; delete e.cancelBubble; delete e.type;
        onReceive(e);
    });
    
    /* Check if we come back from background */
    var data = Ti.App.Android.launchIntent.getStringExtra('com.parse.Data'); 
    data && onOpen && onOpen(JSON.parse(data));
}

function _subscribeAndroid(channels) { 
    channels.forEach(Parse.subscribeChannel.bind(Parse)); 
}

function _unsubscribeAndroid(channels) { 
    channels.forEach(Parse.unsubscribeChannel.bind(Parse)); 
}

/* -------------------- IOS --------------------- */
function _initIOS(onOpen, onReceive, onError) {
    onError = onError || function (e) { Ti.API.error(TAG, e); };

    function onNotificationsRegistered(e) { 
        _iOSData.deviceToken = e.deviceToken; 
    }

    function onNotificationEvent(notif) {
        var error = _ensureNotif(notif);
        if (error) { return onError(error); }

        if (notif.success && notif.inBackground) { return onOpen && onOpen(notif.data); }
        else {
            if (onReceive) { return onReceive(notif.data); }

            var dialog = Ti.UI.createAlertDialog({
                title: notif.data && notif.data.title,
                message: notif.data && notif.data.alert,
                buttonNames: [notif.ok || "Continue", "Ignore"],
                cancel: 1
            });

            onOpen && dialog.addEventListener("click", function (e) {
                e.index !== e.cancel && onOpen(notif.data);
            });

            dialog.show();
        }
    }

    function registerForNotifications(types) {
        _iOSData.deviceToken = "PENDING";
        Ti.Network.registerForPushNotifications({
            types: types,
            error: onError,
            success: onNotificationsRegistered,
            callback: onNotificationEvent
        });
    }

    if (+Ti.Platform.version.split(".")[0] < 8) { registerForNotifications(NOTIFICATION_TYPES); } 
    else {
        Ti.App.iOS.addEventListener('usernotificationsettings', function onNotificationsSettings(e) {
            Ti.App.iOS.removeEventListener('usernotificationsettings', onNotificationsSettings);
            registerForNotifications();
        });
        
        Ti.App.iOS.registerUserNotificationSettings({ types: NOTIFICATION_TYPES });
    }
}

function _subscribeIOS(channels, remove) {
    function createInstallations() {
        _iOSData.installationsId = "PENDING";
        new HTTPRequest({
            url: "https://api.parse.com/1/installations",
            method: "POST",
            headers: { 
                "Content-Type": "application/json",
                "X-Parse-Application-Id": KEYS.APP_ID,
                "X-Parse-REST-API-Key": KEYS.REST_API,
            },
            data: {
                'deviceType': 'ios',
                'channels': channels,
                'deviceToken': _iOSData.deviceToken
            },
            success: onParseRegistrationSuccess,
            error: onParseFailure,
        }).send();
    }

    function updateInstallations() {
        new HTTPRequest({
            url: "https://api.parse.com/1/installations/" + _iOSData.installationsId,
            method: "put",
            headers: { 
                "Content-Type": "application/json",
                "X-Parse-Application-Id": KEYS.APP_ID,
                "X-Parse-REST-API-Key": KEYS.REST_API,
            },
            data: {
                'deviceType': 'ios',
                'channels': channels,
                'deviceToken': _iOSData.deviceToken
            },
            success: onParseUpdateSuccess,
            error: onParseFailure,
        }).send();
    }

    function onParseRegistrationSuccess(response) { 
        Ti.API.info(TAG, "Channels subscribed on Parse"); 
        _iOSData.installationsId = response.objectId;
        _iOSData.channels = channels;
    }

    function onParseUpdateSuccess(response) {
        Ti.API.info(TAG, "Channels subscribed on Parse");
        _iOSData.channels = channels;
    }

    function onParseFailure() { 
        Ti.API.error(TAG, "Failed to subscribe to channels on Parse"); 
        _iOSData.installationsId === _iOSData.installationsId === "PENDING" && null || _iOSData.installationsId;
    }

    function waitForAsyncTask() {
        if (!_iOSData.deviceToken) { return Ti.API.error(TAG, "Please, init before subscribing any channels"); }
        if (_iOSData.deviceToken === "PENDING") { return setTimeout(waitForAsyncTask, 200); }
        if (_iOSData.installationsId === "PENDING") { return setTimeTimeout(waitForAsyncTask, 200); }
        if (!_iOSData.installationsId) { createInstallations(); }
        else { 
            !remove && _iOSData.channels.forEach(function (c) { channels.indexOf(c) === -1 && channels.push(c); });
            updateInstallations(); 
        }
    }

    waitForAsyncTask();
}

function _unsubscribeIOS(channels) {
    _subscribeIOS(_iOSData.channels.filter(function (c) {
        return channels.indexOf(c) === -1;
    }), true);
}


/* -------------- PUBLIC INTERFACE -------------------- */
/**
 * Configure the library, i.e., Inject required dependency
 *
 * @param {Object} options
 *      @param {Parse} options.Parse Parse module instance from eu.rebelcorp.parse.
 */
exports.configure = _configure;


/**
 * Bind all necessary listeners to handle push notifications.
 *
 * @param {Object} options
 *      @param {Function} [options.onOpen] Triggered when a notification is opened. Will also be
 *      triggered when the app is coming from the background.
 *          @param {Object} [options.onOpen.data] Argument of the onOpen callback
 *      @param {Function} [options.onReceive] Triggered when a notification is received. Will not be
 *          @param {Object} [options.onReceive.data] Argument of the onReceive callback
 *      triggered if the app is in background.
 *      @param {Function} [options.onError] Triggered when an error occurs.
 *          @param {String} [options.onError.message] Argument of the onError callback
 */
exports.init = _init;

/**
 * Register the device for a new bunch of channels
 *
 * @param {Object} options
 *      @param {Array} options.channels A list of channels to subscribe to Parse
 *      @param {Function} [options.onError] Callback when an error occurs
 *          @param {String} [options.onError.message] Argument of the onError callback
 */
exports.subscribe = _subscribe;

/**
 * Unregister the device from a new bunch of channels
 *
 * @param {Object} options
 *      @param {Array} options.channels A list of channels to unsubscribe from Parse
 *      @param {Function} [options.onError] Callback when an error occurs
 *          @param {String} [options.onError.message] Argument of the onError callback
 */
exports.unsubscribe = _unsubscribe;

/**
 * Send a notification through Parse
 * @param {Object} options 
 *      @param {Array} options.channels A list of channels to send the notification.
 *      @param {Object} options.data Data to send with the notification.
 *      @param {Function} [options.onSuccess] Callback triggered when the notification is successfully sent.
 *      @param {Function} [options.onError] Callback triggered when something went wrong.
 */ 
exports.send = _send;
