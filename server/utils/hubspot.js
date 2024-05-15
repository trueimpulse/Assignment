const hubspot = require('@hubspot/api-client')
const { Prisma } = require('./utils')
const hubspotClient = new hubspot.Client()

const CUSTOMER_ID = 1
const pageLimit = 100;
let after, propertiesToGetWithHistory, associationsToGet
const propertiesToGet = ['firstname', 'lastname', 'email'];
const getArchived = false;

// HubSpot OAuth URL
const getHubSpotAuthUrl = () => {
    return `https://app.hubspot.com/oauth/authorize?client_id=${process.env.CLIENT_ID}&redirect_uri=${process.env.REDIRECT_URL}&scope=crm.schemas.companies.write crm.schemas.contacts.write media_bridge.read oauth tickets e-commerce crm.objects.custom.read crm.objects.custom.write crm.objects.goals.read crm.schemas.contacts.read crm.schemas.companies.read`

}

// Exchange the HubSpot code for an access token
const hubspotTokenExchange = async (code, grant_type, refreshToken) => {
    const tokenResponse = await hubspotClient.oauth.tokensApi.create(
        grant_type,
        code,
        process.env.REDIRECT_URL,
        process.env.CLIENT_ID,
        process.env.CLIENT_SECRET,
        refreshToken
    )
    return tokenResponse
}

// Get Access Token
const getAccessToken = async () => {
    const { accessToken, refreshToken, expiresAt } = await Prisma.authorization.findUnique({
        where: {
            id: CUSTOMER_ID
        }
    })

    const currentDate = new Date()
    const expiresAtDate = new Date(expiresAt)

    // check if the token is expired
    if (currentDate > expiresAtDate) {
        // refresh the token
        const tokenResponse = await hubspotTokenExchange(undefined, 'refresh_token', refreshToken)

        // update the token in the database
        await updateHubSpotToken(tokenResponse)
        return tokenResponse.accessToken
    }

    return accessToken
}

// Update the HubSpot access token in the database
const updateHubSpotToken = async (tokenResponse) => {
    const { accessToken, refreshToken, expiresIn } = tokenResponse

    // calculate the time when the token will expire
    const expiresAt = new Date(Date.now() + expiresIn * 1000)

    // get HubSpot portal ID
    hubspotClient.setAccessToken(accessToken)
    const hubspotPortalInfo = await hubspotClient.apiRequest({
        path: '/account-info/v3/details',
        method: 'GET'
    }).then((response) => response.json())

    // update the access token in the database

    return await Prisma.authorization.upsert({
        where: {
            id: CUSTOMER_ID
        },
        update: {
            accessToken: accessToken,
            refreshToken: refreshToken,
            expiresAt: expiresAt,
            hsId: String(hubspotPortalInfo.portalId)
        },
        create: {
            id: CUSTOMER_ID,
            accessToken: accessToken,
            refreshToken: refreshToken,
            expiresAt: expiresAt,
            hsId: String(hubspotPortalInfo.portalId)
        }
    })
}

// Contacts Sync 
const getContacts = async () => {
    const accessToken = await getAccessToken()
    hubspotClient.setAccessToken(accessToken)

    return await hubspotClient.crm.contacts.getAll(
        pageLimit,
        after,
        propertiesToGet,
        propertiesToGetWithHistory,
        associationsToGet,
        getArchived
    )
}

// Save the contacts to the database
const saveContacts = async (contacts) => {

    let synced = 0

    for (const contact of contacts) {
        await Prisma.contacts.upsert({
            where: {
                hsId: contact.id
            },
            update: {
                firstName: contact.properties.firstname,
                lastName: contact.properties.lastname,
                email: contact.properties.email,
                hsId: contact.id
            },
            create: {
                firstName: contact.properties.firstname,
                lastName: contact.properties.lastname,
                email: contact.properties.email,
                hsId: contact.id
            }
        })

        synced++
    }

    return { synced, total: contacts.length }
}

// Create a new contact in HubSpot
const createContact = async ({firstName, lastName, email}) => {
    const accessToken = await getAccessToken()
    hubspotClient.setAccessToken(accessToken)

    return await hubspotClient.crm.contacts.basicApi.create(
        {
            properties: {
                firstname: firstName,
                lastname: lastName,
                email: email
            }
        }
    )
}

module.exports = {
    getHubSpotAuthUrl,
    hubspotClient,
    getAccessToken,
    hubspotTokenExchange,
    updateHubSpotToken,
    getContacts,
    saveContacts,
    createContact
}