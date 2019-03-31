const getKeysButton = $('#get-keys');
const encryptButton = $('#encrypt-btn');
const decryptButton = $('#decrypt-btn');
const grantButton = $('#grant-btn');

window.onload = (e) => {
  $('.offline').css('visibility', 'hidden');
  $('.online').css('visibility', 'hidden');
  getKeysButton.prop('disabled', true);
  encryptButton.prop('disabled', true);
  decryptButton.prop('disabled', true);
  grantButton.prop('disabled', true);

  const msgId = Math.random().toString(36).substring(7);

  // Check whether the nucypher docker containers are running.
  chrome.runtime.sendMessage({
    msgId: msgId,
    cmd: 'isHostRunning',
    args: [],
  }, (response) => {
    console.log(response);

    if (!response) {
      $('.offline').css('visibility', 'visible');
    } else if (response.type === 'failure') {
      $('.offline').css('visibility', 'visible');
    } else {
      $('.online').css('visibility', 'visible');
      getKeysButton.prop('disabled', false);
      encryptButton.prop('disabled', false);
      decryptButton.prop('disabled', false);
      grantButton.prop('disabled', false);
    }
  });
}

const callExtension = (cmd, args) => {
  return new Promise((resolve, reject) => {
    const msgId = Math.random().toString(36).substring(7);

    chrome.runtime.sendMessage({
      msgId: msgId,
      cmd: cmd,
      args: args === undefined ? [] : args,
    }, (response) => {
      console.log(response);

      if (!response) {
        reject(null)
      } else if (response.type === 'failure') {
        reject(response.result);
      } else {
        resolve(response.result);
      }
    });
  });
};

getKeysButton.on('click', async () => {
  try {
    $('#popup-bek').val('');
    $('#popup-bvk').val('');

    const output = await callExtension('bob_keys', []);

    $('#popup-bek').val(output.bek);
    $('#popup-bvk').val(output.bvk);

  } catch (err) {
    throwError(err);
  }
});

encryptButton.on('click', async () => {
  try {
    $('#popup-encrypted-encrypt').val('');

    const plaintext = $('#popup-plaintext-encrypt').val();
    const label = $('#popup-label-encrypt').val();
    const output = await callExtension('encrypt', [plaintext, label]);

    $('#popup-encrypted-encrypt').val(output);

  } catch (err) {
    throwError(err);
  }
});

decryptButton.on('click', async () => {
  try {
    $('#popup-plaintext-decrypt').val('');

    const loadingText = '<i class="fas fa-spinner fa-spin"></i>';
    decryptButton.data('original-text', decryptButton.html());
    decryptButton.html(loadingText).attr('disabled', 'disabled');

    const encrypted = $('#popup-encrypted-decrypt').val();
    const label = $('#popup-label-decrypt').val();

    const plaintext = await callExtension('decrypt', [encrypted, label]);

    $('#popup-plaintext-decrypt').val(atob(plaintext));
    decryptButton.html(decryptButton.data('original-text')).attr('disabled', false);

  } catch (err) {
    throwError(err);
  }
});

grantButton.on('click', async () => {
  try {
    const label = $('#popup-label-grant').val();

    // Ask for grant.
    const output = await callExtension('bob_keys', []);
    await callExtension('grant', [label, output.bek, output.bvk, '2020-01-01 00:00:00']);

  } catch (err) {
    throwError(err);
  }
});

const throwError = (error) => {
  chrome.tabs.query({
    active: true,
    currentWindow: true
  }, (tabs) => {
    chrome.tabs.executeScript(
      tabs[0].id,
      { code: 'alert("' + error + '")' }
    );
  });
}
