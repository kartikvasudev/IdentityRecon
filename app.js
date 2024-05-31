const express = require('express');

let app = express();
let routes = require('./routes')

app.use(express.json())

app.use('/', routes);

app.listen(3000, "0.0.0.0", () => {
  
    console.log("Application started on 3000")
});