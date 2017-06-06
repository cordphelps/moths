//
// image processor
//
// https://cloud.google.com/vision/docs/reference/libraries
// 
// npm install --save @google-cloud/vision
// ... install google cloud SDK, then
// downloading python 2.7.13....
// downlaoding the cloud tools package...
// gcloud auth application-default login
// You are now authenticated with the Google Cloud SDK! (https://cloud.google.com/sdk/auth_success)
//
// npm install --save @google-cloud/storage


var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

// Imports the Google Cloud client library
const Storage = require('@google-cloud/storage');
const Vision = require('@google-cloud/vision');

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/sheets.googleapis.com-nodejs-quickstart.json

var SCOPES = ['https://www.googleapis.com/auth/drive'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'drive.googleapis.com-nodejs-quickstart.json';

var FOLDER_ID = '0Bw4DMtLCtPMkRzh4b2ZDYjFId3c';



// evaluate the command line
//
const optionDefinitions = [
  { name: 'fileID', alias: 'f', type: String, multiple: false },
  { name: 'help', alias: 'h', type: Boolean, defaultValue: false }
];

var OPTIONS_LIST = 'usage: $ node vision.js -f <fileID> -h';

// https://www.npmjs.com/package/command-line-args
// sudo npm install command-line-args --save
const commandLineArgs = require('command-line-args');

var options = commandLineArgs(optionDefinitions, { partial: true });

if (options.help == true) {
  console.log(OPTIONS_LIST);
  return;
}


if (options.fileID == undefined) {
  //options.src_dir = DEFAULT_SRC_DIR;
  console.log("no action taken; '-f <fileID>' is required");
  displayOptions(options);
  return
} else {
  // TODO(?): ensure that illegal characters are stripped out (existing stringify() does not suffice)
}



// Load client secrets from a local file.
fs.readFile('client_secret_sheetsDriveVision.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the
  // Google Sheets API.
  authorize(JSON.parse(content), doVision);
});

//doVision()




function doVision(auth) {

  var drive = google.drive({ version: 'v3'});

  var imageURI = '';

    drive.files.get({
      auth: auth,
      fileId: options.fileID,
      //fields: 'webContentLink'  // <-- downloads the file
      fields: 'webViewLink'       // <-- "views" the file
    },
    function(err, response) {
      if (err) {
        console.log('drive.files.get error: %s %s', err, response);
        return;
      } else {
        // file create success; get properties
        console.log('get properties\n %s', JSON.stringify(response));
        // response.webViewLink: https://drive.google.com/file/d/0Bw4DMtLCtPMkOTlXR1l4Nkw1WGs/view?usp=drivesdk
        imageURI = response.webViewLink;

        console.log('imageURI: %s' , imageURI);

        // Your Google Cloud Platform project ID
        const projectId = 'proud-storm-169414';

        // Instantiates a client
        const storage = Storage();
        const visionClient = Vision({
          projectId: projectId
        });

        // The name of the image file to annotate
        //const fileName = './resources/wakeupcat.jpg';
        
        // https://cloud.google.com/vision/docs/request#providing_the_image
        var fileName = imageURI;

        // Performs text detection on the remote file
        
        const vision = Vision({
          projectId: projectId
        });
        //vision.detectText('https://drive.google.com/file/d/0Bw4DMtLCtPMkWVlIVXE5a2ZpQlU/view?usp=drivesdk')
        vision.detectText('http://www.identifont.com/samples/houseindustries/NeutraText.gif')
        //vision.detectText(storage.bucket().file('https://drive.google.com/file/d/0Bw4DMtLCtPMkWVlIVXE5a2ZpQlU/view?usp=drivesdk'))
          .then((results) => {
            const detections = results[0];
            console.log('Text:');
            detections.forEach((text) => console.log(text));
          })
          .catch((err) => {
            console.error('ERROR:', err);
          });
        

        // this might be "client library' request mode
        //var fileName = '/Users/rcphelps/Downloads/temp2/lovelock.png'
        // Performs label detection on the image file
        //visionClient.detectLabels(fileName)
          //.then((results) => {
            //const labels = results[0];

            //console.log('Labels:');
            //labels.forEach((label) => console.log(label));
          //})
          //.catch((err) => {
            //console.error('ERROR:', err);
          //});








      }
    });



  }


function displayOptions(options) {
  
  console.log('image directory: %s', options.src_dir);
  console.log('verbose: %s', options.verbose);
  console.log('delete: %s', options.delete);
  console.log('help: %s', options.help);

  if (options.verbose == true) {
    console.log('_unknown: %s', options._unknown);
    console.log(stringify(options));
  }

}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 *
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  var clientSecret = credentials.installed.client_secret;
  var clientId = credentials.installed.client_id;
  var redirectUrl = credentials.installed.redirect_uris[0];
  var auth = new googleAuth();
  var oauth2Client = new auth.OAuth2(clientId, clientSecret, redirectUrl);

  console.log('token path %s', TOKEN_PATH);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, function(err, token) {
    if (err) {
      getNewToken(oauth2Client, callback);
    } else {
      oauth2Client.credentials = JSON.parse(token);
      callback(oauth2Client);
    }
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 *
 * @param {google.auth.OAuth2} oauth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback to call with the authorized
 *     client.
 */
function getNewToken(oauth2Client, callback) {
  var authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl);
  var rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  rl.question('Enter the code from that page here: ', function(code) {
    rl.close();
    oauth2Client.getToken(code, function(err, token) {
      if (err) {
        console.log('Error while trying to retrieve access token', err);
        return;
      }
      oauth2Client.credentials = token;
      storeToken(token);
      callback(oauth2Client);
    });
  });
}

/**
 * Store token to disk be used in later program executions.
 *
 * @param {Object} token The token to store to disk.
 */
function storeToken(token) {
  try {
    fs.mkdirSync(TOKEN_DIR);
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err;
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token), function(err) {
    if(err) {
      return console.log('writeFile err %s', err);
    }
    console.log("The file was saved!");
  });

  console.log('Token stored to ' + TOKEN_PATH);
}

