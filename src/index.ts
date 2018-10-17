import * as mocha from 'mocha';
import nock = require('nock');
import fs = require('fs');
import path = require('path');
import rimraf = require('rimraf');

export interface ICompilable {
  compile(suite: mocha.Suite): void;
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
  private testWrapper: () => Promise<void>


  constructor(cassettePath: string, title: string, fn?: mocha.Func | mocha.AsyncFunc) {
    super(title, fn)
    this.cassettePath = cassettePath;
  }

  recordCassette(): ICompilable {
    this.testWrapper = () => {
      if (!fs.existsSync(this.cassettePath)) {
        fs.mkdirSync(this.cassettePath)
      } else if (fs.existsSync(this.getCassetteFilePath())) {
        fs.unlinkSync(this.getCassetteFilePath())
      }
    }
    if (!this.fn) {
      return this
    }



    const originalFn: any = this.fn;
    this.fn = ((context: mocha.Context, done?: mocha.Done): PromiseLike<any> => {
      nock.recorder.rec(({
        dont_print: true,
        use_separator: false,
        output_objects: true,
        // logging: this.appendToFile.bind(this),
      }));

      const tmp = (global.context as any).it;

      let testExecutedPromise: Promise<any>;

      const returnVal = originalFn(context, done)
      // sanity check for promise case
      if (returnVal && returnVal.then) {
        testExecutedPromise = returnVal
      } else {
        //test was synchronous
        testExecutedPromise = Promise.resolve();
      }

      return returnVal
        .then(() => {
          const n = nock;
          const res = nock.recorder.play()
          fs.writeFileSync(this.getCassetteFilePath(), JSON.stringify(res, null, 2))
        });
    }) as any

    return this;
  }

  playCassette(file?: string): ICompilable {
    const path = file || this.getCassetteFilePath()
    nock.load(path)

    return this;
  }

  compile(suite: mocha.Suite) {
    suite.addTest(this)
  }

  private getCassetteFilePath(): string {
    return path.join(this.cassettePath, this.getCassetteName())
  }


  private getCassetteName(): string {
    return this.title.replace(" ", "_") + '.cassette';
  }

  private appendToFile(content: {}) {
    fs.appendFileSync(this.getCassetteFilePath(), JSON.stringify(content, null, 2))
  }
}

