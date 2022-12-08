import { RelationOperator } from '@comunica/types-link-traversal';
import type { ITreeRelation } from '@comunica/types-link-traversal';
import type * as RDF from 'rdf-js';
import { Algebra } from 'sparqlalgebrajs';
import { SolutionDomain } from './SolutionDomain';
import { SolutionRange } from './SolutionRange';
import { LinkOperator } from './LinkOperator';
import {
  SparqlOperandDataTypes, SolverEquationSystem,
  LogicOperatorReversed, LogicOperator, SolverExpression,
  Variable, SolverEquation, SparqlOperandDataTypesReversed
} from './solverInterfaces';
import { LastLogicalOperator } from './SolverType';

export function solveRelationWithFilter({ relation, filterExpression, variable }: {
  relation: ITreeRelation,
  filterExpression: Algebra.Expression,
  variable: Variable
}): boolean {
  LinkOperator.resetIdCount();
  const relationsolverExpressions = convertTreeRelationToSolverExpression(relation, variable);
  // the relation doesn't have a value or a type, so we accept it
  if (typeof relationsolverExpressions === 'undefined') {
    return true;
  }
  const filtersolverExpressions = convertFilterExpressionToSolverExpression(filterExpression, [], []);
  // the type are not compatible no evaluation is possible SPARQLEE will later return an error
  if (!areTypesCompatible(filtersolverExpressions.concat(relationsolverExpressions))) {
    return false;
  }
  const filterEquationSystem = createEquationSystem(filtersolverExpressions);

  return true
}

function convertTreeRelationToSolverExpression(expression: ITreeRelation, variable: string): SolverExpression | undefined {
  if (expression.value && expression.type) {
    const valueType = SparqlOperandDataTypesReversed.get((<RDF.Literal>expression.value.term).datatype.value);
    if (!valueType) {
      return undefined;
    }
    const valueNumber = castSparqlRdfTermIntoNumber(expression.value.value, valueType);
    if (!valueNumber) {
      return undefined;
    }

    return {
      variable,
      rawValue: expression.value.value,
      valueType,
      valueAsNumber: valueNumber,
      chainOperator: [],

      operator: expression.type,
    };
  }
}

function resolveAFilterTerm(expression: Algebra.Expression, operator: RelationOperator, linksOperator: LinkOperator[]): SolverExpression | undefined {
  let variable: string | undefined;
  let rawValue: string | undefined;
  let valueType: SparqlOperandDataTypes | undefined;
  let valueAsNumber: number | undefined;

  for (const arg of expression.args) {
    if ('term' in arg && arg.term.termType === 'Variable') {
      variable = arg.term.value;
    } else if ('term' in arg && arg.term.termType === 'Literal') {
      rawValue = arg.term.value;
      valueType = SparqlOperandDataTypesReversed.get(arg.term.datatype.value);
      if (valueType) {
        valueAsNumber = castSparqlRdfTermIntoNumber(rawValue!, valueType);
      }
    }
  }
  if (variable && rawValue && valueType && valueAsNumber) {
    return {
      variable,
      rawValue,
      valueType,
      valueAsNumber,
      operator,
      chainOperator: linksOperator,
    }
  }
  return undefined
}

export function convertFilterExpressionToSolverExpression(expression: Algebra.Expression, filterExpressionList: SolverExpression[], linksOperator: LinkOperator[]): SolverExpression[] {

  if (
    expression.args[0].expressionType === Algebra.expressionTypes.TERM
  ) {
    const rawOperator = expression.operator;
    const operator = filterOperatorToRelationOperator(rawOperator)
    if (typeof operator !== 'undefined') {
      const solverExpression = resolveAFilterTerm(expression, operator, new Array(...linksOperator));
      if (typeof solverExpression !== 'undefined') {
        filterExpressionList.push(solverExpression);
        return filterExpressionList;
      }
    }
  } else {
    const logicOperator = LogicOperatorReversed.get(expression.operator);
    if (typeof logicOperator !== 'undefined') {
      const operator = new LinkOperator(logicOperator);
      linksOperator.push(operator);
      for (const arg of expression.args) {
        convertFilterExpressionToSolverExpression(arg, filterExpressionList, linksOperator);
      }
    }

  }
  return filterExpressionList;
}

export function createEquationSystem(expressions: SolverExpression[]): [SolverEquationSystem, [SolverEquation, SolverEquation]] | undefined {
  const system: SolverEquationSystem = new Map();
  let firstEquationToEvaluate: [SolverEquation, SolverEquation] | undefined = undefined;

  for (const expression of expressions) {
    const lastOperator = expression.chainOperator.slice(-1).toString();
    const solutionRange = getSolutionRange(expression.valueAsNumber, expression.operator);
    if (!solutionRange) {
      return undefined;
    }
    const equation: SolverEquation = {
      chainOperator: expression.chainOperator,
      solutionDomain: solutionRange
    };
    const lastEquation = system.get(lastOperator);
    if (lastEquation) {
      if (firstEquationToEvaluate) {
        return undefined;
      }
      firstEquationToEvaluate = [lastEquation, equation];
      system.delete(lastOperator);
    } else {
      system.set(lastOperator, equation);
    }

  }
  if (!firstEquationToEvaluate) {
    return undefined;
  }
  return [system, firstEquationToEvaluate];
}

