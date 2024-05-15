const express = require('express');
const { hubspotTokenExchange, updateHubSpotToken, getAccessToken, getContacts, saveContacts, createContact, getHubSpotAuthUrl } = require('./utils/hubspot');
const asyncMiddleware = require('./middlewares/asyncMiddleware');
const { Prisma } = require('./utils/utils');
const app = express();
require('dotenv').config();
var cors = require('cors')

app.use(cors())
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/', async (req, res) => {
    res.send({
        message: "Welcome to the Application!",
        status: 200
    })
})

// Get Hubspot Authorization Status from database
app.get('/hubspot/authorization', asyncMiddleware(async (req, res) => {

    const data = await Prisma.authorization.findFirst();

    res.send({
        auth_status: data?.hsId ? true : false,
        hsId: data?.hsId,
        status: 200
    });
}));


// Hubspot OAuth URL
app.get('/hubspot/auth-url', asyncMiddleware(async (req, res) => {

    const authUrl = getHubSpotAuthUrl();

    res.send({
        authUrl,
        status: 200
    });
}));

// Hubspot OAuth Redirect API
app.get('/hubspot/callback', asyncMiddleware(async (req, res) => {

    const tokenResponse = await hubspotTokenExchange(req.query.code, 'authorization_code');

    if (!tokenResponse?.accessToken) {
        return res.status(400).send({
            message: "Something went wrong!",
            error: tokenResponse,
            status: 400
        })
    }

    await updateHubSpotToken(tokenResponse);

    // redirect to the frontend
    res.redirect(`${process.env.FRONTEND_URL}?status=success`);
}));

// Sync HubSpot Contacts API
app.get('/hubspot/sync-contacts', asyncMiddleware(async (req, res) => {

    // get all contacts from HubSpot
    const contacts = await getContacts();

    // Save the contacts in the database
    const { synced, total } = await saveContacts(contacts);

    res.send({
        message: `Synced ${synced} out of ${total} contacts`,
        status: 200
    });
}));

// Disconnect HubSpot 
app.get('/hubspot/disconnect', asyncMiddleware(async (req, res) => {

    await Prisma.authorization.deleteMany();

    res.send({
        message: "Disconnected from HubSpot!",
        status: 200
    });
}));

// Get all contacts from the database
app.get('/contacts/all', asyncMiddleware(async (req, res) => {

    const contacts = await Prisma.contacts.findMany({
        orderBy: {
            id: 'desc'
        }
    });

    res.send({
        contacts,
        status: 200
    });
}));

// Create a new contact in hubspot and save it in the database
app.post('/contacts/create', asyncMiddleware(async (req, res) => {

    // check if email is already in the database
    const existingContact = await Prisma.contacts.findFirst({
        where: {
            email: req.body.email
        }
    })

    if (existingContact) {
        return res.status(400).send({
            message: "Contact already exists!",
            status: 400
        })
    }

    // Create a new contact in HubSpot
    const contact = await createContact({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email
    })

    if (!contact?.id) {
        return res.status(400).send({
            message: contact?.message || "Something went wrong!",
            status: 400
        })
    }

    // Save the contact in the database
    await Prisma.contacts.create({
        data: {
            firstName: contact.properties.firstname,
            lastName: contact.properties.lastname,
            email: contact.properties.email,
            hsId: contact.id,
        }
    })

    res.send({
        message: "Contact created successfully!",
        status: 200
    });
}));

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
    console.log('Server is running on port ' + PORT);
});