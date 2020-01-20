// Copyright (c) 2014-2018, MyMonero.com
// Copyright (c) 2018-2020, The TurtleCoin Developers
//
// Please see the included LICENSE file for more information.

import * as BigInteger from 'big-integer';

const alphabet: any[] = (() => {
    const alphabetStr = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
    const arr: any[] = [];
    const alphabetParts = alphabetStr.split('');

    alphabetParts.forEach((p) => {
        arr.push(p.charCodeAt(0));
    });

    return arr;
})();

const alphabetSize: number = alphabet.length;
const encodedBlockSizes: number[] = [0, 2, 3, 5, 6, 7, 9, 10, 11];
const fullBlockSize: number = 8;
const fullEncodedBlockSize: number = 11;
const UINT64_MAX: BigInteger.BigInteger = BigInteger(2).pow(64);

/**
 *  Provides methods that encode/decode hex strings to Base58 and back again.
 */
export class Base58 {
    /**
     * Decodes a Base58 string to its hexadecimal equivalent
     * @param encoded string The Base58 encoded string
     * @returns The hexadecimal representation of the data
     */
    public static decode(encoded: string): string {
        return decode(encoded);
    }

    /**
     * Encodes a hexadecimal string to its Base58 equivalent
     * @param decoded string the hexadecimal encoded string
     * @returns The Base58 representation of the data
     */
    public static encode(decoded: string): string {
        return encode(decoded);
    }
}

function binToHex(bin: Uint8Array): string {
    const out: string[] = [];

    for (const b of bin) {
        out.push(('0' + b.toString(16)).slice(-2));
    }

    return out.join('');
}

function binToString(bin: Uint8Array): string {
    const out: string[] = [];

    for (const b of bin) {
        out.push(String.fromCharCode(b));
    }

    return out.join('');
}

function decode(encStr: string): string {
    const enc = stringToBin(encStr);
    if (enc.length === 0) {
        return '';
    }
    const fullBlockCount = Math.floor(enc.length / fullEncodedBlockSize);
    const lastBlockSize = enc.length % fullEncodedBlockSize;
    const lastBlockDecodedSize = encodedBlockSizes.indexOf(lastBlockSize);
    if (lastBlockDecodedSize < 0) {
        throw new Error('Invalid encoded length');
    }
    const dataSize = fullBlockCount * fullBlockSize + lastBlockDecodedSize;
    let data = new Uint8Array(dataSize);
    for (let i = 0; i < fullBlockCount; i++) {
        data = decodeBlock(
            enc.subarray(i * fullEncodedBlockSize, i * fullEncodedBlockSize + fullEncodedBlockSize),
            data,
            i * fullBlockSize);
    }
    if (lastBlockSize > 0) {
        data = decodeBlock(
            enc.subarray(fullBlockCount * fullEncodedBlockSize, fullBlockCount * fullEncodedBlockSize + lastBlockSize),
            data,
            fullBlockCount * fullBlockSize);
    }
    return binToHex(data);
}

function decodeBlock(data: Uint8Array, buf: Uint8Array, index: number) {
    if (data.length < 1 || data.length > fullEncodedBlockSize) {
        throw new Error('Invalid block length: ' + data.length);
    }

    const resSize = encodedBlockSizes.indexOf(data.length);
    if (resSize <= 0) {
        throw new Error('Invalid block size');
    }
    let resNum = BigInteger.zero;
    let order = BigInteger.one;
    for (let i = data.length - 1; i >= 0; i--) {
        const digit = alphabet.indexOf(data[i]);
        if (digit < 0) {
            throw new Error('Invalid symbol');
        }
        const product = order.multiply(digit).add(resNum);
        if (product.compare(UINT64_MAX) === 1) {
            throw new Error('Overflow');
        }
        resNum = product;
        order = order.multiply(alphabetSize);
    }
    if (resSize < fullBlockSize && (BigInteger(2).pow(8 * resSize).compare(resNum) <= 0)) {
        throw new Error('Overflow 2');
    }
    buf.set(uint64To8be(resNum, resSize), index);
    return buf;
}

function encode(hex: string): string {
    const data = hexToBin(hex);
    if (data.length === 0) {
        return '';
    }
    const fullBlockCount = Math.floor(data.length / fullBlockSize);
    const lastBlockSize = data.length % fullBlockSize;
    const resSize = fullBlockCount * fullEncodedBlockSize + encodedBlockSizes[lastBlockSize];

    let res = new Uint8Array(resSize);
    let i;
    for (i = 0; i < resSize; ++i) {
        res[i] = alphabet[0];
    }
    for (i = 0; i < fullBlockCount; i++) {
        res = encodeBlock(
            data.subarray(i * fullBlockSize, i * fullBlockSize + fullBlockSize),
            res, i *
            fullEncodedBlockSize);
    }
    if (lastBlockSize > 0) {
        res = encodeBlock(
            data.subarray(fullBlockCount * fullBlockSize, fullBlockCount * fullBlockSize + lastBlockSize),
            res,
            fullBlockCount * fullEncodedBlockSize);
    }
    return binToString(res);
}

function encodeBlock(data: Uint8Array, buf: Uint8Array, index: number): Uint8Array {
    if (data.length < 1 || data.length > fullEncodedBlockSize) {
        throw new Error('Invalid block length: ' + data.length);
    }
    let num = uint8BeTo64(data);
    let i = encodedBlockSizes[data.length] - 1;
    while (num.compare(0) === 1) {
        const div = num.divmod(alphabetSize);
        const remainder = div.remainder;
        num = div.quotient;
        buf[index + i] = alphabet[remainder.toJSNumber()];
        i--;
    }
    return buf;
}

function hexToBin(hex: string): Uint8Array {
    if (hex.length % 2 !== 0) {
        throw new Error('Hex string has invalid length!');
    }
    const res = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length / 2; ++i) {
        res[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
    }
    return res;
}

function stringToBin(str: string): Uint8Array {
    const res = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
        res[i] = str.charCodeAt(i);
    }
    return res;
}

function uint8BeTo64(data: Uint8Array): BigInteger.BigInteger {
    if (data.length < 1 || data.length > 8) {
        throw new Error('Invalid input length');
    }
    let res: BigInteger.BigInteger = BigInteger.zero;
    const twoPow8 = BigInteger(2).pow(8);
    let i = 0;
    switch (9 - data.length) {
        case 1:
            res = res.add(data[i++]);
        /* falls through */
        case 2:
            res = res.multiply(twoPow8).add(data[i++]);
        /* falls through */
        case 3:
            res = res.multiply(twoPow8).add(data[i++]);
        /* falls through */
        case 4:
            res = res.multiply(twoPow8).add(data[i++]);
        /* falls through */
        case 5:
            res = res.multiply(twoPow8).add(data[i++]);
        /* falls through */
        case 6:
            res = res.multiply(twoPow8).add(data[i++]);
        /* falls through */
        case 7:
            res = res.multiply(twoPow8).add(data[i++]);
        /* falls through */
        case 8:
            res = res.multiply(twoPow8).add(data[i++]);
            break;
        default:
            throw new Error('Impossible condition');
    }
    return res;
}

function uint64To8be(num: BigInteger.BigInteger, size: number): Uint8Array {
    const res = new Uint8Array(size);
    if (size < 1 || size > 8) {
        throw new Error('Invalid input length');
    }
    const twopow8: BigInteger.BigInteger = BigInteger(2).pow(8);
    for (let i = size - 1; i >= 0; i--) {
        res[i] = num.remainder(twopow8).toJSNumber();
        num = num.divide(twopow8);
    }
    return res;
}
