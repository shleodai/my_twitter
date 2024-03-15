// Main application file
import express from 'express';
import session from 'express-session';
import passport from 'passport';
import flash from 'connect-flash';
import { Strategy as LocalStrategy } from 'passport-local';

// passport schemas already implemented in db.mjs
import { UserModel, MessageModel, TagModel } from './db.mjs';
import './config.mjs';

import bodyParser from 'body-parser';

// ------------------------------------ MongoDB connection ------------------------------------------------
import mongoose from 'mongoose';
mongoose.connect(
	process.env.DSN,
	{ useNewUrlParser: true, useUnifiedTopology: true }
)
.then(()=>console.log('MongoDB connected!'))
.catch(e=>console.log(e));
  
// Create a new Express application.
const app = express();

// Set Handlebars as the view engine.
app.set('view engine', 'hbs');


// ------------------------------------ Middleware ------------------------------------------------------
// Use body-parser to parse request bodies
app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the public directory
import url from 'url';
import path from 'path';
const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
app.use(express.static(path.join(__dirname, 'public')));


// Passport local strategy for user authentication
passport.use(new LocalStrategy(async (username, password, done) => {
    const user = await UserModel.findOne({ username: username });
    if (!user) {
		// console.log('No username as is.');
        return done(null, false, { message: 'No such username.' });
    }
    if (!(await user.validatePassword(password))) {
		// console.log('Incorrect password.');
        return done(null, false, { message: 'Incorrect password.' });
    }
	console.log('User authenticated.');
    return done(null, user, {message: 'Logged in successfully.'});
}));

// Passport session setup for serializing and deserializing users
passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
    try {
        const user = await UserModel.findById(id);
        done(null, user);
    } catch (error) {
        done(error, null);
    }
});

// Configure session middleware
app.use(session({
    secret: process.env.SESSION_SECRET ?? 'secret',
    resave: false,
    saveUninitialized: true
}));

// Initialize passport and configure it to use sessions.
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
// Middleware to check if the user is authenticated
const loggedIn = (req, res, next) => {
	if (req.user) {
		next();
	} else {
		res.redirect('/login');
	}
};
// ------------------------------------ End of Middleware -----------------------------------------











// Home Page, showing all messages
app.get('/', (req, res) => {
	MessageModel.find().populate({ //这样可以递归populate
            path: 'author'
    })
    .then(messages => {
        // 现在 user.messages 是完整的消息对象数组
        // 按 timestamp 排序
		// This is sort by reverse chronological order
        const sortedMessages = messages.sort((a, b) =>  b.timestamp - a.timestamp);
        res.render('index', {messages: sortedMessages });
    })
    .catch(err => {
        console.log(err);
        res.redirect('/error'); // 或其他错误处理方式
    });
});

// ------------------------------------ User Authentication ----------------------------------------


app.post('/login', passport.authenticate('local', {
    successRedirect: '/home',
    failureRedirect: '/login',
	failureFlash: true
}), (req, res) => {
	// Handle logging in a user
	console.log('User logged in successfully.');
	res.redirect('/home');
}
);

app.get('/login', (req, res) => {
	res.render('login', { error: req.flash('error')[0] });
});


app.post('/register', async (req, res, next) => {
	// Handle registering a new user
	const { username, password } = req.body;
	try {
		const user = await UserModel.create({ username, hashed_password: password });
		console.log('User created successfully: ' + user);
		res.redirect('/home');
	} catch (err) {
		if (err.code === 11000) {
			// If the error message contains "duplicate key error"
			// send a more helpful error message
			// and ask the user to try again
			console.error('Duplicate key error: Username already exists.');
			res.render('register', { error: 'Username already exists.' });
			// next(err);
		} else next(err);
	}
});

app.get('/register', (req, res) => {
	res.render('register');
});

app.post('/logout', function(req, res, next){
	req.logout(function(err) {
		if (err) { return next(err); }
		res.redirect('/');
	});
});
// ---------------------- End of User Authentication ----------------------




app.get('/home', loggedIn, (req, res) => {
    // Render the user's homepage with messages
	req.user.populate({ //这样可以递归populate
        path: 'messages',
        populate: {
            path: 'author'
        }
    })
    .then(user => {
        // 现在 user.messages 是完整的消息对象数组
        // 按 timestamp 排序
		// This is sort by reverse chronological order
        const sortedMessages = user.messages.sort((a, b) =>  b.timestamp - a.timestamp);
        res.render('home', { user: user, messages: sortedMessages });
    })
    .catch(err => {
        console.log(err);
        res.redirect('/error'); // 或其他错误处理方式
    });
});

app.get('/new_message', (req, res) => {
    res.render('new_message');
});

app.post('/new_message', (req, res) => {
	// Handle posting a new message
	// We just post the message to the user's homepage
	// and record the message in the database
	// also add hashtags to the message
	// and add timestamp to the message
	const body = req.body;
	const content = body.content;
	// const hashtags = body.hashtags.split(' ');
	const author = req.user;
	console.log(author);
	UserModel.findOne({ username: author.username })
    .then(user => {
        if (!user) {
            // 用户未找到的处理逻辑
            console.log('User not found');
            return res.redirect('/home');
        }

        const message = new MessageModel({
            content: content,
            author: author
            // hashtags: hashtags
        });

        return message.save().then(message => {
            user.messages.push(message);
            return user.save();
        });
    })
    .then(() => {
        console.log('Message posted successfully.');
        res.redirect('/home');
    })
    .catch(err => {
        console.log(err);
        res.redirect('/home');
    });
});
app.post('/delete_message/:id', (req, res) => {
	// Handle deleting a message
	const id = req.params.id;
	MessageModel.findByIdAndDelete(id)
	.then(() => {
		console.log('Message deleted successfully.');
		res.redirect('/home');
	})
	.catch(err => {
		console.log(err);
		res.redirect('/home');
	});
});

app.get('/user/:username', (req, res) => {
    // Display a user's homepage based on the username
});

app.post('/follow/:username', (req, res) => {
    // Handle the logic to follow a user
});

app.post('/unfollow/:username', (req, res) => {
    // Handle the logic to unfollow a user
});

app.get('/search', (req, res) => {
    // Handle search for messages and users
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

//test