const fs = require('fs')
//String random id 
const RandomId = () => {

    return `${Math.floor(Math.random() * 1000000000000)}`;
}


const base64_encode = (file) => {
    // read binary data
    var bitmap = fs.readFileSync(file);
    // convert binary data to base64 encoded string
    //return new Buffer.alloc(100000, bitmap, "hex").toString('base64');
    return Buffer(bitmap).toString('base64')
}

module.exports = {RandomId, base64_encode}