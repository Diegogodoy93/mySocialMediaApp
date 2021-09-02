const base64 = require("base-64");
const crypto = require("crypto");
require("dotenv").config();






//secreto del servidor
const SECRET = process.env.SECRET;


//función para eliminar los signos = + \ del string
function encodeBase64(string) {
	const encodedString = base64.encode(string);
	const parsedString = encodedString
		.replace(/=/g, "")
		.replace(/\+/g, "-")
		.replace(/\//g, "_");
	return parsedString;
}


//Función decodificadora de base64
function decodeBase64(base64String) {
	const decodedString = base64.decode(base64String);
	return decodedString;
}

//Función generadora de JWTs
function generateJWT(Payload) {
	const header = {
		"alg": "HS256",
		"typ": "JWT"
	};
	const base64Payload = encodeBase64(JSON.stringify(Payload));
	const base64Header = encodeBase64(JSON.stringify(header));
	const signature = encodeBase64(hash(`${base64Header}.${base64Payload}`));
	const JWT = `${base64Header}.${base64Payload}.${signature}`;
	return JWT;
}

//Función de encriptación de string
function hash(string) {
	const hashedString = crypto
		.createHmac("sha256", SECRET)
		.update(string)
		.digest("base64");
	return hashedString;
}

//Función de verificación del JWT 
function verifyJWT(jwt) {
	const [header, payload, signature] = jwt.split(".");
	if (header && payload && signature) {
		const expectedSignature = encodeBase64(hash(`${header}.${payload}`));
		if (expectedSignature === signature) {
			return true;
		}
	}
	return false;
}
//Función para obtener la info contenida en el JWT 
function getJWTInfo(jwt) {
    
    const payload = jwt.split(".")[1];
	if (payload) {
		try {
			const data = JSON.parse(decodeBase64(payload));
			return data;
		} catch (e) {
			return null;
		}
	}
	return null;
}
// Función de verificación de contraseña
function verifyPassword(string, realPassword) {
    return encryptPassword(string, realPassword.salt).password === realPassword.password;

}
// Función de encriptación de contraseña
function encryptPassword(string, salt = crypto.randomBytes(128).toString("hex")) {
    let saltedPassword = hash(salt + string + salt, SECRET);
    return { password: saltedPassword, salt };
}



module.exports = {"generateJWT" : generateJWT, "verifyJWT" : verifyJWT, "getJWTInfo" : getJWTInfo, "encryptPassword" : encryptPassword, "verifyPassword" : verifyPassword};