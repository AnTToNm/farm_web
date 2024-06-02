const express = require('express')
const app = express()
const PORT = 3001
const cors = require('cors');
const path = require("path");
const cookies = require("cookie-parser")
const allUsersController = require('./controllers/allUsersController');
const workerController = require('./controllers/workerController');
const usersController = require('./controllers/usersController');
const adminController = require('./controllers/adminController')

app.use(cookies())
app.use(express.json())
app.use(cors({credentials: true, origin: 'http://localhost:3000'}))
app.use('/public', express.static(path.join(__dirname + '/public')))

app.use('/alluserscontroller', allUsersController);
app.use('/workercontroller', workerController);
app.use('/userscontroller', usersController);
app.use('/admincontroller', adminController)

const start = async () => {
    try {
        app.listen(PORT, () => console.log('Server listening on port: ', PORT))
    } catch (e) {
        console.log(e)
    }
}

start()