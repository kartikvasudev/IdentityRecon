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

async function findContactsOptimized(email, phoneNumber){
    let contacts = []
    let combinedContacts = await prisma.Contact.findMany({
        where: {
            OR: [
                {
                    email: email,
                    phoneNumber: phoneNumber
                },
                {
                    email: email
                },
                {
                    phoneNumber: phoneNumber
                }
            ]
        },
    })
    if(combinedContacts.length != 0)
    contacts.push(...combinedContacts)
    return contacts;
}

async function findContacts(email, phoneNumber){
    let contacts = []
    if(email && phoneNumber){
        let combinedContacts = await prisma.Contact.findMany({
            where: {
                email: email,
                phoneNumber: phoneNumber
            },
        })
        if(combinedContacts.length != 0)
        contacts.push(...combinedContacts)
    } 
    if(email){
        let emailContacts = await prisma.Contact.findMany({
            where: {
                email: email,
            },
        }) 
        if(emailContacts.length != 0)
        contacts.push(...emailContacts)
    }
    if(phoneNumber){
        let phoneContacts = await prisma.Contact.findMany({
            where: {
                phoneNumber: phoneNumber
            },
        }) 
        if(phoneContacts.length != 0)
        contacts.push(...phoneContacts)
    }
    return contacts;
}

module.exports =  (async (req, res, next) => {
    let {email, phoneNumber} = req.body;
    let linkedId, linkPrecedence;
    let contacts = await findContacts(email, phoneNumber);
    let contactsOptimized = await findContactsOptimized(email, phoneNumber)
    console.log("contacts optimized are ", contactsOptimized)
    console.log("contacts are ", contacts)
    let uniqContactMap = new Map();
    let uniqContacts = []
    contacts.forEach((contact) => {
        if(!uniqContactMap.get(contact.id)){
            uniqContacts.push(contact)
            uniqContactMap.set(contact.id, contact)
        }
    })
    contacts = uniqContacts
    
    // console.log("uniq contacts are ", contacts)

    req.contacts = contacts
    
    req.response = {
        contact: {
            emails: [],
            phoneNumbers: [],
            secondaryContactIds: []
        }
    }

    let createNewContact = true;
    if(contacts.length === 0) linkPrecedence = "primary"
    else {
        let duplicateContact = contacts.filter((contact) => {
            if(contact.email === email && contact.phoneNumber === phoneNumber)
            return true;
            return false;
        })
        if(duplicateContact.length > 0)
        createNewContact = false;
        else{
            linkPrecedence = "secondary"
            linkedId = contacts.filter((contact) => contact.linkPrecedence === "primary")[0].id
        }
    }

    if(createNewContact){
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
    }
  
    const pnoSet = new Set();
    const emailSet = new Set();

    req.contacts.forEach((contact) => {
        if(contact.linkPrecedence === "primary")
        {
            if(emailSet.has(contact.email)){
                req.response.contact.emails.filter((email) => {
                    if(email === contact.email)
                    return false;
                    return true;
                })
            }
            if(pnoSet.has(contact.phoneNumber)){
                req.response.contact.phoneNumbers.filter((pno) => {
                    if(pno === contact.phoneNumber)
                    return false;
                    return true;
                })
            }
            req.response.contact.primaryContactId = contact.id
            if(contact.email)
            req.response.contact.emails.unshift(contact.email)
            if(contact.phoneNumber)
            req.response.contact.phoneNumbers.unshift(contact.phoneNumber)
        }else{
            if(!emailSet.has(contact.email) && contact.email)
            req.response.contact.emails.push(contact.email)
            if(!pnoSet.has(contact.phoneNumber) && contact.phoneNumber)
            req.response.contact.phoneNumbers.push(contact.phoneNumber)
            req.response.contact.secondaryContactIds.push(contact.id)
        }
        emailSet.add(contact.email)
        pnoSet.add(contact.phoneNumber)
    })
    return res.status(200).send({contact: req.response.contact})
})