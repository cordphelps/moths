//
// image uploader
// 
// primary function
// - verify multipart fields
// - verify images
// - upload multipart
// - copy images to google-drive repo
// - copy transaction log (multipart content and image file names) to google-drive repo
//
// secondary function
// - delete local images
//
//
//
// https://developers.google.com/sheets/api/quickstart/nodejs
//

var fs = require('fs');
var readline = require('readline');
var google = require('googleapis');
var googleAuth = require('google-auth-library');

// If modifying these scopes, delete your previously saved credentials
// at ~/.credentials/sheets.googleapis.com-nodejs-quickstart.json

var SCOPES = ['https://www.googleapis.com/auth/drive'];
var TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/';
var TOKEN_PATH = TOKEN_DIR + 'drive.googleapis.com-nodejs-quickstart.json';

var FOLDER_ID = '0Bw4DMtLCtPMkRzh4b2ZDYjFId3c';
var FIELD_DATA = 'default_field_data';


// evaluate the command line
//
const optionDefinitions = [
  { name: 'src_dir', alias: 's', type: String, multiple: false },
  { name: 'multipart', alias: 'm', type: String, multiple: true },
  { name: 'delete', alias: 'd', type: Boolean, defaultValue: false },
  { name: 'verbose', alias: 'v', type: Boolean, defaultValue: false },
  // { name: 'timeout', alias: 't', type: Number, defaultValue: '222' },
  { name: 'help', alias: 'h', type: Boolean, defaultValue: false }
];

var OPTIONS_LIST = 'usage: $ node upload.js -s <source content directory> -m <field data> -v -d -h';

// https://www.npmjs.com/package/command-line-args
// sudo npm install command-line-args --save
const commandLineArgs = require('command-line-args');

var options = commandLineArgs(optionDefinitions, { partial: true });

if (options.help == true) {
  console.log(OPTIONS_LIST);
  return;
}


if (options.src_dir == undefined) {
  //options.src_dir = DEFAULT_SRC_DIR;
  console.log("no action taken; '-s /fullpath/dir' is required to define the image source directory");
  displayOptions(options);
  return
} else {
  // TODO(?): ensure that illegal characters are stripped out (existing stringify() does not suffice)
}

if (options.multipart == undefined) {
  options.multipart = FIELD_DATA;
}


// Load client secrets from a local file.
fs.readFile('client_secret_drive.json', function processClientSecrets(err, content) {
  if (err) {
    console.log('Error loading client secret file: ' + err);
    return;
  }
  // Authorize a client with the loaded credentials, then call the
  // Google Sheets API.
  authorize(JSON.parse(content), uploadImages);
});




function uploadImages(auth) {


   // https://developers.google.com/drive/v3/web/folder
  var fileCounter = 0;

  var d = new Date();
  var unique_folder_name = options.multipart + '-' + d.toISOString();

  var drive = google.drive({ version: 'v3'});
  var fileMetadata = {
    'name' : unique_folder_name,
    'mimeType' : 'application/vnd.google-apps.folder',
    parents: [ FOLDER_ID ]
  };

  drive.files.create({ resource: fileMetadata, fields: 'id', auth: auth}, 
    function(err, file) {

      if (err) {
        // Handle error
        console.log(err);
      } else {

        console.log("checking local directory %s", options.src_dir);

          // client folder exists ?
          // https://www.tutorialspoint.com/nodejs/nodejs_file_system.htm
        fs.readdir(options.src_dir, function(err, files_array){

          if (err) {
            console.log('directory scr_dir: %s not found', options.src_dir);
            return console.error(err);
          }

          console.log('new folder Id: %s', file.id);


          files_array.forEach( function (sourceFile){

            d = new Date();
            var unique_file_name = d.toISOString() + sourceFile;

            var newFileMetadata = {
              'name': unique_file_name,
              description: options.multipart,
              parents: [ file.id ]
              // parents: [ '0Bw4DMtLCtPMkVFdfQnBxcXdxYUU' ]
            };

            var media = {
              mimeType: 'image/png',
              // mimeType: 'image/jpeg',
              //body: fs.createReadStream(file)
              // body: fs.createReadStream(options.src_dir + '/' + file)
              // body: fs.createReadStream(sourceFile)
              body: fs.createReadStream(options.src_dir + '/' + sourceFile)
            };

            if (options.verbose == true) {
              console.log( 'sourceFile: %s', sourceFile );
            }

            // copy file from macOS to google-drive
            // https://www.npmjs.com/package/googleapis#example-upload-an-image-to-google-drive-from-a-readable-stream
 
            // OPTIONS are defined at https://developers.google.com/drive/v3/reference/files#resource
            
            console.log('\nunique filename: %s', unique_file_name);
            console.log('create source: %s', options.src_dir + '/' + sourceFile);
            console.log('parent: %s \n', file.id);

            drive.files.create({
              auth: auth,
              resource: newFileMetadata,
              media: media,
              fields: 'id'
              },
              function(err, response) {
                if (err) {
                  console.log('drive.files.create error: %s %s', err, response);
                  return;
                  }
              }
            );  // end of drive.files.create()

            console.log('origin: %s', options.src_dir + '/' + file);

            fileCounter++;

          }); // end of .foreach

        }) // end of source directory read

      } // end of drive.files.create(function) else

    }); // end of drive.files.create() 

    if (options.verbose == true) {
        console.log('%s files found', fileCounter);
    }


} // end of uploadImages()


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

