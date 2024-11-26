import { LoggerBunyan, BunyanStreamProviderStdout } from '@comunica/logger-bunyan';

import { QueryEngineFactory } from '@comunica/query-sparql-link-traversal-solid';

const configPath = './config_debug.json';
const myEngine = await new QueryEngineFactory().create({ configPath });

const query = `
PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
PREFIX snvoc: <https://solidbench.linkeddatafragments.org/www.ldbc.eu/ldbc_socialnet/1.0/vocabulary/>
SELECT ?messageId ?messageCreationDate ?messageContent WHERE {
  ?message snvoc:hasCreator <https://solidbench.linkeddatafragments.org/pods/00000000000000000933/profile/card#me>;
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
  //log: logger,
});

let i = 0;
bindingsStream.on('data', (binding) => {
    console.log(binding.toString()); // Quick way to print bindings for testing
    i+=1;
});
bindingsStream.on('end', () => {
    console.log(`there are ${i} results`);

});
bindingsStream.on('error', (error) => {
    console.error(error);
});


