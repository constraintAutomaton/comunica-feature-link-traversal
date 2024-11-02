import { QueryEngineFactory } from '@comunica/query-sparql-link-traversal-solid';
import { LoggerBunyan, BunyanStreamProviderStdout } from "@comunica/logger-bunyan";

const configPath = '/home/bryanelliott/Documents/PhD/coding/shapeIndexExperiment/best-case/config/config-solid-shape-index.json';
const myEngine = await new QueryEngineFactory().create({ configPath });

const query = `
PREFIX snvoc: <https://solidbench.linkeddatafragments.org/www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/>
PREFIX foaf: <http://xmlns.com/foaf/0.1/>
SELECT ?tagName (COUNT(?message) AS ?messages) WHERE {
  ?message snvoc:hasCreator <https://solidbench.linkeddatafragments.org/pods/00000000000000000933/profile/card#me>;
    snvoc:hasTag ?tag.
  ?tag foaf:name ?tagName.
}
GROUP BY ?tagName
ORDER BY DESC (?messages)
`;

const streamProvider = new BunyanStreamProviderStdout({ level: 'info' });
const loggerParams = {
  name: 'comunica',
  level: 'info',
  streamProviders: [streamProvider],
};
const logger = new LoggerBunyan(loggerParams);

const bindingsStream = await myEngine.queryBindings(query, {
  lenient: true,
  log: logger
});

const bindings = await bindingsStream.toArray();
for (const binding of bindings) {
  console.log(binding.toString());
}
