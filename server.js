//FUNCIONES: 
const SQL = require("./lib/functionsSql.js")
const JWT = require("./lib/functionsJWT.js");
const path = require('path')
// const randomstring = require("randomstring");
const {Profile, Scream, Comment, Like, Payload, Activity, Errors, Image} = require("./lib/classes")
const { isEmpty, validatePsw, validateEmail} = require("./lib/functionsValidation.js");
const {Options, FirebaseConfig} = require("./lib/constants")
const {RandomId, base64_encode} = require("./lib/functions.js")

const firebase = require('firebase');

const express = require("express");


const fs = require('fs') 
//socketio
const server = express();


const bodyParser = require("body-parser");   //Responsable del req.body etc 
const corsEnabled = require("cors");
const cookieParser = require("cookie-parser");
const listenPort = 5678;
require("dotenv").config();
// const publicFiles = express.static("public");
const { getJWTInfo } = require("./lib/functionsJWT.js");
//Format timestamps
const dayjs =require("dayjs") 
const relativeTime = require('dayjs/plugin/relativeTime');
dayjs.extend(relativeTime)



//MULTER// FILEUPLOAD => 
const multer = require('multer');


const storage = multer.diskStorage({  //dest: "uploads/"
    destination: (req, file, cb) => {
        cb(null, `./public/uploads/`) 
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname)
    }
})

// const storage = multer.memoryStorage()
 
const fileFilter = (req, file, cb) => {
    
    if(file.mimetype === 'image/jpeg' || file.mimetype === 'png') {
        cb(null, true)
    } else cb(null, false)

}
const upload = multer({
    storage: storage
    // limits: {
    //     fileSize: 1024 * 1024 * 5   // en bytes  
    // }, 
    // fileFilter : fileFilter
})    

// const upload = multer({

//     dest: 'uploads/'
// })

///////ESTAS FUNCIONES SE VAN A IR DE AQUÍ =>


//FIREBASE init
firebase.initializeApp(FirebaseConfig);
const dataBase = firebase.database();
//Storage init





// const Gc = new Storage({
//     keyFilename: path.join(__dirname, "./SMAadminFB.json"),
//     projectId: process.env.PROJECT_ID
// })

// Gc.getBuckets()



// admin.initializeApp({
//     credential: admin.credential.cert(storageKey)
// })
// const fireStoreDb = admin.firestore()
//config SQL sin esto no va

// const generalBucket = Gc.bucket('staging.mysocialmediaapp-75578.appspot.com') // ?







server.use(bodyParser.urlencoded({"extended":false}));  //<input type="text" class="form-control" placeholder='Text' name="comment[text]" value="<%=comment.text%>">    https://stackoverflow.com/questions/55558402/what-is-the-meaning-of-bodyparser-urlencoded-extended-true-and-bodypar
server.use(corsEnabled({
    origin:"http://localhost:3000", 
    credentials:true, 
    maxAge : 1000 * 60 * 15 * 4 * 24 * 15,
    signed : true, 
    path: "/"

}));
server.use(bodyParser.json());
server.use(express.static("public"));
server.use(cookieParser())

//RESET FIREBASE LIVEFEED => 
server.get('/reset', (req, res) => {
    dataBase.ref('LIVEFEED').set({})
    res.send({"res": "1", "msg": "Done!"})
})
//Llamada que se hace para ver si el usuario tiene una cookie válida / esta logged in
server.get('/loggedin', (req, res) => {
    if (!req.cookies.jwt || !JWT.verifyJWT(req.cookies.jwt)) return res.send({"res" : "0", "msg": "User is not logged in."})
    
    const {userId} = getJWTInfo(req.cookies.jwt)
    
    dataBase.ref(`PROFILES/${userId}`).once("value", snapshot => {        
        if(!snapshot.val()) return res.send({"res" : "0", "msg": "Profile doesn't exist."})      
        let profile = snapshot.val()
        
        res.send({"res" : "1", "msg": profile})
    })   
})

