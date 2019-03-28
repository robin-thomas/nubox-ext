const EXTENSION_ID = 'chakfniokepheebjfjobbaeadeaodlhk';

const callExtension = (cmd, args) => {
  return new Promise((resolve, reject) => {
    let msg = JSON.stringify({
      cmd: cmd,
      args: args === undefined ? [] : args,
    });

    chrome.runtime.sendMessage(EXTENSION_ID, msg, response => {
      if (!response) {
        reject(null);
        return false;
      } else if (response.type === 'failure') {
        reject(response.result);
        return false;
      } else if (response.type === 'success') {
        resolve(response.result);
        return true;
      }
    });
  });
}

const nuBox = {
  checkForExtension: async () => {
    if (chrome === undefined || chrome === null ||
        chrome.runtime === undefined) {
      throw new Error('You are not using a Chromium-based browser!');
    }

    try {
      await callExtension('isHostRunning');
    } catch (err) {
      console.log(err);
      if (err === null) {
        throw new Error('You do not have the nuBox chromium extension installed!');
      } else {
        throw new Error('Unable to start the Chromium nuBox host!');
      }
    }
  },

  grant: async (label, bob_encrypting_key, bob_verifying_key, expiration) => {
    try {
      // TODO: Open up the UI and ask for user's permission.

      await await callExtension('grant', [label, bob_encrypting_key, bob_verifying_key, expiration]);
    } catch (err) {
      throw err;
    }
  },

  encrypt: async (plaintext, label) => {
    try {
      return await callExtension('encrypt', [plaintext, label]);
    } catch (err) {
      throw err;
    }
  },

  decrypt: async (encrypted, label) => {
    try {
      return await callExtension('decrypt', [encrypted, label]);
    } catch (err) {
      throw err;
    }
  },

  // reads the block from local fs and encrypts it with nucypher.
  readBlock: async (file, path, offset, blockSize) => {
    try {
      return await callExtension('readBlock', {
        file: file,
        path: path,
        offset: offset,
        blockSize: blockSize
      });
    } catch (err) {
      throw err;
    }
  },

  getBobKeys: async () => {
    try {
      return await callExtension('bob_keys', []);
    } catch (err) {
      throw err;
    }
  },
};
