import { ActionContext, Bus } from '@comunica/core';
import { ActorContextPreprocessQuerySourceReasoning } from '../lib/ActorContextPreprocessQuerySourceReasoning';
import { ActorInitQuery } from '@comunica/actor-init-query';
import { KeysQueryOperation, KeysQuerySourceIdentify } from '@comunica/context-entries';

describe('ActorContextPreprocessQuerySourceReasoning', () => {
  let bus: any;
  let actorInitQuery: ActorInitQuery;
  let actor;


  describe("test", () => {
    beforeEach(() => {
      bus = new Bus({ name: 'bus' });
      actorInitQuery = <any>{};
    });

    it("should test", async () => {
      const actor = new ActorContextPreprocessQuerySourceReasoning({
        name: 'actor',
        bus,
        actorInitQuery
      });
      expect(await actor.test(<any>{})).toBe(true);
    })
  });

  describe("run", () => {

    beforeEach(() => {
      bus = new Bus({ name: 'bus' });
      actorInitQuery = <any>{};
      actor = new ActorContextPreprocessQuerySourceReasoning({
        name: 'actor',
        bus,
        actorInitQuery
      });
    });

    it('should not modify the context given that there is no querySources', async () => {
      const context = new ActionContext();

      expect(await actor.run({ context })).toStrictEqual({ context });
    });

    it('should throw an error if no rule key is defined', async () => {
      const context = new ActionContext({
        [KeysQueryOperation.querySources.name]: []
      });
      await expect(actor.run({ context })).rejects.toThrow('no rule key defined');
    });

    it('should wrap no sources when no sources was given', async ()=>{

    });
  });
});