//Register
server.post("/register", (req, res) => { 
    
    let sql;
    let arrayVariables;
    const {name, familyName, email, password} = req.body;
    let errors = new Errors()

    if (isEmpty(name)) errors["name"] = "Name can't be empty."
    if (isEmpty(familyName)) errors["familyName"] = "Family name can't be empty."
    if (isEmpty(email)) errors["email"] = "Email can't be empty."
    if (isEmpty(password)) errors["password"] = "Password can't be empty."
    if (password && !validatePsw(password)) errors["password"] = "Wrong password format."           
    if (email && !validateEmail(email)) errors["email"] = "Wrong format for email or password." 
    if (errors.name || errors.familyName || errors.email || errors.password) return res.send({"res" : "0", "msg": errors});


            
    SQL.PromiseConnectionDB()
    .then((DBconnection) => {
        
        DBconnection.query(`SELECT * FROM users WHERE Email = ?;`, [email], (err, result) => {

            if (err)throw err
            if(result.length) {

                DBconnection.end()
                res.send({"res" : "0", "msg" : new Errors(null, null, "Email already in use")});

            } else {

                let pswObject = JWT.encryptPassword(password);
                arrayVariables = [new Date(),name, familyName, email, pswObject.password, pswObject.salt]
                sql = `INSERT INTO users (created_at, name, family_name, Email, passw, SALT) VALUES (?,?,?,?,?,?);`; //Esto tiene que cambiar.


                DBconnection.query(sql, arrayVariables, (err, result) => {

                    if(err) throw err
                    let payload = new Payload(result.insertId, email, name) //HAY QUE MIRAR ESTO <=                    
                    dataBase.ref(`PROFILES/${result.insertId}`).set(new Profile(name, result.insertId));
                    res.cookie("jwt", JWT.generateJWT(payload),Options).send({"res": "2", "msg": `new user registered`});                                                                  
                    
                    DBconnection.end()
                })
            }                       
        })
    }).catch(e => res.send({"res": "0", "msg": e}))
});


//Login

server.post("/login", (req, res) => {
    let errors = new Errors()   
    const {email, password} = req.body;

    if (isEmpty(email)) errors["email"] = "Email can't be empty."
    if (isEmpty(password)) errors["password"] = "Password can't be empty."
    if (password && !validatePsw(password)) errors["password"] = "Wrong password format."           
    if (email && !validateEmail(email)) errors["email"] = "Wrong format for email or password."   
    if (errors.email || errors.password) return res.send({"res" : "0", "msg": errors});    

    const sql = `SELECT * from users WHERE email =?;`
    
    SQL.PromiseConnectionDB()
    .then(DBconnection => {
            
        DBconnection.query(sql,[email], function (err, result) {
                
            if(err) throw err
            
            if(!result.length) return res.send({"res": "0", "msg": new Errors(null, null, "User doesn't exist.")})
                    
            let realPsw = {               
                password: result[0].passw,
                salt: result[0].SALT 
            }                                 
             
            if (!JWT.verifyPassword(password,realPsw)) return res.send({"res": "0", "msg": new Errors(null, null, null,"Wrong email or password")});

            let payload = new Payload(result[0].id, email, result[0].name)
            let token = JWT.generateJWT(payload)

            res.cookie("jwt", token, Options).send({"res": "1", "msg": token});
            DBconnection.end()      
        })
    }).catch(e => res.send({"res": "0", "msg": e}))
});
//Scream/publicacion for LIVEFEED   ==> ESTO SE TIENE QUE VER. 
//https://www.youtube.com/watch?v=m_u6P5k0vP0&t=124s&ab_channel=freeCodeCamp.org
//https://stackoverflow.com/questions/36210424/retrieve-randomly-generated-child-id-from-firebase/36210696


