const Router = require('express').Router()
let {validate, contact} = require('../api')

Router.get("/health", (req, res, next) => {
    return res.status(200).send("OK");
})

Router.post("/identify", validate, contact)

module.exports = Router;