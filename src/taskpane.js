/* global Office, document, fetch */
import React from 'react';
import ReactDOM from 'react-dom/client'; // React 18 for concurrent rendering
import Sidebar from './sidebar.js'; // Your file name
import { parseBody } from './parsing.js'; // Assume path; adjust if utils/

// Azure creds from your registration
const clientId = '98596afd-6384-4a93-86b8-f12c305f5cf7';
const tenantId = '857631b2-f512-4a60-9fa8-c48bd2dd3f14';
const msalConfig = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: 'https://truerun.onrender.com' // Production URI
  }
};
import * as msal from "@azure/msal-browser";
const msalInstance = new msal.PublicClientApplication(msalConfig);
const loginRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read', 'Mail.Read']
};
async function getGraphToken() {
  try {
    let account = msalInstance.getActiveAccount();
    if (!account) {
      await msalInstance.loginPopup(loginRequest);
      account = msalInstance.getActiveAccount();
    }
    const response = await msalInstance.acquireTokenSilent({ ...loginRequest, account });
    return response.accessToken;
  } catch (error) {
    console.error('Token error:', error);
    return null;
  }
}
async function parseEmailBody() {
  const item = Office.context.mailbox.item;
  item.body.getAsync('text', async (bodyResult) => {
    if (bodyResult.status === Office.AsyncResultStatus.Succeeded) {
      let parsed = await parseBody(bodyResult.value);
      // Attachment parsing
      if (item.attachments && item.attachments.length > 0) {
        for (const att of item.attachments) {
          if (att.attachmentType === 'file' && (att.name.endsWith('.txt') || att.name.endsWith('.csv'))) { // Text-based
            att.getAsync(async (attResult) => {
              if (attResult.status === Office.AsyncResultStatus.Succeeded) {
                const attParsed = await parseBody(attResult.value); // Parse attachment content
                if (attParsed.containers.length > 0) {
                  // Trigger confirmation dialog
                  const confirmUrl = `assets/popup.html?type=attachment&containers=${encodeURIComponent(JSON.stringify(attParsed.containers))}&attachment=${att.name}&email=${item.subject}`;
                  Office.context.ui.displayDialogAsync(confirmUrl, { height: 30, width: 40 }, (res) => {
                    if (res.status === Office.AsyncResultStatus.Succeeded) {
                      const dialog = res.value;
                      dialog.addEventHandlerAsync(Office.EventType.DialogMessageReceived, async (arg) => {
                        dialog.close();
                        if (arg.message === 'confirmed') {
                          // Log confirmed to backend/dashboard
                          await fetch('https://truerun.onrender.com/api/confirm_attachment_containers', {
                            method: 'POST',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(attParsed)
                          });
                          parsed.containerDetails = [...(parsed.containerDetails || []), ...(attParsed.containerDetails || [])];
                        }
                      });
                    }
                  });
                }
              }
            });
          }
        }
      }
      // Novelty check after full parsing
      if (parsed.containers.length > 0) {
        const response = await fetch('https://truerun.onrender.com/api/check_novel_containers', {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ containers: parsed.containers })
        });
        const novel = await response.json().novel;
        if (novel.length > 0) localStorage.setItem('novelContainers', JSON.stringify(novel));
      }
      localStorage.setItem('parsedData', JSON.stringify(parsed)); // For sidebar
    }
  });
}
// On navigation away
function handleItemChanged() {
  const novel = JSON.parse(localStorage.getItem('novelContainers') || '[]');
  if (novel.length > 0) {
    const confirmUrl = `assets/popup.html?type=novel&containers=${encodeURIComponent(JSON.stringify(novel))}`;
    Office.context.ui.displayDialogAsync(confirmUrl, { height: 30, width: 40 }, (res) => {
      if (res.status === Office.AsyncResultStatus.Succeeded) {
        const dialog = res.value;
        dialog.addEventHandlerAsync(Office.EventType.DialogMessageReceived, async (arg) => {
          dialog.close();
          if (arg.message === 'confirmed') {
            await fetch('https://truerun.onrender.com/api/confirm_novel_containers', {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ containers: novel })
            });
            localStorage.removeItem('novelContainers');
          }
        });
      }
    });
  }
  parseEmailBody(); // Re-parse new item
}
Office.onReady((info) => {
  if (info.host === Office.HostType.Outlook) {
    document.getElementById('sideload-msg').style.display = 'none';
    document.getElementById('app-body').style.display = 'flex';
    const root = ReactDOM.createRoot(document.getElementById('root'));
    root.render(<Sidebar />);
    Office.context.mailbox.addHandlerAsync(Office.EventType.ItemChanged, handleItemChanged);
    parseEmailBody(); // Initial parse
  }
});
// Export for potential use; but primary logic in functions.js via LaunchEvent
export { getGraphToken, parseBody };