//Logout 
server.get('/logout', (req, res) => {
    if (!req.cookies.jwt || !JWT.verifyJWT(req.cookies.jwt)) return res.send({"res" : "0", "msg": "User is not logged in."})
    
    const {userId} = getJWTInfo(req.cookies.jwt)
    
    res.clearCookie('jwt')
    res.send({"res": "1", "msg": `User ${userId} succesfully logged out.`})
})
//Create scream
server.post("/postScream", (req, res) => {
        
    if (!req.cookies.jwt || !JWT.verifyJWT(req.cookies.jwt)) return res.send({"res" : "0", "msg": "No JWT"})
    if(!req.body) return res.send({"res" : "0", "msg": "No body data"})
    
    let {name, userId} = getJWTInfo(req.cookies.jwt)
    let {text, photo} = req.body   
    let randomId = RandomId()   
    let screamObj = new Scream(name, userId, randomId ,photo, text)  

    dataBase.ref(`LIVEFEED/${randomId}`).set(screamObj);

    let sql = `INSERT INTO activity (id, activity_id, type, created_at) VALUES (?,?,?,?);`;
    
    SQL.PromiseConnectionDB()
    .then(DBconnection => {

        DBconnection.query(sql, [userId, randomId, "SCREAM", new Date()], (err, result) => {
            if(err) throw err
            DBconnection.end()
            res.send({"res" : "1", "msg": "Scream registered"})
        })
    })
    .catch(e => res.send({"res": "0", "msg": e}))
});

server.post("/deleteScream", (req, res) => {
        
    if(!req.cookies.jwt || !JWT.verifyJWT(req.cookies.jwt)) return res.send({"res" : "0", "msg": "No JWT"})
    if(!req.body) return res.send({"res" : "0", "msg": "No body data"})
    if(!req.body.screamId && !req.body.commentId) return res.send({"res" : "0", "msg": "No target data"})
    
    let {userId} = getJWTInfo(req.cookies.jwt)
    let {screamId} = req.body
    
    SQL.PromiseConnectionDB()
    .then(DBconnection => {

        let sql = `SELECT * from activity WHERE activity_id = ? AND id = ?;`;

        DBconnection.query(sql, [screamId, userId], (err, result) => {
            if(err) throw err

            if(!result.length) {
                DBconnection.end()
                res.send({"res" : "", "msg": "No rights for deletion"})

            }
            dataBase.ref(`LIVEFEED/${screamId}`).set({}) //Se puede hacer también con el método remove

            sql = `INSERT INTO activity (id ,activity_id, type, created_at) VALUES (?,?,?,?);`;
                                
            DBconnection.query(sql, [userId, screamId, "DELETE", new Date()], (err, result) => {
                if(err) throw err
                DBconnection.end()

                res.send({"res" : "1", "msg": "Scream deleted from LIVEFEED"})
            })   
        })
    })
    .catch(e => res.send({"res": "0", "msg": e}))  
});

//Comment LIVEFEED scream

server.post('/commentScream', (req, res) => {

    if(!req.cookies.jwt || !JWT.verifyJWT(req.cookies.jwt)) return res.send({"res" : "0", "msg": "No JWT"})
    if(!req.body) return res.send({"res" : "0", "msg": "No content"})
    
    let {name, userId} = getJWTInfo(req.cookies.jwt)
    let {screamId, text} = req.body
    let randomId = RandomId()
    let commentObj = new Comment(name, userId, randomId, text)
    
    SQL.PromiseConnectionDB()
    .then(DBconnection => {
        dataBase.ref(`LIVEFEED/${screamId}/userId`).once("child_added",(snapshot) => {
            let targetUserId = snapshot.val()
            let newNotification = new Activity(userId, name, randomId, screamId,"COMMENT") 
            dataBase.ref(`PROFILES/${targetUserId}/notifications/${randomId}`).set(newNotification);               
        })
        
        dataBase.ref(`LIVEFEED/${screamId}/comments/${randomId}`).set(commentObj);          
 
        let sql = "INSERT INTO activity (id, activity_id, target_id,type, created_at) VALUES (?, ? ,?, ?, ?)"
        
        DBconnection.query(sql, [userId, randomId, screamId,"COMMENT", new Date()], (err, result) => {
            if(err) throw err
            DBconnection.end()

            res.send({"res" : "1", "msg": "user commented on LIVEFEED"})
        })  
    })
    .catch(e => res.send({"res": "0", "msg": e})) 
})

