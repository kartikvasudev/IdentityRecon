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
                linkedId: linkedId ? linkedId: null
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
                    phoneNumber: phoneNumber,
                },
                {
                    email: email,
                },
                {
                    phoneNumber: phoneNumber,
                }
            ]
        },
    })
    if(combinedContacts.length != 0)
    contacts.push(...combinedContacts)
    return contacts;
}

async function updateUsersToSecondary(ids, linkedId){
    let OR = []
    ids.forEach((id) => {
        OR.push({
            id: id
        })
    })
    await prisma.Contact.updateMany({
        where: {
            OR: OR
        }, 
        data: {
            linkPrecedence: "secondary",
            linkedId: linkedId
        }
    })
}

async function findContactsByIds(ids){
    let OR = []
    ids.forEach((id) => {
        OR.push(
            {
                linkedId: id
            },
            {
                id: id
            }
        )
    })
    let contacts = await prisma.Contact.findMany({
        where: {
            OR: OR
        },
    })
    return contacts;
}

module.exports =  (async (req, res, next) => {
    let {email, phoneNumber} = req.body;
    phoneNumber = phoneNumber ? String(phoneNumber): null
    let linkedId, linkPrecedence;
    let contacts = await findContactsOptimized(email, phoneNumber)
    console.log("findContactsOptimized ", contacts)
    let linkedIds = new Set()
    let minPrimaryId = Number.MAX_SAFE_INTEGER;
    contacts.forEach((contact) => {
        if(contact.linkPrecedence == "primary"){
            minPrimaryId = Math.min(contact.id, minPrimaryId)
            linkedIds.add(contact.id)
        }else{
            linkedIds.add(contact.linkedId)
        }
    })
    linkedIds = [...linkedIds]
    console.log(linkedIds)
    console.log(minPrimaryId)
    if(linkedIds.length > 1){
        console.log("Converting records from primary to secondary ")
        // we need to convert primary users to secondary users
        let updateIds = linkedIds.filter((id) => id != minPrimaryId)
        contacts.filter((contact) => {
            if(updateIds.includes(contact.id))
            return false;
            return true;
        })
        //this will update the users to be secondary and their linkedId to minPrimaryId
        await updateUsersToSecondary(updateIds, minPrimaryId)
    }
    let secondaryContacts = await findContactsByIds(linkedIds)
    console.log("secondaryContacts ", secondaryContacts )
    contacts.push(...secondaryContacts)
    console.log("all contacts ", contacts )

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
    req.response.contact.primaryContactId = primaryId
    if(primaryEmail)
    req.response.contact.emails.push(primaryEmail)
    if(primaryPno)
    req.response.contact.phoneNumbers.push(primaryPno)
    emailSet.delete(primaryEmail)
    pnoSet.delete(primaryPno)

    req.response.contact.emails.push(...emailSet)
    req.response.contact.phoneNumbers.push(...pnoSet)
    req.response.contact.secondaryContactIds.push(...secondaryIdSet)
    
    return res.status(200).send({contact: req.response.contact})
})