/**
 * @license
 * Copyright (c) 2015 The Polymer Project Authors. All rights reserved.
 * This code may only be used under the BSD style license found at http://polymer.github.io/LICENSE.txt
 * The complete set of authors may be found at http://polymer.github.io/AUTHORS.txt
 * The complete set of contributors may be found at http://polymer.github.io/CONTRIBUTORS.txt
 * Code distributed by Google as part of the polymer project is also
 * subject to an additional IP rights grant found at http://polymer.github.io/PATENTS.txt
 */
import * as chalk from 'chalk';
import * as cleankill from 'cleankill';
import * as freeport from 'freeport';
import * as selenium_old from 'selenium-standalone';
import * as which from 'which';
import * as child_process from 'child_process';
import * as wct from 'wct';
import * as promisify from 'promisify-node';
import * as selenium from 'selenium-webdriver';

const SELENIUM_VERSION: string = require('../package.json')['selenium-version'];


type Args = string[];

export async function checkSeleniumEnvironment() {
}

export async function startSeleniumServer(wct: wct.Context, args: string[]) {
  wct.emit('log:info', 'Starting Selenium server for local browsers');

  const opts = {args: args, install: false};
  return seleniumStart(wct, opts);
}

export async function installAndStartSeleniumServer(wct: wct.Context, args: string[]) {
  wct.emit('log:info', 'Installing and starting Selenium server for local browsers');

  const opts = {args: args, install: true};
  return seleniumStart(wct, opts);
}

async function seleniumStart(wct: wct.Context, opts: {args: string[], install: boolean}): Promise<number> {
  const port = await promisify(freeport)();

  // See below.
  const log: string[] = [];
  function onOutput(data: any) {
    const message = data.toString();
    log.push(message);
    wct.emit('log:debug', message);
  }

  const config: selenium_old.StartOpts = {
    seleniumArgs: ['-port', port.toString()].concat(opts.args),
    // Bookkeeping once the process starts.
    spawnCb: function(server: child_process.ChildProcess) {
      // Make sure that we interrupt the selenium server ASAP.
      cleankill.onInterrupt(function(done) {
        server.kill();
        done();
      });

      server.stdout.on('data', onOutput);
      server.stderr.on('data', onOutput);
    },
  };

  if (opts.install) {
    try {
      await promisify(selenium_old.install)({version: SELENIUM_VERSION, logger: onOutput});
    } catch (error) {
      log.forEach((line) => wct.emit('log:info', line));
      throw error;
    }
  }

  try {
    await promisify(selenium_old.start)(config);
  } catch (error) {
    log.forEach((line) => wct.emit('log:info', line));
    throw error;
  }

  wct.emit('log:info', 'Selenium server running on port', chalk.yellow(port.toString()));
  return port;
}
