const mysql = require("mysql");




//función que recibe un array de objetos y un string que representa la propiedad de los objetos que queremos acceder. Devuelve un nuevo array compuesto de los valores de dichas llaves de cada uno de los objetos
const sqlArrayMap = (array, objectPropString) => {
	
	let newArray = []; 
	if(array.length) {
        
        array.map((element) => {
                    
            if (element[objectPropString]) {
                newArray.push(element[objectPropString])
            }
        })
        return newArray;
    
    } else {
        return newArray;
    }

	

} 

//función para generar peticiones de get All a SQL
const querySQL = (table, column, query) => {

	return `SELECT * from ${table} where ${column} = ${query}`


}

//Función para obtener los valores repetidos entre dos arrays (Si llega undefined/un array sin length devuelve un array vacío.)
const findDuplicates = (arr) => {
    
    if (!arr || !arr.length ){
        return [];
    } else {
        
        let sorted_arr = arr.slice().sort(); // You can define the comparing function here. 
        // JS by default uses a crappy string compare.
        // (we use slice to clone the array so the
        // original array won't be modified)
        let results = [];
        for (let i = 0; i < sorted_arr.length - 1; i++) {
          if (sorted_arr[i + 1] == sorted_arr[i]) {
            results.push(sorted_arr[i]);
          }
        }
        return results;
    }
    
	
}

//Función de conexión a la base de datos mediante promesa 
function PromiseConnectionDB(){
    return new Promise((resolve, reject) => {
        const DBconnection = connectionDB();
        if (DBconnection){
            DBconnection.connect(err => {
                if (err) {
                    reject("DBError");
                }
                resolve(DBconnection);
            });
        }
        else
            reject("DBError");
    });
        
}

function connectionDB() {
    return mysql.createConnection({
       
        "host"     : process.env.HOST_SQL,
        "user"     : process.env.USER_SQL,
        "password" : process.env.PASSWORD_SQL, 
        "database" : process.env.DATABASE_SQL,
        "multipleStatements" : true
    });
}




module.exports = {"sqlArrayMap": sqlArrayMap, "querySQL": querySQL, "findDuplicates": findDuplicates, "PromiseConnectionDB":PromiseConnectionDB, "connectionDB": connectionDB};

