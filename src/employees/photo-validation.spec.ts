import { BadRequestException } from '@nestjs/common';
import { assertValidPhoto, PHOTO_MAX_BYTES } from './employees.service';

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const pdf = Buffer.from('%PDF-1.7 fake');
const file = (originalname: string, buffer: Buffer, size = buffer.length, mimetype = 'image/jpeg') => ({ originalname, buffer, size, mimetype });

describe('assertValidPhoto (BR-MD-09)', () => {
  it('accepts JPEG and PNG photos', () => {
    expect(() => assertValidPhoto(file('me.jpg', jpeg))).not.toThrow();
    expect(() => assertValidPhoto(file('me.JPEG', jpeg))).not.toThrow();
    expect(() => assertValidPhoto(file('me.png', png, png.length, 'image/png'))).not.toThrow();
  });

  it('rejects other extensions', () => {
    expect(() => assertValidPhoto(file('me.gif', jpeg))).toThrow(BadRequestException);
    expect(() => assertValidPhoto(file('me.pdf', pdf))).toThrow(/jpg, .jpeg or .png/);
  });

  it('rejects a renamed file whose content is not an image', () => {
    expect(() => assertValidPhoto(file('me.jpg', pdf))).toThrow(/not a valid JPEG or PNG/);
  });

  it('rejects empty files and files over 10 MB', () => {
    expect(() => assertValidPhoto(file('me.jpg', jpeg, 0))).toThrow(/10 MB/);
    expect(() => assertValidPhoto(file('me.jpg', jpeg, PHOTO_MAX_BYTES + 1))).toThrow(/10 MB/);
  });
});
