const tools = require('./tools');

const express = require('express');
const app = express();
const Promise = require('bluebird');

const mime = require('mime');

app.listen(80);

app.get('/', (req, res, next) => {

	// URL needs to be defined to function
	if (typeof req.query.url === "undefined") {
		return res.json({ status: 'error', message: 'url must be defined' });
	}

	// If name is not specified, substring the provided URL to get a name
	if (typeof req.query.name === "undefined") {
		name = (req.query.url).substr((req.query.url).lastIndexOf('/') + 1).replace(/\.[^/.]+$/, "");
	}
	else {
		name = req.query.name;
	}
 
	var get_file_details = tools.get_remote_file(req.query.url);

	var process_file = get_file_details.then(file => {
		let extension = mime.getExtension(file.mimetype);
		if (extension === "jpeg") { extension = "jpg"; }

		return {
			extension: extension,
			mime_type: file.mimetype,
			length: file.length,
			name: name,
			body: file.body
		};
	});

	var auth_client = tools.init_oauth_client();

	Promise.join(
		process_file, auth_client, function(put_data, auth) {
			tools.gdrive_upload_file(auth, put_data).then(remote_file => {
				return res.json({
					status: 'success',
					file: remote_file
				});
			});
		}
	).catch(error => {
		return res.json({ status: 'error', message: error });
	});

});