//get LIVEFEED 
//Posiblemente "once" cmabiará a "on"
server.get('/getLIVEFEED', (req, res) => {
    // if (!req.cookies.jwt || !JWT.verifyJWT(req.cookies.jwt)) return res.send({"res" : "0", "msg": "No JWT"})

    let arrayLIVEFEED = [];

    dataBase.ref(`LIVEFEED`)
    .orderByChild('createdAt')
    .once('child_added', snapshot => {
        let objScream = snapshot.val()
        let arrayLikes = []
        
        if(objScream.likes) {
            objScream["likeCount"] = Object.keys(objScream.likes).length
            Object.keys(objScream.likes).map(likeId => {
                arrayLikes.push(objScream.likes[likeId].userId)
            })
            objScream["likes"] = arrayLikes
        } else {
            objScream["likeCount"] = 0
            objScream["likes"] = []
        }
        
        if(objScream["comments"] && Object.keys(objScream["comments"]).length) {

            let commentArray = []
            Object.keys(objScream["comments"]).map(commentId => {
                commentArray.push(objScream["comments"][commentId])
            })
            commentArray.sort((elem1, elem2) => {
                return new Date(elem1.createdAt) - new Date(elem2.createdAt) //Sort array by date
            })
            commentArray.map(comment => {
                comment["createdAt"] = dayjs(new Date(comment.createdAt)).fromNow() //Muy ineficiente 
            })

            objScream["comments"] = commentArray
            objScream["commentCount"] = commentArray.length
        } else {
            objScream["comments"] = []
            objScream["commentCount"] = 0
        }
        //Formateo de createdAt para que sea tiempo de creación desde ahora.
        objScream["createdAt"] = dayjs(new Date(objScream.createdAt)).fromNow()
       
        return arrayLIVEFEED.push(objScream)
    })
    .then(() => res.send({"res" : "1", "msg": arrayLIVEFEED}))
    .catch(e => res.send({"res": "0", "msg": e}))

})

server.get('/getNotifications', (req, res) => {
    if (!req.cookies.jwt || !JWT.verifyJWT(req.cookies.jwt)) return res.send({"res" : "0", "msg": "No JWT"})
    
    let {userId} = getJWTInfo(req.cookies.jwt)
    
    let arrayNotifications = []
    
    dataBase.ref(`PROFILES/${userId}/notifications`)
    .orderByChild('createdAt')
    .once('child_added', snapshot => {
        return arrayNotifications.push(snapshot.val())
    })
    .then(() => res.send({"res" : "1", "msg": arrayNotifications}))
    .catch(e => res.send({"res": "0", "msg": e}))
})

//Like comentarios o screams de LIVEFEED => Si llega el id de comentario undefined, El sistema asume que es un like al propio Scream
server.post('/likeLIVEFEED', (req, res) => {
    
    if(!req.cookies.jwt || !JWT.verifyJWT(req.cookies.jwt)) return res.send({"res" : "0", "msg": "No JWT"})        
    if(!req.body.screamId && !req.body.commentId) return res.send({"res" : "0", "msg": "No target data"})
    
    let {name, userId} = getJWTInfo(req.cookies.jwt)
    let {screamId, commentId} = req.body
    let randomId = RandomId()
    let likeObj = new Like(name, userId, randomId)
    let targetId = !commentId ? screamId : commentId
    let type = !commentId ? "LIKE_SCREAM" : "LIKE_COMMENT"
    let fireBaseRef = !commentId ? `LIVEFEED/${screamId}/likes/${userId}` 
    : `LIVEFEED/${screamId}/comments/${commentId}/likes/${userId}`
    let sql = 'INSERT INTO activity (id, activity_id, type, target_id, created_at) VALUES (?,?,?,?,?)'
    
    //Notificaciones de Perfil
    dataBase.ref(`LIVEFEED/${screamId}/userId`).once("child_added", snapshot => {
        let targetUserId = snapshot.val()
        let newNotification = new Activity(userId, name, randomId,targetId, type) 
        dataBase.ref(`PROFILES/${targetUserId}/notifications/${randomId}`).set(newNotification)
    })
    
    dataBase.ref(fireBaseRef).set(likeObj);

    SQL.PromiseConnectionDB()
    .then(DBconnection => {

        DBconnection.query(sql, [userId, randomId, type, targetId, new Date()], (err, result) => {
            if(err) throw err
            DBconnection.end()
            res.send({"res" : "1", "msg": `User: ${type}`})
        })
    })
    .catch(e => res.send({"res": "0", "msg": e}))    
})

