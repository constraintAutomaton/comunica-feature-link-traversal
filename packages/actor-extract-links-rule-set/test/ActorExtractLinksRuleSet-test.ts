import { ActionContext, Bus } from "@comunica/core";
import { ActorExtractLinksRuleSet, DF, IRuleSet } from "../lib/ActorExtractLinksRuleSet";
import "@comunica/utils-jest";
import { isError, error, result, isResult } from "result-interface";
import { ArrayIterator } from "asynciterator";
import { rdfParser } from "rdf-parse";
import Streamify from 'streamify-string';

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

        expect(resp).toEqual(error("the rule set did not have the correct RDF type"));
      });

      it("should return an error given a rule set with no subweb", async () => {
        const string_triples = `
          <foo> a <${ActorExtractLinksRuleSet.RULE_SET_CLASS.value}>;
            <${ActorExtractLinksRuleSet.RULE_SET_RULE.value}> _:rule1;
            <${ActorExtractLinksRuleSet.RULE_SET_RULE.value}> _:rule2.
          
          _:rule1 <${ActorExtractLinksRuleSet.RULE_SET_PREMISE.value}> <p1>;
            <${ActorExtractLinksRuleSet.RULE_SET_INFERENCE.value}> <i1>;
            <${ActorExtractLinksRuleSet.RULE_SET_CONCLUSION.value}> <c1>.

          _:rule2 <${ActorExtractLinksRuleSet.RULE_SET_PREMISE.value}> <p2>;
            <${ActorExtractLinksRuleSet.RULE_SET_INFERENCE.value}> <i2>;
            <${ActorExtractLinksRuleSet.RULE_SET_CONCLUSION.value}> <c2>.
        `;
        const data = rdfParser.parse(Streamify(string_triples), { contentType: 'text/turtle' });

        mediatorDereferenceRdf.mediate.mockResolvedValueOnce({
          data
        });
        const resp = await actor.parseRuleSet("foo", context);

        expect(resp).toEqual(error("no subweb was defined to this rule set"));
      });

      it("should return an error given a rule set where not every rules are declared", async () => {
        const string_triples = `
          <foo> a <${ActorExtractLinksRuleSet.RULE_SET_CLASS.value}>;
            <${ActorExtractLinksRuleSet.RULE_SET_SUBWEB.value}> "here!";
            <${ActorExtractLinksRuleSet.RULE_SET_RULE.value}> _:rule2.
          
          _:rule1 <${ActorExtractLinksRuleSet.RULE_SET_PREMISE.value}> <p1>;
            <${ActorExtractLinksRuleSet.RULE_SET_INFERENCE.value}> <i1>;
            <${ActorExtractLinksRuleSet.RULE_SET_CONCLUSION.value}> <c1>.

          _:rule2 <${ActorExtractLinksRuleSet.RULE_SET_PREMISE.value}> <p2>;
            <${ActorExtractLinksRuleSet.RULE_SET_INFERENCE.value}> <i2>;
            <${ActorExtractLinksRuleSet.RULE_SET_CONCLUSION.value}> <c2>.
        `;
        const data = rdfParser.parse(Streamify(string_triples), { contentType: 'text/turtle' });

        mediatorDereferenceRdf.mediate.mockResolvedValueOnce({
          data
        });
        const resp = await actor.parseRuleSet("foo", context);

        expect(resp).toEqual(error("2 rule(s) was defined whereas 1 rule(s) was declared"));
      });

      it("should return an error given a rule set where inconsistent rules are defined", async () => {
        const string_triples = `
          <foo> a <${ActorExtractLinksRuleSet.RULE_SET_CLASS.value}>;
            <${ActorExtractLinksRuleSet.RULE_SET_SUBWEB.value}> "here!";
            <${ActorExtractLinksRuleSet.RULE_SET_RULE.value}> _:rule1;
            <${ActorExtractLinksRuleSet.RULE_SET_RULE.value}> _:rule2.
          
          _:rule1 <${ActorExtractLinksRuleSet.RULE_SET_PREMISE.value}> <p1>;
            <${ActorExtractLinksRuleSet.RULE_SET_INFERENCE.value}> <i1>;
            <${ActorExtractLinksRuleSet.RULE_SET_CONCLUSION.value}> <c1>.

          <rule3> <${ActorExtractLinksRuleSet.RULE_SET_PREMISE.value}> <p2>;
            <${ActorExtractLinksRuleSet.RULE_SET_INFERENCE.value}> <i2>;
            <${ActorExtractLinksRuleSet.RULE_SET_CONCLUSION.value}> <c2>.
        `;
        const data = rdfParser.parse(Streamify(string_triples), { contentType: 'text/turtle' });

        mediatorDereferenceRdf.mediate.mockResolvedValueOnce({
          data
        });
        const resp = await actor.parseRuleSet("foo", context);

        expect(resp).toEqual(error("the rule rule3 was not declared"));
      });

      it("should return an error given a rule set where a premise is missing ", async () => {
        const string_triples = `
          <foo> a <${ActorExtractLinksRuleSet.RULE_SET_CLASS.value}>;
            <${ActorExtractLinksRuleSet.RULE_SET_SUBWEB.value}> "here!";
            <${ActorExtractLinksRuleSet.RULE_SET_RULE.value}> <rule1>;
            <${ActorExtractLinksRuleSet.RULE_SET_RULE.value}> <rule2>.
          
          <rule1> <${ActorExtractLinksRuleSet.RULE_SET_PREMISE.value}> <p1>;
            <${ActorExtractLinksRuleSet.RULE_SET_INFERENCE.value}> <i1>;
            <${ActorExtractLinksRuleSet.RULE_SET_CONCLUSION.value}> <c1>.

          <rule2> <${ActorExtractLinksRuleSet.RULE_SET_INFERENCE.value}> <i2>;
            <${ActorExtractLinksRuleSet.RULE_SET_CONCLUSION.value}> <c2>.
        `;
        const data = rdfParser.parse(Streamify(string_triples), { contentType: 'text/turtle' });

        mediatorDereferenceRdf.mediate.mockResolvedValueOnce({
          data
        });
        const resp = await actor.parseRuleSet("foo", context);

        expect(resp).toEqual(error("the premise of rule2 was not defined"));
      });

      it("should return an error given a rule set where a inference is missing ", async () => {
        const string_triples = `
          <foo> a <${ActorExtractLinksRuleSet.RULE_SET_CLASS.value}>;
            <${ActorExtractLinksRuleSet.RULE_SET_SUBWEB.value}> "here!";
            <${ActorExtractLinksRuleSet.RULE_SET_RULE.value}> <rule1>;
            <${ActorExtractLinksRuleSet.RULE_SET_RULE.value}> <rule2>.
          
          <rule1> <${ActorExtractLinksRuleSet.RULE_SET_PREMISE.value}> <p1>;
            <${ActorExtractLinksRuleSet.RULE_SET_INFERENCE.value}> <i1>;
            <${ActorExtractLinksRuleSet.RULE_SET_CONCLUSION.value}> <c1>.

          <rule2> <${ActorExtractLinksRuleSet.RULE_SET_PREMISE.value}> <p2>; 
            <${ActorExtractLinksRuleSet.RULE_SET_CONCLUSION.value}> <c2>.
        `;
        const data = rdfParser.parse(Streamify(string_triples), { contentType: 'text/turtle' });

        mediatorDereferenceRdf.mediate.mockResolvedValueOnce({
          data
        });
        const resp = await actor.parseRuleSet("foo", context);

        expect(resp).toEqual(error("the inference of rule2 was not defined"));
      });

      it("should return an error given a rule set where a conclusion is missing ", async () => {
        const string_triples = `
          <foo> a <${ActorExtractLinksRuleSet.RULE_SET_CLASS.value}>;
            <${ActorExtractLinksRuleSet.RULE_SET_SUBWEB.value}> "here!";
            <${ActorExtractLinksRuleSet.RULE_SET_RULE.value}> <rule1>;
            <${ActorExtractLinksRuleSet.RULE_SET_RULE.value}> <rule2>.
          
          <rule1> <${ActorExtractLinksRuleSet.RULE_SET_PREMISE.value}> <p1>;
            <${ActorExtractLinksRuleSet.RULE_SET_INFERENCE.value}> <i1>;
            <${ActorExtractLinksRuleSet.RULE_SET_CONCLUSION.value}> <c1>.

          <rule2> <${ActorExtractLinksRuleSet.RULE_SET_PREMISE.value}> <p2>; 
            <${ActorExtractLinksRuleSet.RULE_SET_INFERENCE.value}> <i2>.
        `;
        const data = rdfParser.parse(Streamify(string_triples), { contentType: 'text/turtle' });

        mediatorDereferenceRdf.mediate.mockResolvedValueOnce({
          data
        });
        const resp = await actor.parseRuleSet("foo", context);

        expect(resp).toEqual(error("the conclusion of rule2 was not defined"));
      });

      it("should return the rule set", async () => {
        const string_triples = `
          <foo> a <${ActorExtractLinksRuleSet.RULE_SET_CLASS.value}>;
            <${ActorExtractLinksRuleSet.RULE_SET_SUBWEB.value}> "here!";
            <${ActorExtractLinksRuleSet.RULE_SET_RULE.value}> _:rule1;
            <${ActorExtractLinksRuleSet.RULE_SET_RULE.value}> _:rule2.
          
          _:rule1 <${ActorExtractLinksRuleSet.RULE_SET_PREMISE.value}> <p1>;
            <${ActorExtractLinksRuleSet.RULE_SET_INFERENCE.value}> <i1>;
            <${ActorExtractLinksRuleSet.RULE_SET_CONCLUSION.value}> <c1>.

          _:rule2 <${ActorExtractLinksRuleSet.RULE_SET_PREMISE.value}> <p2>;
            <${ActorExtractLinksRuleSet.RULE_SET_INFERENCE.value}> <i2>;
            <${ActorExtractLinksRuleSet.RULE_SET_CONCLUSION.value}> <c2>.
        `;
        const data = rdfParser.parse(Streamify(string_triples), { contentType: 'text/turtle' });

        mediatorDereferenceRdf.mediate.mockResolvedValueOnce({
          data
        });
        const resp = await actor.parseRuleSet("foo", context);
        expect((<any>resp).value.rules[0].premise).toEqual(DF.namedNode("p1"))
        expect(resp).toStrictEqual(result({
          subweb:"here!",
          rules:[
            {
              premise: DF.namedNode("p1"),
              inference: DF.namedNode("i1"),
              conclusion: DF.namedNode("c1")
            },
            {
              premise: DF.namedNode("p2"),
              inference: DF.namedNode("i2"),
              conclusion: DF.namedNode("c2")
            }
          ]
        }));
      });
    });
  });
});
