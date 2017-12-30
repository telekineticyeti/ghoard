const Promise = require('bluebird');
const request = Promise.promisify(require("request"));

const readline = require('readline');
const google = require('googleapis');
const googleAuth = require('google-auth-library');
const fs = require('fs');
const read_file = Promise.promisify(require("fs").readFile);
const write_file = Promise.promisify(require("fs").writeFile);

var scopes = ['https://www.googleapis.com/auth/drive'];
var token_file = './oauth_token.json';

module.exports = {

	get_remote_file: function (uri) {
		return new Promise((resolve, reject) => {
			let request_options = {
				uri: uri,
				followAllRedirects: true,
				encoding: null
			};

			request(request_options)
				.then(response => {
					if (response.statusCode !== 200) {
						reject('File does not exist');
					}
					let object = {
						mimetype: response.headers['content-type'],
						length: response.headers['content-length'],
						body: response.body
					}
					resolve(object);
				})
				.catch((error) => {
					reject(error);
				});
		});
	},

	init_oauth_client: function() {
		return new Promise((resolve, reject) => {
			if (typeof process.env.GOOGLE_API_CLIENT_SECRET === "undefined" ||
				typeof process.env.GOOGLE_API_CLIENT_ID === "undefined" ||
				typeof process.env.GOOGLE_API_REDIRECT_URI === "undefined") {
				reject('There was a problem accessing the api client details from environment variables.');
			} 

			var client_secret = process.env.GOOGLE_API_CLIENT_SECRET,
				client_id = process.env.GOOGLE_API_CLIENT_ID,
				redirect_uri = process.env.GOOGLE_API_REDIRECT_URI;

			var auth = new googleAuth();
			var oauth2Client = new auth.OAuth2(client_id, client_secret, redirect_uri);

			read_file(token_file).then(contents => {
				return contents;
			}).then(result => {
				oauth2Client.credentials = JSON.parse(result);
				console.log('Loading succeeded: ', token_file);
				resolve(oauth2Client);
			}).catch(error => {
				var authUrl = oauth2Client.generateAuthUrl({
					access_type: 'offline',
					scope: scopes
				});
				console.log('Authorize this app by visiting this url: ');
				console.log(authUrl);
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
						fs.writeFile(token_file, JSON.stringify(token));
						console.log('Token stored to ' + token_file);
						resolve(oauth2Client);
					});
				});

			});
		});
	},

	gdrive_upload_file: function (auth, file) {
		return new Promise((resolve, reject) => {
			var create_file_request = {
				auth: auth,
				resource: {
					name: file.name + '.' + file.extension
				},
				media: {
					mimeType: file.mime_type,
					body: file.body
				},
				fields: 'id'
			}

			var service = google.drive('v3');

			service.files.create(create_file_request, function (error, remote_file) {
				if (!error) {
					resolve(remote_file);
				} else {
					reject(error);
				}
			});

		});
	}

};