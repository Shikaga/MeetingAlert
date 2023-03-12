const {google} = require('googleapis');

//Find your client id and secret at:
    //https://developers.google.com/calendar/api/quickstart/nodejs
    //https://console.developers.google.com/apis/credentials
const credentials = require('./credentials.json');

//get an authenticated oAuth2Client
async function getAuthenticatedClient() {
    const oauth2Client = getOauth2Client();
    const code = await getAuthenticationCode(oauth2Client);
    //bb(oauth2Client, code);
    await getToken(oauth2Client, code);
    return oauth2Client;
}

function getOauth2Client() {
    // Create an OAuth2 client object
    const oauth2Client = new google.auth.OAuth2(
        credentials.web.client_id,
        credentials.web.client_secret,
        credentials.web.redirect_uris[0]
    );
    return oauth2Client;
}

async function getAuthenticationCode(oauth2Client) {
    // Generate an authorization URL
    const authUrl = oauth2Client.generateAuthUrl({
        access_type: "offline",
        scope: ["https://www.googleapis.com/auth/calendar.readonly"]
    });
    
    // Prompt the user to visit the URL and grant access
    console.log("Authorize this app by visiting this url:", authUrl);
    const code = await requestInput();
    return code;
}

async function requestInput() {
    const readline = require("readline");
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    return new Promise((resolve, reject) => {
        rl.question("Enter the code from that page here: ", (code) => {
            rl.close();
            resolve(code);
        });
    });
}

async function getToken(oauth2Client, code) {
    return new Promise((resolve, reject) => {
        oauth2Client.getToken(code, (err, token) => {
            if (err) {
                console.error("Error retrieving access token", err);
                return;
            }
            oauth2Client.setCredentials(token);
            resolve(oauth2Client);
        });
    });
}

module.exports = {
    getAuthenticatedClient
}