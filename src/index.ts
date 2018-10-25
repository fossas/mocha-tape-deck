import fs = require('fs');
import nock = require('nock');
import * as mocha from 'mocha';
import path = require('path');
import rimraf = require('rimraf');
import sanitize = require('sanitize-filename');

export type RegistrationOptions = {
  failIfNoCassette: boolean;
};

export interface ICompilable {
  register(suite: mocha.Suite, options?: RegistrationOptions): void;
}

export interface IRecordable {
  recordCassette(cassetteFileName?: string): ICompilable;
}

export interface IPlayable {
  playCassette(cassetteFileName?: string): ICompilable;
}

export function TestTapeDeck(cassettePath: string, title: string, fn?: mocha.Func | mocha.AsyncFunc): MochaTapeDeck {
  return new MochaTapeDeck(cassettePath, title, fn);
}

export class TapeDeck {
  private cassettePath: string;

  constructor(cassettePath: string) {
    this.cassettePath = cassettePath;
  }

  public createTest(title: string, fn?: mocha.Func | mocha.AsyncFunc): MochaTapeDeck {
    return new MochaTapeDeck(this.cassettePath, title, fn);
  }

  public removeAllCassettes(): Promise<void> {
    return new Promise((res, rej) => {
      rimraf(this.cassettePath, (err) => {
        if (err) { rej(err); } else { res(); }
      });
    });
  }
}

export class MochaTapeDeck extends mocha.Test implements ICompilable, IRecordable, IPlayable {
  private cassettePath: string;
  private fnPrefix: () => void;
  private fnSuffix: () => void;
  private actionSpecified: boolean;

  constructor(cassettePath: string, title: string, fn?: mocha.Func | mocha.AsyncFunc) {
    super(title, fn);
    this.cassettePath = cassettePath;
    this.fnPrefix = () => {};
    this.fnSuffix = () => {};

    this.actionSpecified = false;
  }

  public recordCassette(cassetteFileName?: string): ICompilable {
    this.actionSpecified = true;
    if (process.env.NO_CASSETTE_MOCKING) {
      return this;
    }
    if (!this.fn) {
      return this;
    }

    let cassetteFilePath;

    this.fnPrefix = () => {
      if (!fs.existsSync(this.cassettePath)) {
        fs.mkdirSync(this.cassettePath);
      }

      if (fs.existsSync(this.getCassetteFilePath(cassetteFileName))) {
        cassetteFilePath = cassetteFileName ? path.join(this.cassettePath, cassetteFileName) : this.getCassetteFilePath();
        fs.unlinkSync(cassetteFilePath);
      }

      nock.recorder.rec(({
        dont_print: true,
        use_separator: false,
        output_objects: true
      }));
    };

    this.fnSuffix = () => {
      const res = nock.recorder.play();
      fs.writeFileSync(this.getCassetteFilePath(cassetteFileName), JSON.stringify(res, null, 2));
    };

    return this;
  }

  public playCassette(cassetteFileName?: string): ICompilable {
    this.actionSpecified = true;
    if (process.env.NO_CASSETTE_MOCKING) {
      return this;
    }

    this.fnPrefix = () => {
      const cassettePath = this.getCassetteFilePath(cassetteFileName);
      nock.load(cassettePath);
      if (!nock.isActive()) {
        nock.activate();
      }
    };

    this.fnSuffix = () => {
    };

    return this;
  }

  public selectCassetteAction(fn: () => 'record' | 'play', cassettePath?: string): ICompilable {
    return fn() === 'record' ? this.recordCassette() : this.playCassette(cassettePath);
  }

  public register(suite: mocha.Suite,  options: RegistrationOptions = { failIfNoCassette: false}): void {
    const originalFn: any = this.fn;

    this.fn = (done?: mocha.Done): PromiseLike<any> => {
      if (!this.actionSpecified) {
        if (this.cassetteExists(this.getCassetteFilePath())) {
          this.playCassette();
        } else {
          if (options.failIfNoCassette) {
            throw new Error('Expected cassette file for mocha tape-deck player does not exist');
          }
          this.recordCassette();
        }
      }
      this.fnPrefix();

      let testExecutedPromise: Promise<any>;

      let doneWrapper;
      const donePromise = new Promise((res) => {
        doneWrapper = res;
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
                done(res);
              });
          }
        })
        .then(() => this.fnSuffix())
        .then(this.resetNock.bind(this))
        .catch(this.resetNock.bind(this));

        // if we return with a done fn defined, we get the error Resolution method is overspecified.
      if (!done) {
        return testExecutedPromise;
      }
    };

    suite.addTest(this);
  }

  private resetNock() {
    nock.recorder.clear();
    nock.cleanAll();
    nock.restore();
  }

  private cassetteExists(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  private getCassetteFilePath(filename?: string): string {
    return path.join(this.cassettePath, filename || this.getCassetteName());
  }

  private getCassetteName(filename?: string): string {
    // remove all spaces and /, replace them with _ and - respectively
    return sanitize(filename || this.fullTitle()) + '.cassette';
  }
}
