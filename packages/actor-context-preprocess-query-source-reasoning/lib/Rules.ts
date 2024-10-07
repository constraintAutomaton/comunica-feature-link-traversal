import type * as RDF from '@rdfjs/types';

export interface IRule {
    premise: Premise;
    operator: Operator;
    conclusion: Conclusion;
}

export type Premise = RDF.Term;
export type Conclusion = RDF.Term;
export enum Operator {
    SAME_AS = 'http://www.w3.org/2002/07/owl#sameAs',
}

export interface IRuleGraph {
    rules: IRule[];
}

export type ScopedRules = Map<string | RDF.Source, RDF.Quad[]>;

export function parseRules(quads: RDF.Quad[]): IRuleGraph {
    const ruleGraph: IRuleGraph = {
        rules: [],
    };

    for (const quad of quads) {
        if (quad.predicate.value === Operator.SAME_AS) {
            const rule: IRule = {
                premise: quad.subject,
                operator: Operator.SAME_AS,
                conclusion: quad.object,
            };
            ruleGraph.rules.push(rule);
        }
    }

    return ruleGraph;
}
