# Mocha Tape Deck [![CircleCI](https://circleci.com/gh/fossas/mocha-tape-deck.svg?style=svg)](https://circleci.com/gh/fossas/mocha-tape-deck) [![codecov](https://codecov.io/gh/fossas/mocha-tape-deck/branch/master/graph/badge.svg)](https://codecov.io/gh/fossas/mocha-tape-deck)
Create, manage, and replay HTTP requests and responses for fast, deterministic tests.

## Installation
### Using `npm`
`npm install --save-dev mocha-tape-deck`

### Using `yarn`
`yarn add -D mocha-tape-deck`

## Usage
Wrap an existing test that makes HTTP requests in a `TestTapeDeck`. For example:

```javascript
const rp = require('request-promise');

describe('Example without test tape deck', function () {
  const response = 'example response';
  const port = 8001;
  let app;

  beforeEach(() => {
    app = express();
    app.get('/test', (req, res) => {
      res.send(response);
    });
    app.listen(port, done);
  });

  it('makes an HTTP request', () => {
    return rp.get(`http://localhost:${port}/test`)
      .then((resp) => expect(resp).to.be.equal('example response'));
  });
});
```

becomes:

```javascript
const { TapeDeck } = require('mocha-tape-deck');
const rp = require('request-promise');

describe('Example with test tape deck', function () {
  const deck = new TapeDeck(path.join(__dirname, 'cassettes'));
  const response = 'example response';
  const port = 8001;
  let app;

  beforeEach((done) => {
    app = express();
    app.get('/test', (req, res) => {
      res.send(response);
    });
    app.listen(port, done);
  });

  // If a cassette exists, this will replay the cassette. Otherwise, it will
  // create a cassette and cache it in the TapeDeck's path.
  deck.createTest('makes an HTTP request with caching', async () => {
    const resp = await rp.get(`http://localhost:${port}/test`);
    expect(resp).to.be.equal('example response');
  }).register(this);

  // If a cassette does not exist, this will fail instead of implicitly
  // recording a cassette.
  deck.createTest('can fail on implicitly caching', async () => {
    const resp = await rp.get(`http://localhost:${port}/test`);
    expect(resp).to.be.equal('example response');
  }).register(this, { failIfNoCassette: true});
});
```

## Easy integration testing
Set the environment variable `NO_CASSETTE_MOCKING` (e.g. `NO_CASSETTE_MOCKING=true mocha ....`) to ignore all mocking code. This allows your unit/component tests to also be your integration tests!
