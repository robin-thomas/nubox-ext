const getKeysButton         = $('#get-keys');
const encryptButton         = $('#encrypt-btn');
const decryptButton         = $('#decrypt-btn');
const grantButton           = $('#grant-btn');
const revokeButton          = $('#revoke-btn');
const autofillGrantButton   = $('#autofill-bob-grant-btn');
const autofillRevokeButton  = $('#autofill-bob-revoke-btn');
const popupExpand           = $('#popup-expand');

$(document).ready((e) => {
  $('.offline').css('visibility', 'hidden');
  $('.online').css('visibility', 'hidden');
  getKeysButton.prop('disabled', true);
  encryptButton.prop('disabled', true);
  decryptButton.prop('disabled', true);
  grantButton.prop('disabled', true);
  revokeButton.prop('disabled', true);
  autofillGrantButton.prop('disabled', true);
  autofillRevokeButton.prop('disabled', true);

  $('#popup-expiration-grant').datepicker({
    minDate: new Date(new Date().getTime() + (24 * 60 * 60 * 1000)),
    dateFormat: 'yy-mm-dd',
  });

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
      revokeButton.prop('disabled', false);
      autofillGrantButton.prop('disabled', false);
      autofillRevokeButton.prop('disabled', false);
    }
  });

  getKeysButton.on('click', async () => {
    try {
      $('#popup-bek').val('');
      $('#popup-bvk').val('');

      const output = await callExtension('bob_keys');

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
      const output = await callExtension('encrypt', {
        plaintext: plaintext,
        label: label,
      });

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

      const plaintext = await callExtension('decrypt', {
        encrypted: encrypted,
        label: label,
      });

      $('#popup-plaintext-decrypt').val(atob(plaintext));
      decryptButton.html(decryptButton.data('original-text')).attr('disabled', false);

    } catch (err) {
      throwError(err);
    }
  });

  grantButton.on('click', async () => {
    try {
      const label = $('#popup-label-grant').val();
      if (label === undefined || label === null || label.trim().length === 0) {
        throw new Error('Missing label in grant request');
      }
      const bek = $('#popup-bek-grant').val();
      if (bek === undefined || bek === null || bek.trim().length === 0) {
        throw new Error('Missing bek in grant request');
      }
      const bvk = $('#popup-bvk-grant').val();
      if (bvk === undefined || bvk === null || bvk.trim().length === 0) {
        throw new Error('Missing bvk in grant request');
      }
      const expiration = $('#popup-expiration-grant').val();
      if (expiration === undefined || expiration === null || expiration.trim().length === 0) {
        $('#popup-expiration-grant').datepicker('show');
        return;
      }

      // Ask for grant.
      await callExtension('grant', {
        label: label,
        bek: bek,
        bvk: bvk,
        expiration: expiration + ' 00:00:00',
      });

    } catch (err) {
      throwError(err);
    }
  });

  revokeButton.on('click', async () => {
    try {
      const label = $('#popup-label-revoke').val();
      if (label === undefined || label === null || label.trim().length === 0) {
        throw new Error('Missing label in revoke request');
      }
      const bvk = $('#popup-bvk-revoke').val();
      if (bvk === undefined || bvk === null || bvk.trim().length === 0) {
        throw new Error('Missing bvk in revoke request');
      }

      // Ask for revoke.
      await callExtension('revoke', {
        label: label,
        bvk: bvk,
      });

    } catch (err) {
      throwError(err);
    }
  });

  autofillGrantButton.on('click', async () => {
    try {
      const output = await callExtension('bob_keys');
      $('#popup-bek-grant').val(output.bek);
      $('#popup-bvk-grant').val(output.bvk);

    } catch (err) {
      throwError(err);
    }
  });

  autofillRevokeButton.on('click', async () => {
    try {
      const output = await callExtension('bob_keys');
      $('#popup-bvk-revoke').val(output.bvk);

    } catch (err) {
      throwError(err);
    }
  });

  popupExpand.on('click', (e) => {
    // e.preventDefault();
    const url = `chrome-extension://${chrome.runtime.id}/home.html`;
    e.originalEvent.currentTarget.href = url;
  });
});

const callExtension = (cmd, args) => {
  return new Promise((resolve, reject) => {
    const msgId = Math.random().toString(36).substring(7);

    args = (args === undefined || args === null) ? {} : args;
    args.host = window.location.hostname;

    chrome.runtime.sendMessage({
      msgId: msgId,
      cmd: cmd,
      args: args,
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
