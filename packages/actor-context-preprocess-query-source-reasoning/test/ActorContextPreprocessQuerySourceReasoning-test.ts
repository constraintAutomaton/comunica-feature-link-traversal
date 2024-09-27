import { Bus } from '@comunica/core';
import { ActorContextPreprocessQuerySourceReasoning } from '../lib/ActorContextPreprocessQuerySourceReasoning';

describe('ActorContextPreprocessQuerySourceReasoning', () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: 'bus' });
  });

  describe('An ActorContextPreprocessQuerySourceReasoning instance', () => {
    let actor: ActorContextPreprocessQuerySourceReasoning;

    beforeEach(() => {
      actor = new ActorContextPreprocessQuerySourceReasoning({ name: 'actor', bus });
    });

    it('should test', () => {
      return expect(actor.test({ todo: true })).resolves.toEqual({ todo: true }); // TODO
    });

    it('should run', () => {
      return expect(actor.run({ todo: true })).resolves.toMatchObject({ todo: true }); // TODO
    });
  });
});