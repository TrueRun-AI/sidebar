/* global Office, document, fetch */
import React from 'react';
import ReactDOM from 'react-dom';
import Sidebar from './components/Sidebar.jsx';
import { parseBody } from './utils/parsing.js'; // Now async

// Azure creds from your registration
const clientId = '98596afd-6384-4a93-86b8-f12c305f5cf7';
const tenantId = '857631b2-f512-4a60-9fa8-c48bd2dd3f14';
const msalConfig = {
  auth: {
    clientId,
    authority: `https://login.microsoftonline.com/${tenantId}`,
    redirectUri: 'https://truerun.onrender.com' // Updated to production URI; adjust if local
  }
};

import * as msal from "@azure/msal-browser";
const msalInstance = new msal.PublicClientApplication(msalConfig);
const loginRequest = {
  scopes: ['openid', 'profile', 'email', 'User.Read', 'Mail.Read'] // Removed 'offline_access'
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

Office.onReady((info) => {
  if (info.host === Office.HostType.Outlook) {
    document.getElementById('sideload-msg').style.display = 'none';
    document.getElementById('app-body').style.display = 'flex';
    ReactDOM.render(<Sidebar />, document.getElementById('root'));
    Office.context.mailbox.addHandlerAsync(Office.EventType.ItemChanged, parseEmailBody);
    parseEmailBody(); // Initial parse
    // Event handlers now in functions.js via LaunchEvent
  }
});

// Export for potential use; but primary logic in functions.js
export { getGraphToken, parseBody };