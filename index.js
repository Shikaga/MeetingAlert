const {google} = require('googleapis');
const {getAuthenticatedClientOnce} = require('./authentication.js');
const commands = require('./commands.json');
const configuration = require('./configuration.json');

async function run() {
    const oauth2Client = await getAuthenticatedClientOnce();
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
    filteredEvents = events.filter(event => getSelfFromAttendees(event.attendees).responseStatus != "declined");
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

setInterval(() => {
    run();
}, configuration.cadenceInMiutesToPollForMeetingStatus * 60 * 1000);
run();