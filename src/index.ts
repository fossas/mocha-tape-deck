import * as mocha from 'mocha';
import nock = require('nock');
import fs = require('fs');
import path = require('path');
import rimraf = require('rimraf');

export interface ICompilable {
  compile(suite: mocha.Suite);
}

export interface IRecordable {
  recordCassette(): ICompilable;
}

export interface IPlayable {
  playCassette(): ICompilable;
}

export function TestTapeDeck(cassettePath: string, title: string, fn?: mocha.Func | mocha.AsyncFunc): MochaTapeDeck {
  return new MochaTapeDeck(cassettePath, title, fn);
}

export class TapeDeckFactory {
  private cassettePath: string;

  constructor(cassettePath: string) {
    this.cassettePath = cassettePath;
  }

  createTestTapeDeck(title: string, fn?: mocha.Func | mocha.AsyncFunc): MochaTapeDeck {
    return new MochaTapeDeck(this.cassettePath, title, fn);
  }

  removeAllCassettes(): Promise<void> {
    return new Promise((res, rej) => {
      rimraf(this.cassettePath, (err) => {
        if (err) rej(err)
        else res()
      })
    })
  }
}

export class MochaTapeDeck extends mocha.Test implements ICompilable, IRecordable, IPlayable {
  private cassettePath: string
  private fnPrefix: () => void
  private fnSuffix: () => void
  constructor(cassettePath: string, title: string, fn?: mocha.Func | mocha.AsyncFunc) {
    super(title, fn)
    this.cassettePath = cassettePath;
    this.fnPrefix = () => {};
    this.fnSuffix = () => {};
  }

  recordCassette(): ICompilable {
    if (process.env.NO_CASSETTE_MOCKING) { 
      return this;
    }
    if (!this.fn) {
      return this
    }

    this.fnPrefix = () => {
      if (!fs.existsSync(this.cassettePath)) {
        fs.mkdirSync(this.cassettePath)
      } else if (fs.existsSync(this.getCassetteFilePath())) {
        fs.unlinkSync(this.getCassetteFilePath())
      }

      nock.recorder.rec(({
        dont_print: true,
        use_separator: false,
        output_objects: true,
      }));
    }

    this.fnSuffix = () => {
      const res = nock.recorder.play()
      fs.writeFileSync(this.getCassetteFilePath(), JSON.stringify(res, null, 2))
      nock.recorder.clear()
      nock.cleanAll()
      nock.restore()
    }

    return this;
  }

  playCassette(file?: string): ICompilable {
    if (process.env.NO_CASSETTE_MOCKING) { 
      return this;
    }

    this.fnPrefix = () => {
      const path = file || this.getCassetteFilePath()
      nock.load(path)
      nock.activate()
    }

    this.fnSuffix = () => {
      nock.restore()
      nock.cleanAll()
    }

    return this;
  }

  selectCassetteAction(fn: () => 'record' | 'play', cassettePath?: string): ICompilable {
    return fn() === 'record' ? this.recordCassette() : this.playCassette(cassettePath)
  }

  compile(suite: mocha.Suite) {
    const originalFn: any = this.fn;
    this.fn = (done?: mocha.Done): PromiseLike<any> => {
      this.fnPrefix();

      let testExecutedPromise: Promise<any>;

      let doneWrapper;
      let donePromise = new Promise((res) => {
        doneWrapper = res
      });

      const returnVal = originalFn(done ? doneWrapper : undefined);
      // sanity check for promise case
      if (returnVal && returnVal.then) {
        testExecutedPromise = returnVal;
      } else {
        //test was synchronous
        testExecutedPromise = Promise.resolve();
      }

      testExecutedPromise
        .then(() => {
          if (done) {
            return donePromise
              .then((res) => {
                done(res)
              });
          }
        })
        .then(() => this.fnSuffix())

        // if we return with a done fn defined, we get the error Resolution method is overspecified.
      if (!done) {
        return testExecutedPromise;
      }
    };

    suite.addTest(this);
  }

  private getCassetteFilePath(): string {
    return path.join(this.cassettePath, this.getCassetteName());
  }


  private getCassetteName(): string {
    return this.fullTitle().split(' ').join('_') + ".cassette";
  }
}

