# Parse Push Notifications [![Titanium](http://www-static.appcelerator.com/badges/titanium-git-badge-sq.png)](http://www.appcelerator.com/titanium/) [![Alloy](http://www-static.appcelerator.com/badges/alloy-git-badge-sq.png)](http://www.appcelerator.com/alloy/) [![License](http://img.shields.io/badge/license-Apache%202.0-blue.svg?style=flat)](http://choosealicense.com/licenses/apache-2.0/)

 This module for the [Appcelerator](http://www.appcelerator.com) Titanium framework offers an
abstraction for handling push notifications with Parse in the same way for both Android and iOS.

## Quick Start

### Get it [![gitTio](http://gitt.io/badge.png)](http://gitt.io/component/ts.parsepushnotifications) 

**Download this repository and install it**

* In your application's `tiapp.xml` file, add the module to the modules section (and its dependency): 

```xml
<modules>
    <module platform="commonjs">ts.parsepushnotifications</module>
    <module platform="android" version="0.10">eu.rebelcorp.parse</module>
</modules>
```

* Copy the `ts.parsepushnotifications-commonjs-x.x.x.zip` bundle into your root app directory.
* Also install the `eu.rebelcorp.parse` module.

**Or use your favorite package manager** 

- [gitTio](http://gitt.io/cli): `gittio install ts.parsepushnotifications`

### Use it
Populate your tiapp.xml with your Parse settings keys as follow:

```xml
    <property name="Parse_AppId"><!-- YOUR APP ID KEY --></property>
    <property name="Parse_APIKey"><!-- YOUR API KEY --></property>
    <property name="Parse_ClientKey"><!-- YOUR CLIENT KEY --></property>
```

Then, in your Titanium file:

```javascript
var ParsePushNotifications = require('ts.parsepushnotifications');

ParsePushNotifications.register({
    onOpen: function onOpen(data) { doSomething(data); },
    onReceive: function onReceive(data) { doSomething(data); },
    onError: function onError(msg) { doSomething(msg); }
});

ParsePushNotifications.subscribe({
    channels: ["TheSmiths"]
});

ParsePushNotifications.send({
    channels: ["The Smiths"],
    data: {
        title: "Hey!",
        alert: "You've got a new message",
        message: "We Are Smiths"
    },
    onError: function onError(msg) { doSomething(msg); } 
});

ParsePushNotifications.unsubscribe({
    channels: ["TheSmiths"]
});
```

Be sure to supply an `alert` when you send a notification (even from outside Titanium) if you want
them to be displayed by the OS.

For *iOS*, you have to get the right certificate in order to build your app, and also in order to allow
Parse to send it incoming notificatons. Please, refer to [this Parse tutorial](https://parse.com/tutorials/ios-push-notifications) 
to correctly setup your certificates.

### API

#####  ParsePushNotifications.init(options)

> *Bind all necessary listeners to handle push notifications.*
>
> - `{Object}` **options**
>   - `{Function}` **[options.onOpen]** A callback triggered when a notification is clicked.
>       - `{Object}` **options.onOpen.data** Argument of the onOpen callback.
>   - `{Function}` **[options.onReceive]** A callback triggered when a notification is received. Only triggered if the app is running in foreground.
>       - `{Object}` **options.onReceive.data** Argument of the onReceive callback. Holds all data sent with the notification.
>   - `{Function}` **[options.onError]** A callback triggered when any error occured during the process.
>       - `{String}` **options.onError.msg** Argument of the onError callback.

##### ParsePushNotifications.subscribe(options)

> *Register the device for a bunch of channels*
>
> - `{Object}` **options**
>   - `{Function}` **[options.onError]** A callback triggered when any error occured during the process
>       - `{String}` **options.onError.msg** Argument of the onError callback
>       - `{Array}` **options.channels** A list of channels to subscribe on Parse

##### ParsePushNotifications.unsubscribe(options)

> *Unregister the device from a bunch of channels*
>
> - `{Object}` **options**
>   - `{Function}` **[options.onError]** A callback triggered when any error occured during the process
>       - `{String}` **options.onError.msg** Argument of the onError callback
>   - `{Array}` **options.channels** A list of channels to unsubscribe from Parse

#####  ParsePushNotifications.send(options)

> *Send a notification through Parse*
> - `{Object}` **options** 
>   - `{Array}` **options.channels** A list of channels to send the notification.
>   - `{Object}` **options.data** Data to send with the notification.
>   - `{Function}` **[options.onSuccess]** Callback triggered when the notification is successfully sent.
>   - `{Function}` **[options.onError]** Callback triggered when something went wrong.

### Changelog
* 1.0 First version

[![wearesmiths](http://wearesmiths.com/media/logoGitHub.png)](http://wearesmiths.com)

Appcelerator, Appcelerator Titanium and associated marks and logos are trademarks of Appcelerator, Inc.  
Titanium is Copyright (c) 2008-2015 by Appcelerator, Inc. All Rights Reserved.  
Titanium is licensed under the Apache Public License (Version 2).  
