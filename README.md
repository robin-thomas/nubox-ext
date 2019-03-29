# nuBox chrome extension
![](http://i67.tinypic.com/34ooa6h_th.png)

[![Python 3.6](https://img.shields.io/badge/python-3.6-blue.svg)](https://www.python.org/downloads/release/python-360/) [![License](https://img.shields.io/badge/license-MIT-green.svg)](https://opensource.org/licenses/MIT)

# Table of Contents
1. [Who is it for?](#who-is-it-for)
2. [API](#api)
    - [isHostRunning](#ishostrunning)
    - [encrypt](#encrypt)
    - [decrypt](#decrypt)
    - [grant](#grant)
    - [getBobKeys](#getbobkeys)
3. [Installation](#installation)

#### Who is it for?
[NuCypher](https://www.nucypher.com/) is the go-to solution for anyone aiming to build privacy-rich applications on the blockchain. But it lacks a JavaScript library. Moreover, their codebase is written in Python, making it difficult to port over to the web side. **nuBox** chrome extension can solve these issues without you ever having to know about NuCypher at all! It even has an insanely simple API which it injects onto every website!

#### API:
All API calls are available under **nuBox** namespace. All of them supports *[Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)*.

###### isHostRunning
This API call is used to check whether the nuBox chrome extension is running successfully on the client machine. It can fail if the Chrome native host fails to start or has exited.
```js
await nuBox.isHostRunning();
```

###### encrypt
This API call is used to encrypt a block of plaintext. Due to chrome limitations, it's recommended to keep under 256 KB for the plaintext size.
```js
await nuBox.encrypt(plaintext, label);
```
It expects two arguments: `plaintext` and `label`.

###### decrypt
This API call is used to decrypt a block of encrypted text. Due to chrome limitations, it's recommended to keep under 256 KB for the encrypted size.
```js
await nuBox.decrypt(encrypted, label);
```
It expects two arguments: `encrypted` and `label`.

###### grant
This API call is used to invoke a grant request waiting for user's permission to approve or reject the request.
```js
await nuBox.grant(label, bek, bvk, expiration);
```
It expects four arguments: `label`, `bek`, `bvk` and `expiration`.
* `bek` is *Bob's encrypting key* (which is a hex-encoded string). It can be retrieved using `getBobKeys` API.
* `bvk` is *Bob's verifying key* (which is a hex-encoded string). It can be retrieved using `getBobKeys` API.
* `expiration` is a ISO-8601 formatted datetime string (for example, **'2019-03-29 22:23:10'**).

![](http://oi64.tinypic.com/akae87.jpg)
It'll open up a **grant** popup for the user to approve. It'll have the sender information and also details about the grant request. If the user approves this request, it'll be send to the NuCypher network for processing.

###### revoke
This API call is used to invoke a revoke request waiting for user's permission to approve or reject the request.
```js
await nuBox.revoke(label);
```
It expects one argument: `label`.

![](http://oi65.tinypic.com/2qd1h60.jpg)
It'll open up a **revoke** popup for the user to approve. It'll have the sender information and also details about the revoke request. If the user approves this request, it'll be send to the NuCypher network for processing.

###### getBobKeys
This API call is used to get Bob's encrypting key and verifying key (both are public keys) that will be used for granting access for Bob.
```js
await nuBox.getBobKeys();
```

#### Installation:
**nuBox** packages all NuCypher dependencies into docker containers. All the user needs to have is *docker*, *docker-compose* and *chrome browser*.

Run the below step to install the *nuBox* chrome **host**.
```sh
$ cd nubox-ext
$ sudo docker-compose up -d
$ ./host/install_chrome.sh
```

*nuBox* host is written in Python 3.6. It also assumes that the python binary is at the location `/usr/bin/python3.6`

You'll also need to install the *nuBox* chrome extension. Since it's not packaged into Chrome Web Store, follow the below steps to install it.

* Head over to **chrome://extensions**
* Turn ON the *developer mode*
* Click on "Load unpacked"
* Select the *nuBox* extension directory (`nubox-ext/extension`) and click "Ok"
* You'll be able to see that *nuBox* chrome extension has been successfully loaded!

License
----
MIT

**Free Software, Hell Yeah!**
