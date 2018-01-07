'use strict'

const logger = require('debug')('ring-api')
const EventEmitter = require('events')
const assign = require('lodash.assign')

module.exports = ({
  email,
  password,
  userAgent = 'github.com/jimhigson/ring-api',
  poll = true,
  serverRoot = 'https://api.ring.com/clients_api'}) => {

  const events = new EventEmitter()

  const apiUrls = require('./api-urls')(serverRoot)

  const restClient = require('./rest-client')(apiUrls)

  restClient.authenticate({email, password, userAgent})

  const api = {
    events,
    apiUrls,
    restClient
  }

  assign( api, {
    devices: require('./get-devices-list')(api),

    history: require('./get-history-list')(api),

    activeDings: require('./get-active-dings')(api),
  })

  if (poll) {
    require('./poll-for-dings.js')(api)
  }

  return api
}

