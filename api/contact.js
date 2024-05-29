let PrismaClient = require('@prisma/client').PrismaClient

const prisma = new PrismaClient()

async function createContact(email, phoneNumber, linkPrecedence = "primary", linkedId = null){
    let createContact;
    try {
        createContact = await prisma.Contact.create({
            data: {
                phoneNumber: phoneNumber,
                email: email,
                linkPrecedence: linkPrecedence,
                linkedId: linkedId
            }
        })
    } catch (error) {
        throw new Error("Error creating contact " , error);
    }
    return createContact;
}

async function findContacts(email, phoneNumber){
    let contacts = [];
    if(email){
        let emailContacts = await prisma.Contact.findMany({
            where: {
                email: email,
                phoneNumber: phoneNumber
            },
        }) 
        contacts.push(emailContacts)
    }
    if(phoneNumber){
        let phoneContacts = await prisma.Contact.findMany({
            where: {
                phoneNumber: phoneNumber
            },
        }) 
        contacts.push(phoneContacts)
    }
    if(email && phoneNumber){
        let combinedContacts = await prisma.Contact.findMany({
            where: {
                email: email,
                phoneNumber: phoneNumber
            },
        })
        contacts.push(combinedContacts)
    } 
    return contacts;
}

module.exports =  (async (req, res, next) => {
    let {email, phoneNumber} = req.body;
    let linkedId, linkPrecedence;
    const contacts = await findContacts(email, phoneNumber);

    req.contacts = contacts

    req.response = {
        contact: {
            emails: [],
            phoneNumbers: [],
            secondaryContactIds: []
        }
    }

    if(contacts.length === 0)
    {
        linkPrecedence = "primary"
    }else {
        linkPrecedence = "secondary"
        linkedId = contacts.filter((contact) => contact.linkPrecedence === "primary").id
    }

    console.log("creating contact with ", email, phoneNumber, linkPrecedence)
    let newContact;
    try {
        newContact = await createContact(email, phoneNumber, linkPrecedence, linkedId);   
    } catch (error) {
        return res.status(500).json({
            error: "Something went wrong"
        });
    }
    req.contacts.push(newContact)
  
    req.contacts.forEach((contact) => {
        if(contact.linkPrecedence === "primary")
        {
            req.response.contact.primaryContactId = contact.id
            req.response.contact.emails.unshift(contact.email)
            req.response.contact.phoneNumbers.unshift(contact.phoneNumber)
        }else{
            req.response.contact.emails.push(contact.email)
            req.response.contact.phoneNumbers.push(contact.phoneNumber)
            req.response.contact.secondaryContactIds.push(contact.id)
        }
    })
    return res.status(200).send({contact: req.response.contact})
})