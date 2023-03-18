const readline = require("readline");

const {google} = require('googleapis');
const Authenticator = require('./authentication.js');
const commands = require('./commands.json');
const configuration = require('./configuration.json');

let authentictor = new Authenticator();

//create an express server to handle the callback
const express = require("express");
const app = express();
const port = 3000;
app.listen(port, () => {
    console.log(`Listening at http://localhost:${port}`);
});

app.get("/callback", (req, res) => {
    res.send("You can close this window now.");
    const code = req.query.code;
    if (code) {
        console.log("Got code", code);
        authentictor.codePromise(code);
    } else {
        console.error("No code found");
    }
});

async function run() {
    authentictor = new Authenticator();
    const oauth2Client = await authentictor.getAuthenticatedClientOnce();
    requestCalendarEvents(oauth2Client);
}

function requestCalendarEvents(oauth2Client) {
    const calendar = google.calendar({version: "v3", auth: oauth2Client});

    //create a date starting 1 hour ago
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);

    calendar.events.list({
        calendarId: "primary",
        showDeleted: false,
        timeMin: oneHourAgo.toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: "startTime"
    }, (err, res) => {
        if (err) {
            console.error("The API returned an error: " + err);
            return;
        }
        const events = filterOutEvents(res.data.items)
        checkEvents(events);
    });
}

function getSelfFromAttendees(attendees) {
    return attendees.find(attendee => attendee.self);
}

function filterOutEvents(events) {
    let filteredEvents = events.filter(event => event.start.dateTime && event.end.dateTime);
    filteredEvents = events.filter(event => event.transparency !== "transparent");
    filteredEvents = events.filter(event => {
        if (!event.attendees) {
            return true;
        }
        return getSelfFromAttendees(event.attendees).responseStatus != "declined"
    });
    return filteredEvents;
}

function checkEvents(events) {
    if (events.length) {
        const now = new Date();
        const configuredTimeFromNow = new Date();
        configuredTimeFromNow.setMinutes(configuredTimeFromNow.getMinutes() + configuration.minutesToActivateBeforeMeeting);

        const meeting = events.find(event => {
            const start = new Date(event.start.dateTime);
            const end = new Date(event.end.dateTime);
            return start < configuredTimeFromNow && end > now;
        });

        if (meeting) {
            //print meeting summary

            console.log("You have a meeting now!", meeting.summary);
            runCommand("activate");
            //setTimeout(askUserForPause, 2000);
        } else {
            console.log("You don't have a meeting now.");
            runCommand("deactivate");
        }
    }
}

function runCommand(commandString) {
    const command = commands[commandString];

    const {exec} = require("child_process");
    exec(command, (err, stdout, stderr) => {
        if (err) {
            console.error(err);
            return;
        }
        console.log(stdout);
    });
}

//save the interval so we can clear it later
function startPolling() {
    const interval = setInterval(() => {
        run();
    }, configuration.cadenceInMiutesToPollForMeetingStatus * 60 * 1000);
    run();
}
function deactivateAndPausePolling() {
    runCommand("deactivate");
    clearInterval(interval);
    console.log("Paused");
    setTimeout(() => {
        console.log("Resuming");
        startPolling();
    }, 15 * 60 * 1000);
}

function askUserForPause() {
    //ask the user if they want to pause for 15 minutes

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    }); 
    rl.question("Do you want to pause for 15 minutes? (y/n) ", answer => {
        rl.close();
        console.log(`You answered ${answer}`);
        if (answer === "y") {
            deactivateAndPausePolling();
        }
        askUserForPause();
    });
}

startPolling();
askUserForPause();
