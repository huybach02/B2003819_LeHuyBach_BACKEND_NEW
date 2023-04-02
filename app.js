const express = require('express');
const cors = require('cors');
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require("./app/models/user");

mongoose.connect('mongodb://127.0.0.1:27017/contactbook', () => {
    console.log("Connected to DB (Authentication)");
});

const contactRouter = require('./app/routes/contact.route');
const ApiError = require('./app/api-error');

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api/contacts', contactRouter);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', (req, res) => {
    res.json({ message: " Welcome to contact book application." });
});

//routes
app.post('/signup', (req, res, next) => {
    const newUser = new User({
        email: req.body.email,
        name: req.body.name,
        password: bcrypt.hashSync(req.body.password, 10)
    });
    newUser.save(err => {
        if (err) {
            return res.status(400).json({
                title: 'error',
                error: 'email in use'
            });
        }
        return res.status(200).json({
            title: 'signup success'
        });
    });
});
app.post('/login', (req, res, next) => {
    User.findOne({ email: req.body.email }, (err, user) => {
        if (err) return res.status(500).json({
            title: 'server error',
            error: err
        });
        if (!user) {
            return res.status(401).json({
                title: 'user not found',
                error: 'invalid credentials'
            });
        }
        //incorrect password
        if (!bcrypt.compareSync(req.body.password, user.password)) {
            return res.status(401).json({
                tite: 'login failed',
                error: 'invalid credentials'
            });
        }
        //IF ALL IS GOOD create a token and send to frontend
        let token = jwt.sign({ userId: user._id }, 'secretkey');
        return res.status(200).json({
            title: 'login sucess',
            token: token
        });
    });
});

//grabbing user info
app.get('/user', async (req, res, next) => {
    let token = req.headers.token; //token
    await jwt.verify(token, 'secretkey', (err, decoded) => {
        if (err) return res.status(401).json({
            title: 'unauthorized'
        });
        //token is valid
        User.findOne({ _id: decoded.userId }, (err, user) => {
            if (err) return console.log(err);
            return res.status(200).json({
                title: "user grabbed",
                user: {
                    email: user.email,
                    name: user.name
                }
            });
        });

    });
});

// handle 404 response
app.use((req, res, next) => {
    // Code ở đây sẽ chạy khi không có route được định nghĩa nào
    // khớp với yêu cầu. Gọi next() để chuyển sang middleware xử lý lỗi
    return next(new ApiError(404, "Resource not found"));
});

// define error-handling middleware last, after other app.use() and routes calls
app.use((err, req, res, next) => {
    // Middleware xử lý lỗi tập trung.
    // Trong các đoạn code xử lý ở các route, gọi next(error)
    // sẽ chuyển về middleware xử lý lỗi này
    return res.status(err.statusCode || 500).json({
        message: err.message || "Internal Server Error",
    });
});

module.exports = app;