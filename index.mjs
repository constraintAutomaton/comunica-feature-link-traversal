import { LoggerBunyan, BunyanStreamProviderStdout } from '@comunica/logger-bunyan';

import { QueryEngineFactory } from '@comunica/query-sparql-link-traversal-solid';

//const configPath = '/home/bryanelliott/Documents/PhD/coding/shapeIndexExperiment/best-case/config/config-solid-shape-index.json';
const configPath = '/home/bryanelliott/Documents/PhD/coding/shapeIndexExperiment/best-case/config/config-solid-default.json';
const myEngine = await new QueryEngineFactory().create({ configPath });

console.log(configPath);
const query = `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX snvoc: <http://localhost:3000/www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/>
SELECT ?messageId ?messageCreationDate ?messageContent WHERE {
  ?message snvoc:hasCreator <http://localhost:3000/pods/00000000000000000933/profile/card#me>;
    rdf:type snvoc:Post;
    snvoc:content ?messageContent;
    snvoc:creationDate ?messageCreationDate;
    snvoc:id ?messageId.
}
`;

const streamProvider = new BunyanStreamProviderStdout({ level: 'debug' });
const loggerParams = {
  name: 'comunica',
  level: 'info',
  streamProviders: [ streamProvider ],
};
const logger = new LoggerBunyan(loggerParams);

const bindingsStream = await myEngine.queryBindings(query, {
  lenient: true,
  log: logger,
});

const bindings = await bindingsStream.toArray();
for (const binding of bindings) {
  console.log(binding.toString());
}

console.log(`there are ${bindings.length} results`);
