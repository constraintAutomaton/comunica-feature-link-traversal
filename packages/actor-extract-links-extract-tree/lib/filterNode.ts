import { BindingsFactory } from '@comunica/bindings-factory';
import { KeysInitQuery } from '@comunica/context-entries';
import type { IActionContext } from '@comunica/types';
import { Algebra, Factory as AlgebraFactory, Util } from 'sparqlalgebrajs';
import type { SatisfactionChecker } from './solver';
import { SparlFilterExpressionSolverInput, TreeRelationSolverInput } from './SolverInput';
import type { ISolverInput, Variable } from './solverInterfaces';
import type { ITreeRelation, ITreeNode } from './TreeMetadata';

const AF = new AlgebraFactory();
const BF = new BindingsFactory();

/**
   * Return the filter expression from the context.
   * @param {IActionContext} context - The context
   * @returns {Algebra.Expression | undefined} the filter expression or undefined if it is not defined
   */
export function getFilterExpression(context: IActionContext): Algebra.Expression | undefined {
  const query: Algebra.Operation = context.get(KeysInitQuery.query)!;
  const filterExpression = findNode(query, Algebra.types.FILTER);
  if (!filterExpression) {
    return undefined;
  }

  return filterExpression.expression;
}

/**
   * Analyze if the tree:Relation(s) of a tree:Node should be followed.
   * It used a {@link SatisfactionChecker} to evaluate if the link should be filtered.
   * @param {ITreeNode} node - the current TREE node
   * @param {IActionContext} context - the context
   * @param {SatisfactionChecker} satisfactionChecker - a function to check the satisfabillity of boolean expressions
   * @returns {Promise<Map<string, boolean>>} a map indicating if a tree:Relation should be follow
   */
export async function filterNode(
  node: ITreeNode,
  context: IActionContext,
  satisfactionChecker: SatisfactionChecker,
): Promise<Map<string, boolean>> {
  if (!node.relation) {
    return new Map();
  }

  if (node.relation.length === 0) {
    return new Map();
  }

  const filterOperation: Algebra.Expression | undefined =
    getFilterExpression(context);

  if (!filterOperation) {
    return new Map();
  }

  const filterMap: Map<string, boolean> = new Map();

  // Extract the bgp of the query.
  const queryBody: Algebra.Operation = context.get(KeysInitQuery.query)!;

  // Capture group relations by tree:path and tree:node to consider bounded node.
  const groupedRelations = groupRelations(node.relation);

  const calculatedFilterExpressions: Map<Variable, SparlFilterExpressionSolverInput> = new Map();
  for (const relations of groupedRelations) {
    // Accept the relation if the relation does't specify a condition.
    if (!relations[0].path || !relations[0].value) {
      addToFilterMap(filterMap, true, relations[0].node);
      continue;
    }
    // Find the quad from the bgp that are related to the TREE relation.
    const variables = findRelevantVariableFromBgp(queryBody, relations[0].path);

    // Accept the relation if no variable are linked with the relation.
    if (variables.length === 0) {
      addToFilterMap(filterMap, true, relations[0].node);
      continue;
    }
    let filtered = false;
    // For all the variable check if one has a possible solutions.
    for (const variable of variables) {
      let inputFilterExpression = calculatedFilterExpressions.get(variable);
      if (!inputFilterExpression) {
        inputFilterExpression = new SparlFilterExpressionSolverInput(
          // Make a deep copy of the filter
          Util.mapExpression(filterOperation, {}),
          variable,
        );
      }
      const inputs: ISolverInput[] = relations.map(relation => new TreeRelationSolverInput(relation, variable));
      inputs.push(inputFilterExpression);
      filtered = filtered || satisfactionChecker(inputs);
    }
    addToFilterMap(filterMap, filtered, relations[0].node);
  }
  return filterMap;
}

/**
  * Helper function to add value to the filter map while considering that a previous relation group might
  * Have permits access to the node. If a group gives access previously, we should keep the access.
  * @param {Map<string, boolean>} filterMap - The current filter map
  * @param {boolean} filtered - The current access flag
  * @param {string} node - The target node
  */
function addToFilterMap(filterMap: Map<string, boolean>, filtered: boolean, node: string): void {
  const previousFilterValue = filterMap.get(node);
  if (!previousFilterValue) {
    filterMap.set(node, filtered);
  } else {
    filterMap.set(node, filtered || previousFilterValue);
  }
}

/**
   * Find the variables from the BGP that match the predicate defined by the TREE:path from a TREE relation.
   *  The subject can be anything.
   * @param {Algebra.Operation} queryBody - the body of the query
   * @param {string} path - TREE path
   * @returns {Variable[]} the variables of the Quad objects that contain the TREE path as predicate
   */
export function findRelevantVariableFromBgp(queryBody: Algebra.Operation, path: string): Variable[] {
  const resp: Variable[] = [];
  const addVariable = (quad: any): boolean => {
    if (quad.predicate.value === path && quad.object.termType === 'Variable') {
      resp.push(quad.object.value);
    }
    return true;
  };

  Util.recurseOperation(queryBody, {
    [Algebra.types.PATH]: addVariable,
    [Algebra.types.PATTERN]: addVariable,

  });
  return resp;
}

/**
   * Group the relations by their target node and path
   * @param {ITreeRelation[]} relations - relations
   * @returns {ITreeRelation[][]} relations grouped
   */
export function groupRelations(relations: ITreeRelation[]): ITreeRelation[][] {
  const collector: Map<string, Map<string, ITreeRelation[]>> = new Map();
  const resp: ITreeRelation[][] = [];
  for (const relation of relations) {
    const path = relation.path !== undefined ? relation.path : '';
    const nodeGroup = collector.get(relation.node);
    if (nodeGroup) {
      const pathGroup = nodeGroup.get(path);
      if (pathGroup) {
        pathGroup.push(relation);
      } else {
        nodeGroup.set(path, [ relation ]);
      }
    } else {
      collector.set(relation.node, new Map([[ path, [ relation ]]]));
    }
  }

  for (const [ _path, pathGroup ] of collector) {
    for (const [ _group, relationsGroup ] of pathGroup) {
      resp.push(relationsGroup);
    }
  }
  return resp;
}

/**
   * Find the first node of the type `nodeType`, if it doesn't exist
   * it returns undefined.
   * @param {Algebra.Operation} query - the original query
   * @param {string} nodeType - the type of node requested
   * @returns {any}
   */
function findNode(query: Algebra.Operation, nodeType: string): any {
  let currentNode = query;
  do {
    if (currentNode.type === nodeType) {
      return currentNode;
    }
    if ('input' in currentNode) {
      currentNode = currentNode.input;
    }
  } while ('input' in currentNode);
  return undefined;
}
