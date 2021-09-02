var FirebaseConfig = {
    apiKey: process.env.API_KEY,
    authDomain: process.env.AUTH_DOMAIN,
	projectId: process.env.PROJECT_ID,
	databaseURL: process.env.DATABASE_URL,
    storageBucket: process.env.STORAGE_BUCKET,
    messagingSenderId: process.env.MESSAGING_SENDER_ID,
    appId: process.env.APP_ID
};

 
const Options = {

	"maxAge": 1000 * 60 * 15 * 4 * 24 * 15, // would expire after 15 days		////// OPTIONS DE JWT//////
	"httpOnly": true, // The cookie only accessible by the web server
	"signed": false, // Indicates if the cookie should be signed
	
	"path": "/",
	"withCredentials": true, 
	"Secure": false, 

	
};

module.exports = {Options, FirebaseConfig}