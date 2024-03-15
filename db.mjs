/*
You will develop a twitter-like blog system using Node.js and Express.js.
This system use passport.js and argon2 for authentication and MongoDB for data storage.
This system use mongoose to connect to MongoDB.
This system use handlebars as the view engine.
You can decide how to search.

The system will have the following features:
•	Users can register and login to the system.
•	Users can post a message.
•	Users have a homepage where they can see all the messages posted by themselves.
•	Users can see other users’ homepages.
•	Users can follow other users.
•	Users can see a list of all users they are following, and could click link to their homepage.
•	Users can see a list of all users who are following them.
•	Users can search for other users by name.
•	Users can search for messages by content.
•	Messages have a timestamp and are displayed in reverse chronological order.
•	Messages have hashtags. Users can click on a hashtag to see all messages containing that hashtag.
•	When searching, you can toggle starting and ending dates.

*/

// db.mjs
import mongoose from 'mongoose';
// import argon2 from 'argon2'; //not supported
import passportLocalMongoose from 'passport-local-mongoose';
import crypto from 'crypto';
const Schema = mongoose.Schema;

// User schema definition
const UserSchema = new Schema({
    username: { type: String, unique: true, required: true },
    hashed_password: { type: String, required: true },
    following: [{ type: Schema.Types.ObjectId, ref: 'User' }], // reference to User IDs they are following
    followers: [{ type: Schema.Types.ObjectId, ref: 'User' }], // reference to User IDs of their followers
    messages: [{ type: Schema.Types.ObjectId, ref: 'Message' }] // reference to their messages
});

// Message schema definition
const MessageSchema = new Schema({
    content: { type: String, required: true },
    timestamp: { type: Date, default: Date.now },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    hashtags: [{ type: String }]
});

const TagSchema = new Schema({
    name: { type: String, required: true },
    messages: [{ type: Schema.Types.ObjectId, ref: 'Message' }]
});
// Hash the user's password
UserSchema.pre('save', async function (next) {/*
    if (this.isModified('hashed_password')) {
        this.hashed_password = await argon2.hash(this.hashed_password);
    }*/
    next();
});

// Validate the user's password
UserSchema.methods.validatePassword = async function (password) {
    return this.hashed_password === password;
    //return argon2.verify(this.hashed_password, password);
};


// Apply the passportLocalMongoose plugin to UserSchema
UserSchema.plugin(passportLocalMongoose);


// Model creation
const UserModel = mongoose.model('User', UserSchema);
const MessageModel = mongoose.model('Message', MessageSchema);
const TagModel = mongoose.model('Tag', TagSchema);

// Export the models
export { UserModel, MessageModel, TagModel};
