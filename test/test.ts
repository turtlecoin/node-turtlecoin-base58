// Copyright (c) 2018-2021, The TurtleCoin Developers
//
// Please see the included LICENSE file for more information.

import * as assert from 'assert';
import { describe, it } from 'mocha';
import { Base58 } from '../src/base58';

describe('Test Base58', () => {
    const expectedRaw =
        '9df6ee01c179d13e2a0c52edd8b821e2d53d707e47ddcaaf696644a45563564c2934bd50' +
        'a8faca00a94c5a4dcc3cf070898c2db6ff5990556d08f5a09c8787900dcecab3b77173c1';

    const expectedEncoded =
        'TRTLv2RUL7X82vLeXnFmF7cfhKJ6UeiJzJdWQf556DEb7tkVqDAs7FVVKQVqkZqY47Q1PFwne2jZNKEn1gEeTWrb3JxG7HaMU4Q';

    it('Encoding', () => {
        const encoded = Base58.encode(expectedRaw);

        assert(encoded === expectedEncoded);
    });

    it('Decoding', () => {
        const decoded = Base58.decode(expectedEncoded);

        assert(decoded === expectedRaw);
    });
});
