# nuBox chrome extension
![](http://i67.tinypic.com/34ooa6h_th.png)

![](https://img.shields.io/badge/ubuntu-16.04-brightgreen.svg) [![Python 3.6](https://img.shields.io/badge/python-3.6-blue.svg)](https://www.python.org/downloads/release/python-360/) [![License](https://img.shields.io/badge/license-MIT-green.svg)](https://opensource.org/licenses/MIT)

# Demo videos
* [nuBox extension](https://www.youtube.com/watch?v=Rw4c_Uz5aAU)
* [GMail support](https://www.youtube.com/watch?v=cMYjGT6t86o)
* [Dropbox-like support](https://www.youtube.com/watch?v=fBeYXWPVtO4)

# Table of Contents
1. [Who is it for?](#who-is-it-for)
2. [API (for developers)](#api)
    - [isHostRunning](#ishostrunning)
    - [approve](#approve)
    - [encrypt](#encrypt)
    - [decrypt](#decrypt)
    - [grant](#grant)
    - [revoke](#revoke)
    - [getBobKeys](#getbobkeys)
3. [Installation](#installation)
4. [Popup UI (for users)](#popup-ui)
5. [GMail support](#gmail-support)
6. [Dropbox-like support](#dropbox-like-support)
7. [Debugging issues](#debugging-issues)

# Who is it for?
[NuCypher](https://www.nucypher.com/) is the go-to solution for anyone aiming to build privacy-rich applications on the blockchain. But it lacks a JavaScript library. Moreover, their codebase is written in Python, making it difficult to port over to the web side. **nuBox** chrome extension can solve these issues without you ever having to know about NuCypher at all! It even has an insanely simple API which it injects onto every website! It even comes with support for **IPFS**!

Moroever, it now comes with **inbuilt GMail** support (forget all about the insance email encryption setup and PGP!), and you can even save and share your files without ever having to visit any website!

# API:
All API calls are available under **nuBox** namespace. All of them supports *[Promises](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Promise)*.

###### isHostRunning
This API call is used to check whether the nuBox chrome extension is running successfully on the client machine. It can fail if the Chrome native host fails to start or has exited.
```js
await nuBox.isHostRunning();
```

###### approve
This API call is used to request permission from the user to start using the `nuBox` APIs (for this web host). On calling this API, it'll open a popup, like shown below. If user hasn't approved this request, you can only use the `isHostRunning` API.
```js
await nuBox.approve();
```
![](https://i.ibb.co/RgFJbxN/nubox-approve.png)

###### encrypt
This API call is used to encrypt a block of plaintext. Due to [chrome](https://developer.chrome.com/extensions/nativeMessaging#native-messaging-host-protocol) limitations, it's recommended to keep under 256 KB for the plaintext size.
```js
await nuBox.encrypt(plaintext, label, ipfs);
```
It expects atleast two arguments: `plaintext` and `label`. `ipfs` is optional (with default value `false`), and if it's set as true, the encrypted data will be uploaded to Infura IPFS and the IPFS hash will be returned. The encrypted data can be accessed by visiting: `https://ipfs.infura.io/ipfs/<hash>/`.

###### decrypt
This API call is used to decrypt a block of encrypted text. Due to [chrome](https://developer.chrome.com/extensions/nativeMessaging#native-messaging-host-protocol) limitations, it's recommended to keep under 256 KB for the encrypted size.
```js
await nuBox.decrypt(encrypted, label, ipfs);
```
It expects atleast two arguments: `encrypted` and `label`. `ipfs` is optional (with default value `false`), and if it's set as true, the `encrypted` argument should be the Infura IPFS hash from which the encrypted data will be downloaded.

###### grant
This API call is used to invoke a grant request waiting for user's permission to approve or reject the request.
```js
await nuBox.grant(label, bek, bvk, expiration, noPopup);
```
It expects atleast four arguments: `label`, `bek`, `bvk` and `expiration`.
* `bek` is *Bob's encrypting key* (which is a hex-encoded string). It can be retrieved using `getBobKeys` API.
* `bvk` is *Bob's verifying key* (which is a hex-encoded string). It can be retrieved using `getBobKeys` API.
* `expiration` is a ISO-8601 formatted datetime string (in the format of `YYYY-MM-DD HH:mm:ss`. For example, **'2019-03-29 22:23:10'**).
* `noPopup` to disable showing the popup. It's default value is `false` (meaning popup will be shown). This option is only honored if both **Alice** and **Bob** (for whom the grant is requested) are running on the same machine. If not, it's ignored.

![](http://oi68.tinypic.com/a46ck7.jpg)

It'll open up a **grant** popup for the user to approve. It'll have the sender information and also details about the grant request. If the user approves this request, it'll be send to the NuCypher network for processing.

###### revoke
This API call is used to invoke a revoke request waiting for user's permission to approve or reject the request.
```js
await nuBox.revoke(label, bvk, noPopup);
```
It expects aleast two arguments: `label` and `bvk` (Bob's verifying key).
* `noPopup` to disable showing the popup. It's default value is `false` (meaning popup will be shown). This option is only honored if both **Alice** and **Bob** (for whom the revoke is requested) are running on the same machine. If not, it's ignored.

![](http://oi65.tinypic.com/mb7b6u.jpg)

It'll open up a **revoke** popup for the user to approve. It'll have the sender information and also details about the revoke request. If the user approves this request, it'll be send to the NuCypher network for processing.

###### getBobKeys
This API call is used to get Bob's encrypting key and verifying key (both are public keys) that can be used for granting access for Bob to a policy.
```js
await nuBox.getBobKeys();
```

# Installation:
**nuBox** packages all NuCypher dependencies into docker containers. All the user needs to have is *docker*, *docker-compose* and *chrome browser* (or *Brave browser*).

Run the below step to install the *nuBox* chrome **host**.
```sh
$ cd nubox-ext
$ sudo docker-compose build
$ sudo docker-compose up -d
$ ./host/install_chrome.sh
```

If you want to use it with Brave browser, run the below commands.
```sh
$ cd nubox-ext
$ sudo docker-compose build
$ sudo docker-compose up -d
$ ./host/install_brave.sh
```

*nuBox* host is written in Python 3.6. It also assumes that the python binary is at the location `/usr/bin/python3.6`

You'll also need to install the *nuBox* chrome extension. Since it's not packaged into Chrome Web Store, follow the below steps to install it.

* Head over to **chrome://extensions**
* Turn ON the *developer mode*
* Click on "Load unpacked"
* Select the *nuBox* extension directory (`nubox-ext/extension`) and click "Ok"
* You'll be able to see that *nuBox* chrome extension has been successfully loaded!

# Popup UI
*nuBox* also comes with a popup UI that the user can use to interact with NuCypher without any of the complexity.
It has the following features:
* It will show the "online" status (online meaning it was able to connect to the NuCypher network). All the below operations are only enabled if "online".
* Retrieve `Bob's encrypting and verifying keys`
* `Encrypt` a block of text.
* `Decrypt` a block of text
* `Grant` access for Bob for the label, so that `decrypt` operation can pass for Bob (can autoload Bob's details).
* `Revoke` access for Bob for the label, so that `decrypt` operation will fail for Bob (can autoload Bob's details).
* Any errors in the above API calls will alert the error message onto the active tab of the browser.

  ![](http://oi64.tinypic.com/10faulf.jpg)
  ![](http://oi63.tinypic.com/2enu5b8.jpg)
  ![](http://oi63.tinypic.com/t8rt38.jpg)
  ![](http://oi68.tinypic.com/29o69gm.jpg)
  ![](http://oi67.tinypic.com/2w3una9.jpg)
  ![](http://oi65.tinypic.com/9sxnnq.jpg)

# GMail support
Forget the insane installation setup of encrypted emails and PGP! With nuBox, you can have **1-click encrypt** and **auto-decrypt**! Zero installation setup too!

nuBox auto adds the **Encrypt** and **Decrypt** buttons for each gmail compose window. Clicking on *Encrypt* button will automatically encrypt the email body with NuCypher network and then encode them into emojis! When you try to open the encrypted email, nuBox will automatically decode the emojis and then decrypts it using NuCypher (decrypt will fail if user is not granted permission). Voila!

You can use the nuBox popup UI to grant permissions for multiple recipients. The *label* used is the email subject.

![](https://i.ibb.co/tcqjSyQ/nubox-gmail.png)

# Dropbox-like support
Forget storing your files on any server! With nuBox, you can **securely** store your files on **IPFS** and store the IPFS hashes on Chrome sync, meaning you can even access it from a different machine! Moreover you can share the files with anyone you like, and they can decrypt the files and download it!

##### Features:
* **No websites or servers!**
* Upload files, encrypt them and save it on IPFS
* Support large files, by storing splitting the files and storing them in chunks (meaning different IPFS hashes)
* IPFS hashes are stored in Chrome sync and hence can be accessed on any machine having Chrome browser with nuBox extension.
* Share files with anyone securely.
* Extensive **Logging** facility - see all the requests (inputs, output, timestamp) coming in.
* Supported file operations - *rename*, *delete*, *download*, *share*, *file info*.
* Check if extension is able to connect to NuCypher network.

![](https://i.ibb.co/frp38sL/nubox-dropbox-1.png)
![](https://i.ibb.co/3fL85JB/nubox-dropbox-2.png)
![](https://i.ibb.co/4dWJzj7/nubox-dropbox-3.png)
![](https://i.ibb.co/vP4ypXc/nubox-dropbox-4.png)
![](https://i.ibb.co/5M1W0fk/nubox-dropbox-5.png)

# Debugging issues
* *nuBox* is tested only on version 3.6.0 of Python. Any different version might lead to unexpected outputs.
* If your *Python* binary is not stored at `/usr/bin/python3.6`, make a symmlink to that location so that the host can run.
* All run-time errors happening in the host will be stored at `host/err.log` along with the stack trace.
* If the host crashed because of any of the above reasons, just restart the extension (after fixing the issue).

# Known Nucypher issues
* Bob cannot retrieve same data twice: https://github.com/nucypher/nucypher/issues/833


**Free Software, Hell Yeah!**
