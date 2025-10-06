import { LoggerBunyan, BunyanStreamProviderStdout } from '@comunica/logger-bunyan';
import { KeyReasoning } from '@comunica/context-entries';
import { QueryEngineFactory } from '@comunica/query-sparql-link-traversal-solid';
import { DataFactory } from 'rdf-data-factory';

const DF = new DataFactory();
// https://github.com/comunica/comunica/blob/7f2c7dbf5d957b0728af4065c2c6721c43e6aeae/packages/actor-query-operation-construct/lib/BindingsToQuadsIterator.ts#L53

const configPath = './engines/config-query-sparql-link-traversal/config/config-solid-default.json';
const myEngine = await new QueryEngineFactory().create({ configPath });
//const myEngine = await new QueryEngineFactory().create();

const query = `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX snvoc: <https://solidbench.linkeddatafragments.org/www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
SELECT ?locationName (COUNT(?message) AS ?messages) WHERE {
  ?message snvoc:hasCreator <https://solidbench.linkeddatafragments.org/pods/00000000000000000933/profile/card#me>;
    rdf:type snvoc:Comment;
    snvoc:isLocatedIn ?location.
  ?location foaf:name ?locationName.
}
GROUP BY ?locationName
ORDER BY DESC (?messages)
`;
 
const streamProvider = new BunyanStreamProviderStdout({ level: 'debug' });
const loggerParams = {
  name: 'comunica',
  level: 'info',
  streamProviders: [streamProvider],
};
const logger = new LoggerBunyan(loggerParams);

const snvocPrefix = "https://solidbench.linkeddatafragments.org/www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/";
const sameAs = DF.namedNode("http://www.w3.org/2002/07/owl#sameAs");
/**
 * <> a ex:ruleSheet
 *   si:subweb "pod regex"
 *   ex:rules _:rules
 * _:rules ex:rule _:rule1
 * _rule1 ex:premise 
 */
const debugRule = [
    DF.quad(
      DF.namedNode("http://xmlns.com/foaf/0.1/name"),
      sameAs,
      DF.namedNode(`http://xmlns.com/foaf/0.1/name2`)
    ),
    DF.quad(
      DF.namedNode(`http://xmlns.com/foaf/0.1/name2`),
      sameAs,
      DF.namedNode(`http://xmlns.com/foaf/0.1/name3`)
    )
  ];

const bindingsStream = await myEngine.queryBindings(query, {
  lenient: true,
  //log: logger,
  [KeyReasoning.rules.name]: new Map([
    ["*", debugRule]
  ]),
  //sources: ["https://solidbench.linkeddatafragments.org/pods/00000000000000000933/profile/card#me"]

});

let i = 0;
bindingsStream.on('data', (binding) => {
  console.log(binding.toString());
  i += 1;
});
bindingsStream.on('end', () => {
  console.log(`there are ${i} results`);

});
bindingsStream.on('error', (error) => {
  console.error(error);
});
