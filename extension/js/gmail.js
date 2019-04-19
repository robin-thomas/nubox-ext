const emoji = require('base64-emoji');
const cheerio = require('cheerio');
const { Gmail } = require('gmail-js');
const gmail = new Gmail();

const nuBoxGmail = {
  key: 'nuBox-robin-thomas',

  isNuBoxEmail: (body) => {
    // Retrieve the email body.
    // Handle Google emoijis (which are loaded only if page is refreshed or email is sent)
    const $ = cheerio.load(body);
    if ($('img[goomoji]').length > 0) {
      body = $('img[goomoji]').map((i, el) => $(el).attr('alt')).get().join('');
    }

    const header = Buffer.from(nuBoxGmail.key).toString('base64');
    const headerEmoji = emoji.encode(header).toString();
    if (!body.startsWith(headerEmoji)) {
      console.log('not encrypted email');
      return null;
    }

    return body.substring(headerEmoji.length);
  },

  init: () => {
    gmail.observe.on('view_email', (domEmail) => {
      const intervalId = setInterval(() => {
        const emailData = gmail.new.get.email_data(domEmail);

        if (emailData !== null &&
            emailData !== undefined) {
          const label = emailData.subject;
          const content = emailData.content_html;

          // Nothing to decrypt.
          if (content.trim().length === 0) {
            clearInterval(intervalId);
            return;
          }

          nuBoxGmail.decryptEmail(label, content).then((html) => {
            // detect encrypted emails and try to decrypt them alone.
            if (html !== null) {
              domEmail.body(html);
            }
          }).catch((err) => {
            console.log(err);
          });

          clearInterval(intervalId);
        }
      }, 500);
    });

    gmail.observe.on('compose', function(compose, type) {
      // Add button to the "Compose Email".
      const composeRef = gmail.dom.composes()[0];

      gmail.tools.add_compose_button(composeRef, 'Encrypt (nuBox)', () => {
        nuBoxGmail.encryptEmail(composeRef);
      }, 'nubox-r-c-btn-r');

      gmail.tools.add_compose_button(composeRef, 'Decrypt (nuBox)', async function() {
        this.innerHTML = 'Decrypting&nbsp;&nbsp;<span class="nubox-r-c-btn-loader"></span>';

        const label = composeRef.subject();
        const body = composeRef.body();

        try {
          const html = await nuBoxGmail.decryptEmail(label, body, true /* compose */);
          composeRef.body(html);

        } catch (err) {
          gmail.tools.add_modal_window('Decrypt with nuBox', err.message,
            () => {
                gmail.tools.remove_modal_window();
            });
        }

        this.innerHTML = 'Decrypt (nuBox)';
      }, 'nubox-r-c-btn-r');
    });

    gmail.observe.on('send_message', function(url, body, data, xhr) {
      const body_params = xhr.xhrParams.body_params;

      const intervalId = setInterval(() => {
        const emailData = gmail.new.get.email_data(data[1]);

        if (emailData !== null &&
            emailData !== undefined) {

          clearInterval(intervalId);

          // only for nuBox emails.
          let body = emailData.content_html;
          body = nuBoxGmail.isNuBoxEmail(body);
          if (body === null) {
            return;
          }

          const html = `Dont forget to grant access for the recipients!
                        <br /><br />
                        <div class="form-group">
                          <label for="nubox-label"><b>Label:</b></label>
                          <input type="text" class="form-control" id="nubox-label" placeholder="${emailData.subject}" readonly>
                        </div>`;

          gmail.tools.add_modal_window('Encrypt with nuBox', html,
            () => {
                gmail.tools.remove_modal_window();
            });
        }
      }, 500);
    });
  },

  decryptEmail: async (label, body, compose = false) => {
    // Validate label.
    if (label === undefined ||
        label === null ||
        label.trim().length === 0) {
      throw new Error('Subject cannot be empty!');
    }

    try {
      body = nuBoxGmail.isNuBoxEmail(body);
      if (body === null) {
        return null;
      }

      // Decrypt the body with NuCypher.
      const encrypted = emoji.decode(body).toString();
      const decrypted = await nuBox.decrypt(encrypted, label);

      // after decryting, remove the grant.
      // since if the user tries to encrypt again, another grant is automatically requested.
      if (compose) {
        const bob = await nuBox.getBobKeys();
        await nuBox.revoke(label, bob.bvk, true /* noPopup */);
      }

      return Buffer.from(decrypted, 'base64').toString();
    } catch (err) {
      console.log(err);
      throw new Error('Something went wrong while decrypting!');
    }
  },

  encryptEmail: async (composeRef) => {
    // Use the email subject as label.
    const label = composeRef.subject();
    if (label === undefined || label === null || label.trim().length === 0) {
      gmail.tools.add_modal_window('Encrypt with nuBox', 'Subject cannot be empty!',
        () => {
            gmail.tools.remove_modal_window();
        });
      return;
    }

    // Retrieve the email body.
    const body = composeRef.body();

    try {
      // Encrypt the body with NuCypher.
      const encrypted = await nuBox.encrypt(body, label);

      // Encode the text to emojis!
      const header = Buffer.from(nuBoxGmail.key).toString('base64');
      const headerEmoji = emoji.encode(header).toString() + emoji.encode(encrypted).toString();
      composeRef.body(headerEmoji);

      // Grant approval for this user (so he/she can read his own emails).
      const bob = await nuBox.getBobKeys();
      await nuBox.grant(label, bob.bek, bob.bvk, '3017-01-01 00:00:00', true /* noPopup */);

    } catch (err) {
      console.log(err);
      composeRef.body(body);

      gmail.tools.add_modal_window('Encrypt with nuBox', 'Something went wrong while encrypting!',
        () => {
            gmail.tools.remove_modal_window();
        });
    }
  },

  getUserEmail: () => {
    return gmail.get.user_email();
  },
};

nuBoxGmail.init();

module.exports = nuBoxGmail;
