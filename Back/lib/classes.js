//Payload de JWT
class Payload {
    constructor(userId, email, name, iat = Date.now()) {
        this.userId = userId
        this.email = email
        this.name = name
        this.iat = iat
    }
}

//Actividad de cada una de las acciones realizables desde front.
class Activity {
    constructor(userId, name, activityId, targetId, type, createdAt = Date.now()) {
        this.userId = userId
        this.name = name
        this.activityId = activityId
        this.targetId = targetId //Será null si se trata de type SCREAM o DELETE
        this.type = type
        this.createdAt = createdAt
        //this.read => boolean
    }
}

class Profile { 
    constructor( name, userId, bio = "", location = "", website = "", img = "", createdAt = Date.now(), notifications = {"data": false}) {        
        this.name = name
        this.userId = userId
        this.bio = bio
        this.location = location
        this.website = website
        this.img = img
        this.createdAt = createdAt
        this.notifications = notifications //Array compuesto de class Activity, se van borrando con el tiempo.      
    }
}

//Objeto de LIVEFEED
class Scream {
    constructor(name, userId, activityId, photo  = "", text = "", likes = {}, comments = {}, createdAt = Date.now()) {
        this.name = name
        this.userId = userId
        this.activityId = activityId
        this.photo = photo
        this.text = text
        this.likes = likes
        this.comments = comments
        this.createdAt = createdAt
    }
}

//Objeto de comentarios
class Comment {
    constructor(name, userId, activityId, text, likes = {}, createdAt = Date.now()) {
        this.name = name
        this.userId = userId
        this.activityId = activityId
        this.text = text
        this.likes = likes
        this.createdAt = createdAt
    }
}
class Like {
    constructor(name, userId, activityId,createdAt = Date.now()) {
        this.name = name
        this.userId = userId
        this.activityId = activityId
        this.createdAt = createdAt
    }
}

class Errors {
    constructor(name, familyName, email, password) {
        this.name = name
        this.familyName = familyName
        this.email = email
        this.password = password
    }
}






////////////////////
class Image {
    constructor(data, originalName, contentType) {
        data = this.data
        originalName = this.originalName
        contentType = this.contentType
    }
}

module.exports = {Scream, Profile, Scream, Comment, Like, Payload, Activity, Errors, Image}
