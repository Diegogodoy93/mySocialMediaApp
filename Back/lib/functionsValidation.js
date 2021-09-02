
//Regex Email
function validateEmail(strEmail) {
    let emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
    return emailRegex.test(strEmail);
}
//Regex password
function validatePsw(strPsw) {
    let pswRegex = /^(?=.*[0-9]+.*)(?=.*[a-zA-Z]+.*)[0-9a-zA-Z]{6,}$/;   //Contraseña que debe tenemos una longitud mínima de 5 caracteres y debe contener al menos un número
    return pswRegex.test(strPsw);
}
//Funcion de validación de Email && Password 
function validateCredentials(strEmail, strPsw){
    return (validatePsw(strPsw) && validateEmail(strEmail));
}

const isEmpty = (string) => {
    if(typeof string !== 'string') throw "isEmpty: param not of type string." 
    if(!string || string.trim() === '') {
      return true
    }
    return false
}

module.exports = {validateCredentials, validateEmail, validatePsw, isEmpty}