//Delete like from Scream/Comment from LIVEFEED 
server.post('/undolikeLIVEFEED',(req, res) => {
    
    if(!req.cookies.jwt || !JWT.verifyJWT(req.cookies.jwt)) return res.send({"res" : "0", "msg": "No JWT"})
    if(!req.body) return res.send({"res" : "0", "msg": "No body data"})
    if(!req.body.screamId && !req.body.commentId) return res.send({"res" : "0", "msg": "No target data"})
    
    let {userId} = getJWTInfo(req.cookies.jwt)
    let {screamId, commentId} = req.body
    let deletedActivityId
    
    let sql = 'INSERT INTO activity (id, activity_id, type, created_at) VALUES (?,?,?,?)'
    let fireBaseRef = !commentId ? `LIVEFEED/${screamId}/likes/${userId}` 
    : `LIVEFEED/${screamId}/comments/${commentId}/likes/${userId}`
    
    dataBase.ref(fireBaseRef).once('value', snapshot => {
        if(!snapshot.val()) return null
        return deletedActivityId = snapshot.val().activityId
    }).then(() => {

        if(!deletedActivityId) return res.send({"res" : "1", "msg": "No like obj"})
        
        dataBase.ref(fireBaseRef).set({})
    
        SQL.PromiseConnectionDB()
        .then(DBconnection => {
    
            sql = 'INSERT INTO activity (id, activity_id, type, created_at) VALUES (?,?,?,?)'
            DBconnection.query(sql, [userId, deletedActivityId, "DELETE", new Date()], (err, result) => {
                if(err) throw err
                DBconnection.end()
                let commentOrScream = !commentId ? 'scream' : 'comment'
                res.send({"res" : "1", "msg": `User: DELETE from ${commentOrScream}`})
            })
        })
    })
    .catch(e => res.send({"res": "0", "msg": e}))
})
//GET PROFILE / GET OWN PROFILE dependiendo de si se envía id usuario o no => quizas se haga en dos endpoints separados.
server.post('/getProfile', (req, res) => {
    if(!req.cookies.jwt || !JWT.verifyJWT(req.cookies.jwt)) return res.send({"res" : "0", "msg": "No JWT"})
    
    let {userId} = getJWTInfo(req.cookies.jwt)
    let {targetUser} = req.body
    
    if(!targetUser) {
        targetUser = userId
    }
    
    dataBase.ref(`PROFILES/${targetUser}`).once("value", snapshot => {        
        if(!snapshot.val()) return res.send({"res" : "0", "msg": "Profile doesn't exist"})      
        let profile = snapshot.val()       
        targetUser !== userId ? delete profile["notifications"] : null
        profile["createdAt"] = new Date(profile.createdAt) //peude que se cambie con dayjs
        res.send({"res" : "1", "msg": profile})
    })   
})


server.post('/saveProfilePicture', (req, res) => {
    if(!req.cookies.jwt || !JWT.verifyJWT(req.cookies.jwt)) return res.send({"res" : "0", "msg": "No JWT"})
    let {userId} = getJWTInfo(req.cookies.jwt)

    const file = req.file
    console.log(file)
    async function createBucket() {
        // Creates the new bucket
        await storage.createBucket(bucketName);
        console.log(`Bucket ${bucketName} created.`);
    }

      
    dataBase.ref(`PROFILES/${userId}/img`).child(file)
    res.send("IMAGE UPLOADED")

})

// server.get('/createSocket', (req, res) => {
//     if(!req.cookies.jwt || !JWT.verifyJWT(req.cookies.jwt)) return res.send({"res" : "0", "msg": "No JWT"})
//     console.log("buenas")
//     let {userId} = getJWTInfo(req.cookies.jwt)
//     io.once('connection', socket => {
//         socket.once('userData', data => {
//             io.emit('userData', data)
//         })
//     })
// })

// io.on('connection', function (socket) {
//     socket.emit('greeting-from-server', {
//         greeting: 'Hello Client'
//     });
//     socket.on('greeting-from-client', function (message) {
//       console.log(message);
//     });
//   });
  




