const {google} = require('googleapis');
const {getAuthenticatedClient} = require('./authentication.js');

//call requestInput and wait for the result using await
async function run() {
    // Create an OAuth2 client object
    const oauth2Client = await getAuthenticatedClient();
    requestCalendarEvents(oauth2Client);
}

function requestCalendarEvents(oauth2Client) {
    // Use the access token to call the Google Calendar API
    const calendar = google.calendar({version: "v3", auth: oauth2Client});
    calendar.events.list({
      calendarId: "primary",
      timeMin: (new Date()).toISOString(),
      maxResults: 10,
      singleEvents: true,
      orderBy: "startTime"
    }, (err, res) => {
      if (err) {
        console.error("The API returned an error: " + err);
        return;
      }
      const events = res.data.items;
      if (events.length) {
        console.log("Upcoming 10 events:");
        events.map((event, i) => {
          const start = event.start.dateTime || event.start.date;
          console.log(`${start} - ${event.summary}`);
        });
      } else {
        console.log("No upcoming events found.");
      }
    });
}

run();