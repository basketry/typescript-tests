import { Factory } from './runtime';

describe('runtime', () => {
  it('works', () => {
    const generate = new Factory(1234567);

    console.log(
      generate.validArray(() => generate.validString(), {
        uniqueItems: true,
        minItems: 3,
      }),
    );
  });
});