//     io.once('connection', socket => {
//         socket.once('userData', data => {
//             io.emit('userData', data)
//         })
//     })
//GET SCREAM Posiblemente esto acabe mandando solo un objeto scream que se ordenará en front
server.post('/getContent', (req, res) => {

    if (!req.cookies.jwt || !JWT.verifyJWT(req.cookies.jwt)) return res.send({"res" : "0", "msg": "No JWT"})
    
    let {targetId, type} = req.body

    switch(type) {

        case "LIKE_SCREAM":
            dataBase.ref(`LIVEFEED/${targetId}`).once("value", snapshot => {

                res.send({"res" : "1", "msg": snapshot.val()})
            })
        break;

        case "LIKE_COMMENT":
            dataBase.ref(`LIVEFEED/${targetId}`).once("value", snapshot => { 

                res.send({"res" : "1", "msg": snapshot.val()})
            })
        break;

        case "COMMENT":
            dataBase.ref(`LIVEFEED/${targetId}`).once("value", snapshot => { 

                res.send({"res" : "1", "msg": snapshot.val()})
            })
        break;
    }
})
//GET COMMENT 

// Upload file
server.post('/uploadProfileImage', upload.single('image'),(req, res, next) => {
    //Con la ejecución del middleware upload tenemos acceso a req.file
    if (!req.cookies.jwt || !JWT.verifyJWT(req.cookies.jwt)) return res.send({"res" : "0", "msg": "No JWT"})   

    let {userId} = getJWTInfo(req.cookies.jwt)
    console.log(userId)
    const file = req.file
    const encodedFile = base64_encode(req.file.path)

    dataBase.ref(`PROFILES/${userId}/img`).set(encodedFile)
    .then(() => {
        dataBase.ref(`PROFILES/${userId}/img`).once('value', snapshot => {

            console.log(snapshot.val())
            res.send({"res" : "1", "msg": snapshot.val()})
        })
    })
    .catch(e => {
        console.log(e)
    }) 
    
    
    // fs.mkdir(`./uploads/user${userId}`, (err) => {
    //     if (err) console.log(err)
          
        
    //     console.log("New directory successfully created.")
    // })
    
    
})

server.get('/getFile', (req, res) => {
    if (!req.cookies.jwt || !JWT.verifyJWT(req.cookies.jwt)) return res.send({"res" : "0", "msg": "No JWT"})
    const {userId} = getJWTInfo(req.cookies.jwt)



    let img = '<img src="/uploads/orcaLogo.png" />'
    res.send(img)

})

// server.post('/uploadFileNew', upload.single('image'),(req, res) => {
//     // const file = new Image(req.files[0].buffer, req.files[0].originalname, req.files[0].mimetype)
//     console.log(req.file)
//     console.log("getting called?")
//     let userId = 12
   
    
//     dataBase.ref(`IMAGES/${userId}`).set(file)

    
// })

const serverInstance = server.listen(listenPort, () => {
    console.log(`http://localhost:5678/ server listening on port ${listenPort}`);
});
// const io = require("socket.io")(serverInstance, {
//     cors: {
//       origin: "http://localhost:3000",
//       methods: ["GET", "POST"],
      
//       credentials: true
//     }
// });

// io.use(socketioJwt.authorize({
//     secret: process.env.SECRET,
//     handshake: true,
//     auth_header_required: true
// }));


// io.use(socketioJwt.authorize({
//     secret: (request, decodedToken, callback) => {
//       // SECRETS[decodedToken.userId] will be used as a secret or
//       // public key for connection user.
   
//       callback(null, SECRETS[decodedToken.userId]);
//     },
//     handshake: false
// }));

// io.sockets
// .on('connection', socketioJwt.authorize({
//     secret: process.env.SECRET,
//     timeout: 15000 // 15 seconds to send the authentication message
// }))
// .on('authenticated', function(socket) {
// //this socket is authenticated, we are good to handle more events from it.
//     console.log(`Hello! ${socket.decoded_token.name}`);
// });

  
// io.on('connection', (socket) => {
//     console.log('hello!', socket.decoded_token.name);
// });

