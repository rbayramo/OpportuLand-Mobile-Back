// const router = require('express').Router()
// const btoa = require('btoa')

// router.post('/cmak', async (req, res) => {
//   // Data payload for the API request
//   const requestData = new URLSearchParams()
//   requestData.append('action', 'create')
//   requestData.append('domain', process.env.DOMAIN)
//   requestData.append('user', req.body.username)
//   requestData.append('passwd', req.body.password)
//   requestData.append('passwd2', req.body.password)
//   requestData.append('quota', '0')
//   requestData.append('limit', '7200')

//   const getBasicAuthHeader = (username, password) => {
//     const credentials = `${username}:${password}`
//     const encodedCredentials = btoa(credentials) // Encode in Base64
//     return `Basic ${encodedCredentials}`
//   }

//   const fetch = (...args) =>
//     import('node-fetch').then(({ default: fetch }) => fetch(...args))

//   if (!req.body.username || !req.body.password) {
//     return res.status(400).json({ error: 'Username or password is missing' })
//   }
//   const apiUrl = `https://${process.env.DA_HOST}:${process.env.DA_PORT}/CMD_API_POP?json=yes`

//   try {
//     const response = await fetch(apiUrl, {
//       method: 'POST',
//       headers: {
//         Authorization: getBasicAuthHeader(
//           process.env.DA_USERNAME,
//           process.env.DA_PASSWORD
//         ),
//         'Content-Type': 'application/x-www-form-urlencoded',
//         'Access-Control-Allow-Origin': '*',
//         'Access-Control-Allow-Methods': 'GET, PUT, POST, DELETE',
//         'Access-Control-Allow-Headers': 'Content-Type, Authorization',
//       },
//       body: requestData.toString(), // Serialize the URLSearchParams object
//     })

//     const data = await response.json()
//    // console.log(data) // Response from the DirectAdmin API
//     res.json(data)
//   } catch (error) {
//     console.error('Error:', error)
//     res.status(500).json({ error: 'An error occurred' })
//   }
// })

// module.exports = router

// //hass password 

// //email parol random 