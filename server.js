const express = require('express');
var bodyParser = require('body-parser');
var path = require('path');
var cors = require('cors');
const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');
//
const app = express();
const port = process.env.PORT || 3000;
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = 'token.json';
const spreadsheetId = '168mpLILWGBmWJiqXbtla1qlex59E6Cvnpjyst6c9U1c';

// Serve the files on port
const server = app.listen(port, function () {
  console.log(`We started a server at port ${server.address().port} \n`);
});
var corsOptions = {
  origin: '*',
  optionsSuccessStatus: 200,
}
app.use(express.static(path.join(__dirname, 'app')));
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.get('/', cors(corsOptions), function (req, res) {
  res.sendFile(__dirname + '/app/index.html');
});
app.get('/test', cors(corsOptions), function (req, res) {
  res.status(200).send('connected');
});


// ==================================== API TO GET DATA ====================================
// app.set('view engine, 'ejs);

app.get('/getData', cors(corsOptions), function (req, res) {

  // Authorization
  fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Sheets API.
    authorize(JSON.parse(content), datapull);
  });

  // Callback function pulling data
  function datapull(auth) {
    const sheets = google.sheets({ version: 'v4', auth });
    var result = sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: 'LabcrawlResponse!A2:E',
    }, (err, response) => {
      if (err) return console.log('The API returned an error: ' + err);

      const rows = response.data.values;

      var responseArray = [];
      for (index in rows) {
        var responseObj = {};
        responseObj.created = rows[index][0];
        var date = new Date(rows[index][0]);
        responseObj.createdDate = date.getDate();
        responseObj.createdTime = date.getTime();
        responseObj.question = rows[index][1];

        switch (rows[index].length) {
          case 3:
            responseObj.questionType = 0;
            responseObj.answer = rows[index][2].trim();
            break;
          case 4:
            responseObj.questionType = 1;
            responseObj.answer = rows[index][3].trim();
            break;
          case 5:
            responseObj.questionType = 2;
            responseObj.answer = rows[index][4].trim();
            break;
        }
        responseArray.push(responseObj);
      }

      saveToFile(responseArray, function (err) {
        if (err) {
          res.status(500);
          throw new Error('JSON NOT SAVED')
        }
        res.status(200).send('JSON SAVED');
      });

      // res.status(200).send(JSON.stringify(responseArray));
    });
  }

});

function saveToFile(rows, callback) {
  fs.writeFile('./app/labcrawlResponse.json', JSON.stringify(rows), callback);
}

// ==================================== STARTING FUNCTIONS ====================================

// Load client secrets from a local file.
// fs.readFile('credentials.json', (err, content) => {
//   if (err) return console.log('Error loading client secret file:', err);
//   // Authorize a client with credentials, then call the Google Sheets API.
//   authorize(JSON.parse(content), listMajors);
// });

// function listMajors(auth) {
//   const sheets = google.sheets({version: 'v4', auth});
//   sheets.spreadsheets.values.get({
//     spreadsheetId: spreadsheetId,
//     range: 'LabcrawlResponse!A2:E',
//   }, (err, res) => {
//     if (err) return console.log('The API returned an error: ' + err);
//     const rows = res.data.values;
//     if (rows.length) {
//       console.log('OK:');
//     } else {
//       console.log('No data found.');
//     }
//   });
// }

// ==================================== HELPER FUNCTIONS ====================================

function authorize(credentials, callback) {
  const { client_secret, client_id, redirect_uris } = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}