export function resolveEquationSystem(equationSystem: SolverEquationSystem, firstEquation: [SolverEquation, SolverEquation]): SolutionDomain | undefined {
  const localEquationSystem = new Map(equationSystem);
  const localFistEquation = new Array(...firstEquation);
  let domain: SolutionDomain = SolutionDomain.newWithInitialValue(localFistEquation[0].solutionDomain);
  let idx: string = "";
  let currentEquation: SolverEquation | undefined = localFistEquation[1];

  do {
    const resp = resolveEquation(currentEquation, domain);
    if (!resp) {
      return undefined;
    }
    [domain, idx] = resp;

    currentEquation = localEquationSystem.get(idx);

  } while (currentEquation)

  return domain;
}

function resolveEquation(equation: SolverEquation, domain: SolutionDomain): [SolutionDomain, LastLogicalOperator] | undefined {
  let localDomain = domain.clone();
  let i = -1;
  let currentLastOperator = equation.chainOperator.at(i);
  if (!currentLastOperator) {
    return undefined;
  }
  i--;
  localDomain = localDomain.add({ range: equation.solutionDomain, operator: currentLastOperator?.operator });

  currentLastOperator = equation.chainOperator.at(i);
  if (!currentLastOperator) {
    return [localDomain, ""];
  }
  while (currentLastOperator?.operator === LogicOperator.Not) {
    localDomain = localDomain.add({ operator: currentLastOperator?.operator });
    i--;
    currentLastOperator = equation.chainOperator.at(i);
    if (!currentLastOperator?.operator) {
      return [localDomain, ""];
    }
  }

  return [localDomain, currentLastOperator.toString()]
}


function areTypesCompatible(expressions: SolverExpression[]): boolean {
  const firstType = expressions[0].valueType;
  for (const expression of expressions) {
    if (expression.valueType !== firstType ||
      !(isSparqlOperandNumberType(firstType) &&
        isSparqlOperandNumberType(expression.valueType))) {
      return false
    }
  }
  return true
}

function getSolutionRange(value: number, operator: RelationOperator): SolutionRange | undefined {
  switch (operator) {
    case RelationOperator.GreaterThanRelation:
      return new SolutionRange([value + Number.EPSILON, Number.POSITIVE_INFINITY]);
    case RelationOperator.GreaterThanOrEqualToRelation:
      return new SolutionRange([value, Number.POSITIVE_INFINITY]);
    case RelationOperator.EqualThanRelation:
      return new SolutionRange([value, value]);
    case RelationOperator.LessThanRelation:
      return new SolutionRange([Number.NEGATIVE_INFINITY, value - Number.EPSILON]);
    case RelationOperator.LessThanOrEqualToRelation:
      return new SolutionRange([Number.NEGATIVE_INFINITY, value]);
    default:
      break;
  }
}

function castSparqlRdfTermIntoNumber(rdfTermValue: string, rdfTermType: SparqlOperandDataTypes): number | undefined {
  let jsValue: number | undefined;
  if (
    isSparqlOperandNumberType(rdfTermType)
  ) {
    jsValue = Number.parseInt(rdfTermValue, 10);
  } else if (
    rdfTermType === SparqlOperandDataTypes.Decimal ||
    rdfTermType === SparqlOperandDataTypes.Float ||
    rdfTermType === SparqlOperandDataTypes.Double
  ) {
    jsValue = Number.parseFloat(rdfTermValue);
  } else if (rdfTermType === SparqlOperandDataTypes.DateTime) {
    jsValue = new Date(rdfTermValue).getTime();
  }
  return jsValue;
}

function isSparqlOperandNumberType(rdfTermType: SparqlOperandDataTypes): boolean {
  return rdfTermType === SparqlOperandDataTypes.Integer ||
    rdfTermType === SparqlOperandDataTypes.NonPositiveInteger ||
    rdfTermType === SparqlOperandDataTypes.NegativeInteger ||
    rdfTermType === SparqlOperandDataTypes.Long ||
    rdfTermType === SparqlOperandDataTypes.Short ||
    rdfTermType === SparqlOperandDataTypes.NonNegativeInteger ||
    rdfTermType === SparqlOperandDataTypes.UnsignedLong ||
    rdfTermType === SparqlOperandDataTypes.UnsignedInt ||
    rdfTermType === SparqlOperandDataTypes.UnsignedShort ||
    rdfTermType === SparqlOperandDataTypes.PositiveInteger;
}

function filterOperatorToRelationOperator(filterOperator: string): RelationOperator | undefined {
  switch (filterOperator) {
    case '=':
      return RelationOperator.EqualThanRelation;
    case '<':
      return RelationOperator.LessThanRelation;
    case '<=':
      return RelationOperator.LessThanOrEqualToRelation;
    case '>':
      return RelationOperator.GreaterThanRelation;
    case '>=':
      return RelationOperator.GreaterThanOrEqualToRelation;
    default:
      return undefined;
  }
}
