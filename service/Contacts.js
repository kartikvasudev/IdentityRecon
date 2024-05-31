let PrismaClient = require('@prisma/client').PrismaClient
let prisma = new PrismaClient()

class Contact{
    static async createContact(email, phoneNumber, linkPrecedence = "primary", linkedId = null){
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
            throw new Error(error);
        }
        return createContact;
    }

    static async findContacts(email, phoneNumber){
        let combinedContacts
        try {
            combinedContacts = await prisma.Contact.findMany({
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
        } catch (error) {
            throw new Error(error);
        }
        return combinedContacts;
    }

    static async updateUsersToSecondary(ids, linkedId){
        let OR = []
        ids.forEach((id) => {
            OR.push({
                id: id
            })
        })
        try {
            await prisma.Contact.updateMany({
                where: {
                    OR: OR
                }, 
                data: {
                    linkPrecedence: "secondary",
                    linkedId: linkedId
                }
            })
        } catch (error) {
            throw new Error(error);
        }
    }
    static async findContactsByIds(ids){
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
        let contacts
        try {
            contacts = await prisma.Contact.findMany({
                where: {
                    OR: OR
                },
            })
        } catch (error) {
            throw new Error(error);
        }
        return contacts;
    }
}

module.exports = Contact;