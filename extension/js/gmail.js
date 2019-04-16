const { Gmail } = require('gmail-js');
const gmail = new Gmail();

const nuBoxGmail = {
  init: () => {
    gmail.observe.on('compose', function(compose, type) {
      // Add button to the "Compose Email".
      const composeRef = gmail.dom.composes()[0];

      gmail.tools.add_compose_button(composeRef, 'Encrypt with nuBox', () => {
        // Use the email subject as label.
        const label = composeRef.subject();
        if (label === undefined || label === null || label.trim().length === 0) {
          gmail.tools.add_modal_window('Encrypt with nuBox', 'Subject cannot be empty!',
            () => {
                gmail.tools.remove_modal_window();
            });
          return;
        }

        // TODO: Encrypt the body with NuCypher.
        const body = composeRef.body();

      }, 'nubox-r-c-btn-r');
    });
  },

  getUserEmail: () => {
    return gmail.get.user_email();
  },
};

nuBoxGmail.init();

module.exports = nuBoxGmail;
