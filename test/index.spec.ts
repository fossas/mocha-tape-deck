import { expect } from 'chai';
import * as rp from 'request-promise';
import { TapeDeckFactory } from '../src';
import path = require('path');
import express = require('express')
import http = require('http')
const PORT = 8675

describe('Mocha Tape Deck', function () {
  let app: express.Express;
  let server: http.Server;
  let tapeDeckFactory: TapeDeckFactory;

  tapeDeckFactory = new TapeDeckFactory(path.join(__dirname, 'cassettes'))

  beforeEach((done) => {
    app = express()
    server = app.listen(PORT, done)
  })

  afterEach((done) => {
    server.close(done)
  })

  describe('Mocks the http requests that were recorded', function () {
    let response = 'response1'
    beforeEach(() => {
      app.get('/test', (res: express.Response) => {
        res.send(response)
      })
    })

    after(() => tapeDeckFactory.removeAllCassettes());
    
    // tests are executed in reverse order that they're compiled in
    tapeDeckFactory.createTestTapeDeck('reading case', async () => {
      const resp = await rp.get(`localhost:${PORT}/test`)
      expect(resp).to.be.equal('response1')
    })
    .recordCassette()
    .compile(this)
  
    tapeDeckFactory.createTestTapeDeck('reading case', async () => {
      response = "incorrectResponse"
      const resp = await rp.get(`localhost:${PORT}/test`)
      expect(resp).to.be.equal('response1')
    })
    .playCassette()
    .compile(this)

  })

});
