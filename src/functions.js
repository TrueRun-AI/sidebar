/* global Office, fetch */

// From taskpane.js (import if bundled; otherwise duplicate if needed)
async function getGraphToken() {
  // ... (copy the getGraphToken function here if not imported)
}

async function parseBody(body) {
  // ... (assume imported or copy from parsing.js)
}

function onMessageRead(event) {
  const token = getGraphToken();
  if (!token) {
    event.completed();
    return;
  }
  Office.context.mailbox.item.body.getAsync('text', async (result) => {
    if (result.status === Office.AsyncResultStatus.Succeeded) {
      const parsed = await parseBody(result.value);
      if (parsed.containers.length > 0) {
        fetch('https://truerun.onrender.com/api/parse_email', { // Update to production
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsed)
        }).catch(error => console.error('Parse error:', error));
      }
    }
    event.completed();
  });
}

function validateBeforeSend(event) {
  Office.context.mailbox.item.body.getAsync('text', async (result) => {
    if (result.status === Office.AsyncResultStatus.Succeeded) {
      const parsed = await parseBody(result.value);
      if (parsed.hasImmediatePull && parsed.containers.length > 0) {
        const statuses = parsed.containerDetails || [];
        const unreleased = statuses.filter(s => s.release_status.toLowerCase() === 'not released');
        if (unreleased.length > 0) {
          const popupUrl = `assets/popup.html?containers=${encodeURIComponent(JSON.stringify(unreleased.map(s => s.container_number)))}`;
          Office.context.ui.displayDialogAsync(popupUrl, { height: 30, width: 30 }, (res) => {
            if (res.status === Office.AsyncResultStatus.Failed) {
              event.completed({ allowEvent: false, errorMessage: 'Popup failed!' });
              return;
            }
            const dialog = res.value;
            dialog.addEventHandlerAsync(Office.EventType.DialogMessageReceived, (arg) => {
              dialog.close();
              if (arg.message === 'confirmed') {
                fetch('https://truerun.onrender.com/api/log_dry_run_prevention', {
                  method: 'POST',
                  credentials: 'include',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ containers: unreleased.map(s => s.container_number), prevented: true })
                }).then(() => {
                  event.completed({ allowEvent: true });
                }).catch(error => {
                  console.error('Log error:', error);
                  event.completed({ allowEvent: false, errorMessage: 'Logging failed!' });
                });
              } else {
                event.completed({ allowEvent: false, errorMessage: 'Unreleased detected!' });
              }
            });
          });
          return; // Wait for popup
        }
      }
      event.completed({ allowEvent: true });
    } else {
      event.completed({ allowEvent: false });
    }
  });
}