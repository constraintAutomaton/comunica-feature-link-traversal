import { Operator, parseRules, SameAsRule } from "../lib/Rules";
import { DataFactory } from 'rdf-data-factory';

const DF = new DataFactory();

describe("Rule", () => {
    describe("parseRules", () => {
        it("should parse no rules with an empty list of quads", () => {
            expect(parseRules([])).toStrictEqual({ rules: [] });
        });

        it("should parse no rules with an empty list of quads with no recognized rules", () => {
            const quads = [
                DF.quad(DF.blankNode(), DF.namedNode("foo"), DF.blankNode()),
                DF.quad(DF.blankNode(), DF.namedNode("bar"), DF.blankNode()),
                DF.quad(DF.blankNode(), DF.namedNode("boo"), DF.blankNode())
            ];
            expect(parseRules(quads)).toStrictEqual({ rules: [] });
        });

        it("should parse a rule", () => {
            const expectedPremise = DF.namedNode("aaa");
            const expectedConclusion = DF.namedNode("bar");
            const quads = [
                DF.quad(expectedPremise, DF.namedNode(Operator.SAME_AS), expectedConclusion),
            ];
            const ruleGraph = parseRules(quads);
            expect(ruleGraph.rules.length).toStrictEqual(1);

            const rule = ruleGraph.rules[0];

            expect(rule.premise).toStrictEqual(expectedPremise);
            expect(rule.operator).toStrictEqual(Operator.SAME_AS);
            expect(rule.conclusion).toStrictEqual(expectedConclusion);
        });

        it("should parse multiple rules", () => {
            const expectedPremise1 = DF.namedNode("aaa");
            const expectedConclusion1 = DF.namedNode("bar");

            const expectedPremise2 = DF.namedNode("bbb");
            const expectedConclusion2 = DF.namedNode("bar2");

            const quads = [
                DF.quad(expectedPremise1, DF.namedNode(Operator.SAME_AS), expectedConclusion1),
                DF.quad(DF.blankNode(), DF.namedNode("bar"), DF.blankNode()),
                DF.quad(DF.blankNode(), DF.namedNode("boo"), DF.literal("abc")),
                DF.quad(expectedPremise2, DF.namedNode(Operator.SAME_AS), expectedConclusion2),
                DF.quad(DF.blankNode(), DF.namedNode("boo"), DF.namedNode("")),
            ];
            const ruleGraph = parseRules(quads);
            expect(ruleGraph.rules.length).toStrictEqual(2);

            const rule1 = ruleGraph.rules[0];

            expect(rule1.premise).toStrictEqual(expectedPremise1);
            expect(rule1.operator).toStrictEqual(Operator.SAME_AS);
            expect(rule1.conclusion).toStrictEqual(expectedConclusion1);

            const rule2 = ruleGraph.rules[1];

            expect(rule2.premise).toStrictEqual(expectedPremise2);
            expect(rule2.operator).toStrictEqual(Operator.SAME_AS);
            expect(rule2.conclusion).toStrictEqual(expectedConclusion2);
        });
    });

    describe("SameAsRule", () => {
        describe("forwardChaining", () => {
            it("should return undefined if the quad is not associated with the rule", () => {
                const premise = DF.namedNode("foo");
                const conclusion = DF.namedNode("bar");
                const quad = DF.quad(DF.blankNode(), DF.namedNode("something"), DF.blankNode());
                const rule = new SameAsRule(premise, conclusion);

                expect(rule.forwardChaining(quad)).toBeUndefined();
            });

            it("should materialize a triple if the premise is at the subject position", () => {
                const premise = DF.namedNode("foo");
                const conclusion = DF.namedNode("bar");
                const object = DF.blankNode();
                const quad = DF.quad(premise, DF.namedNode("something"), object);
                const rule = new SameAsRule(premise, conclusion);

                expect(rule.forwardChaining(quad)).toStrictEqual(
                    DF.quad(conclusion, DF.namedNode("something"), object)
                );
            });

            it("should materialize a triple if the premise is at the predicate position", () => {
                const premise = DF.namedNode("foo");
                const conclusion = DF.namedNode("bar");
                const object = DF.blankNode();
                const quad = DF.quad(DF.namedNode("something"), premise, object);
                const rule = new SameAsRule(premise, conclusion);

                expect(rule.forwardChaining(quad)).toStrictEqual(
                    DF.quad(DF.namedNode("something"), conclusion, object)
                );
            });

            it("should materialize a triple if the premise is at the object position", () => {
                const premise = DF.namedNode("foo");
                const conclusion = DF.namedNode("bar");
                const subject = DF.blankNode();
                const quad = DF.quad(subject, DF.namedNode("something"), premise);
                const rule = new SameAsRule(premise, conclusion);

                expect(rule.forwardChaining(quad)).toStrictEqual(
                    DF.quad(subject, DF.namedNode("something"), conclusion)
                );
            });
        });
    })
});