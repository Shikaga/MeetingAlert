const {google} = require('googleapis');

//Find your client id and secret at:
    //https://developers.google.com/calendar/api/quickstart/nodejs
    //https://console.developers.google.com/apis/credentials
const credentials = require('./credentials.json');

//Create and export Authenticator class
module.exports = class Authenticator {
    constructor() {
        this.oauth2Client = null;
        this.codePromise = null;
    }

    async getAuthenticatedClientOnce() {
        if (!this.oauth2Client) {
            this.oauth2Client = await this.getAuthenticatedClient();
        }
        return this.oauth2Client;
    }
    
    //get an authenticated oAuth2Client
    async getAuthenticatedClient() {
        const oauth2Client = this.getOauth2Client();
        const code = await this.getAuthenticationCode(oauth2Client);
        //bb(oauth2Client, code);
        await this.getToken(oauth2Client, code);
        return oauth2Client;
    }
    
    getOauth2Client() {
        // Create an OAuth2 client object
        const oauth2Client = new google.auth.OAuth2(
            credentials.client_id,
            credentials.client_secret,
            credentials.redirect_uris[0]
        );
        return oauth2Client;
    }
    
    async getAuthenticationCode(oauth2Client) {
        // Generate an authorization URL
        const authUrl = oauth2Client.generateAuthUrl({
            access_type: "offline",
            scope: ["https://www.googleapis.com/auth/calendar.readonly"]
        });
        
        // Prompt the user to visit the URL and grant access
        console.log("Authorize this app by visiting this url:", authUrl);
        return await new Promise((resolve, reject) => {
            this.codePromise = resolve;
        });
    }
    
    async requestInput() {
        const readline = require("readline");
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
    }
    
    async getToken(oauth2Client, code) {
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
}



