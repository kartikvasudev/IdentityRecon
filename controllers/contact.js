let ContactService = require('../service/Contacts')

module.exports = {
    fetchContactsUsingReq: async (req, res, next) => {
        let {email, phoneNumber} = req.body;
        phoneNumber = phoneNumber ? String(phoneNumber): null
        let contacts;
        try {
            contacts = await ContactService.findContacts(email, phoneNumber)
            console.debug("fetchContactsUsingReq: ", contacts)
            req.contacts = contacts;
        } catch (error) {
            return next(error);
        }
        return next();
    },
    updatePrecedence: async (req, res, next) => {
        let linkedIds = new Set()
        let minPrimaryId = Number.MAX_SAFE_INTEGER;
        let contacts = req.contacts
        contacts.forEach((contact) => {
            if(contact.linkPrecedence == "primary"){
                minPrimaryId = Math.min(contact.id, minPrimaryId)
                linkedIds.add(contact.id)
            }else{
                linkedIds.add(contact.linkedId)
            }
        })
        linkedIds = [...linkedIds]
        req.linkedIds = linkedIds;
        console.debug(linkedIds)
        console.debug(minPrimaryId)
        if(linkedIds.length > 1){
            console.debug("updating Precedence of contacts")
            // we need to convert primary users to secondary users
            let updateIds = linkedIds.filter((id) => id != minPrimaryId)
            contacts.filter((contact) => {
                if(updateIds.includes(contact.id))
                return false;
                return true;
            })
            //this will update the users to be secondary and their linkedId to minPrimaryId
            try {
                await ContactService.updateUsersToSecondary(updateIds, minPrimaryId)
            } catch (error) {
                return next(error);
            }
        }
        return next();
    },
    fetchLinkedContacts: async (req, res, next) => {
        let secondaryContacts = await ContactService.findContactsByIds(req.linkedIds)
        console.debug("fetchLinkedContacts: secondaryContacts: ", secondaryContacts )
        req.contacts.push(...secondaryContacts)
        console.debug("fetchLinkedContacts - all contacts: ", req.contacts )
        return next();
    },
    createContact: async (req, res, next) => {
        let {email, phoneNumber} = req.body
        phoneNumber = phoneNumber ? String(phoneNumber) : null
        let linkedId, linkPrecedence;
    
        let createNewContact = true;
        if(req.contacts.length === 0) linkPrecedence = "primary"
        else {
            let duplicateContact = req.contacts.filter((contact) => {
                if(contact.email === email && contact.phoneNumber === phoneNumber)
                return true;
                return false;
            })
            console.debug('createContact: duplicate_contacts: ',duplicateContact)
            if(duplicateContact.length > 0)
            createNewContact = false;
            else{
                linkPrecedence = "secondary"
                linkedId = req.contacts.filter((contact) => contact.linkPrecedence === "primary")[0].id
            }
        }
    
        if(createNewContact){
            let newContact;
            try {
                newContact = await ContactService.createContact(email, phoneNumber, linkPrecedence, linkedId);   
            } catch (error) {
                return next(error);
            }
            req.contacts.push(newContact)
        }
        return next();
    },
    response: async (req, res, next) => {
        let response = {
            contact: {
                emails: [],
                phoneNumbers: [],
                secondaryContactIds: []
            }
        }

        const pnoSet = new Set();
        const emailSet = new Set();
        const secondaryIdSet = new Set();
        let primaryEmail, primaryId, primaryPno;
    
        req.contacts.forEach((contact) => {
            if(contact.linkPrecedence === "primary")
            {
                primaryId = contact.id
                if(contact.email)
                primaryEmail = contact.email
                if(contact.phoneNumber)
                primaryPno = contact.phoneNumber
            }else{
                secondaryIdSet.add(contact.id)
            }
            if(contact.email)
            emailSet.add(contact.email)
            if(contact.phoneNumber)
            pnoSet.add(contact.phoneNumber)
        })
        response.contact.primaryContactId = primaryId
        if(primaryEmail)
        response.contact.emails.push(primaryEmail)
        if(primaryPno)
        response.contact.phoneNumbers.push(primaryPno)
        emailSet.delete(primaryEmail)
        pnoSet.delete(primaryPno)
    
        response.contact.emails.push(...emailSet)
        response.contact.phoneNumbers.push(...pnoSet)
        response.contact.secondaryContactIds.push(...secondaryIdSet)
        
        return res.send({contact: response.contact})
    },
}