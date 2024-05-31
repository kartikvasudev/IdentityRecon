const Router = require('express').Router()
let { validate, contact } = require('../controllers')

let errorHandler = ((err, req, res, next) => {
    return res.status(500).json({
        msg: `Something went wrong ${err}`
    })
})

Router.get("/health", (req, res, next) => {
    return res.status(200).send("OK");
})

Router.post("/identify", validate, contact.fetchContactsUsingReq, contact.updatePrecedence, contact.fetchLinkedContacts, contact.createContact, contact.response, errorHandler)

module.exports = Router;