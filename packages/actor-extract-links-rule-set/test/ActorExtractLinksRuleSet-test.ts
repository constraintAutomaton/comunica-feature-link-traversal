import { ActionContext, Bus } from "@comunica/core";
import { ActorExtractLinksRuleSet, DF } from "../lib/ActorExtractLinksRuleSet";
import "@comunica/utils-jest";
import { isError, error, result } from "result-interface";
import { ArrayIterator } from "asynciterator";

describe("ActorExtractLinksRuleSet", () => {
  let bus: any;

  beforeEach(() => {
    bus = new Bus({ name: "bus" });
  });

  describe("ActorExtractLinksRuleSet", () => {
    describe("test", () => {
      let actor: ActorExtractLinksRuleSet;

      beforeEach(() => {
        actor = new ActorExtractLinksRuleSet({
          name: "actor",
          bus,
          mediatorDereferenceRdf: <any>{},
        });
      });
      it("should test", () => {
        const action: any = {};
        return expect(actor.test(action)).resolves.toPassTestVoid(); // TODO
      });
    });

    describe("discoverRuleSetFromTriples", () => {
      let actor: ActorExtractLinksRuleSet;

      beforeEach(() => {
        actor = new ActorExtractLinksRuleSet({
          name: "actor",
          bus,
          mediatorDereferenceRdf: <any>{},
        });
      });

      it("should return an error given an stream error", async () => {
        const metadata: any = {
          on: (event: string, fn: Function) => {
            if (event === "error") {
              fn(new Error("expected"));
            }
          },
        };
        const resp = await actor.discoverRuleSetFromTriples(metadata);
        expect(resp).toEqual(error(new Error("expected")));
      });

      it("should return an error given a stream with no rule set IRI", async () => {
        const metadata: any = new ArrayIterator(
          [
            DF.quad(DF.blankNode(), DF.blankNode(), DF.blankNode()),
            DF.quad(DF.blankNode(), DF.namedNode("aa"), DF.namedNode("k")),
            DF.quad(DF.blankNode(), DF.blankNode(), DF.blankNode()),
          ],
          { autoStart: false }
        );

        const resp = await actor.discoverRuleSetFromTriples(metadata);
        expect(resp).toEqual(
          error(ActorExtractLinksRuleSet.ERROR_MESSAGE_NO_RULE_SET)
        );
      });

      it("should return a result", async () => {
        const metadata: any = new ArrayIterator(
          [
            DF.quad(DF.blankNode(), DF.blankNode(), DF.blankNode()),
            DF.quad(
              DF.namedNode("a"),
              ActorExtractLinksRuleSet.RULE_SET_LOCATOR_NODE,
              DF.namedNode("r")
            ),
            DF.quad(DF.blankNode(), DF.blankNode(), DF.blankNode()),
          ],
          { autoStart: false }
        );

        const resp = await actor.discoverRuleSetFromTriples(metadata);
        expect(resp).toEqual(result("r"));
      });
    });

    describe("parseRuleSet", () => {
      let actor: ActorExtractLinksRuleSet;
      let mediatorDereferenceRdf = {
        mediate: jest.fn(),
      };
      const context = new ActionContext();

      beforeEach(() => {
        mediatorDereferenceRdf = {
          mediate: jest.fn(),
        };
        actor = new ActorExtractLinksRuleSet({
          name: "actor",
          bus,
          mediatorDereferenceRdf: <any>mediatorDereferenceRdf,
        });
      });

      it("should return an error given a mediatorDereferenceRdf error", async () => {
        mediatorDereferenceRdf.mediate.mockRejectedValueOnce(new Error("m"));
        const resp = await actor.parseRuleSet("r", context);

        expect(resp).toEqual(error(new Error("m")))
      });

      it("should return an error given a set of unrelated triples", async () => {
        const data = new ArrayIterator(
          [
            DF.quad(DF.blankNode(), DF.blankNode(), DF.blankNode()),
            DF.quad(
              DF.namedNode("a"),
              ActorExtractLinksRuleSet.RULE_SET_LOCATOR_NODE,
              DF.namedNode("r")
            ),
            DF.quad(DF.blankNode(), DF.blankNode(), DF.blankNode()),
          ],
          { autoStart: false }
        );
        
        mediatorDereferenceRdf.mediate.mockResolvedValueOnce({
          data
        });
        const resp = await actor.parseRuleSet("r", context);

        expect(resp).toEqual(error(new Error("m")))
      });
    });
  });
});
