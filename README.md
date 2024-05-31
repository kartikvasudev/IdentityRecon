IdentityRecon is a backend application built using NodeJs which seeks to reconcile the identify of duplicate users. 

Real world example - 

Suppose a ecommerce website sells a product and allows users to create an account using either email or phone or both. 
Since there can be multiple users which can create an account on this website using multiple email address and phone numbers. 
If the website decides to keep track of user identity, it will be able to do so using IdentityRecon. It uses a MySQL database to create a Contact table having schema-

Contact Schema -
{
  id Int
  phoneNumber String?
  email String?
  linkedId Int? // the ID of another Contact linked to this one
  linkPrecedence "secondary"|"primary" // "primary" if it's the first Contact in th
  createdAt DateTime
  updatedAt DateTime
  deletedAt DateTime?
}

Problem Statement - https://drive.google.com/file/d/1m57CORq21t0T4EObYu2NqSWBVIP4uwxO/view

Api Exposed - /identity

Use case - This api will take email, phoneNumber and fetch the users data after doing reconciliation. It will give us all unique emails, phoneNumbers, secondary ids and primary id from db.

Sample Request Body (Both email and phoneNumber cannot be null)- 
{
  "email": "mcfly@hillvalley.edu", // can be null also
  "phoneNumber": "123456" // can be null
}

Sample Response Body -
{
  "contact": {
    "emails": [
      "yt@edu"
    ],
    "phoneNumbers": [
      "123456"
    ],
    "secondaryContactIds": [],
    "primaryContactId": 1
  }
}

Sample Curl: 
curl -XPOST -H "Content-Type: application/json" -d '{"email":"yt@edu", "phoneNumber":123456}' http://identityrecon-production.up.railway.app/identify



