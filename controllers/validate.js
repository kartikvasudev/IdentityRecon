let Joi = require('joi');

let identifySchema = Joi.object({
    email: Joi.string().required().allow(null),
    phoneNumber: Joi.number().required().allow(null)
})

module.exports = (req, res, next) => {
    let { error, value } = identifySchema.validate(req.body);
    if(!error && (req.body.email != null || req.body.phoneNumber != null))
    next();
    else {
        if(!error)
        error = "Both email and phoneNumber cannot be null"
        return res.status(417).json({
            error: `Invalid request - ${error.message}`
        })
    } 
};