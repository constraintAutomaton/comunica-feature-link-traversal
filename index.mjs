import { QueryEngineFactory } from '@comunica/query-sparql-link-traversal-solid';

const myEngine = await new QueryEngineFactory().create();

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

const bindingsStream = await myEngine.queryBindings(query, {
  lenient: true,
});

let i = 0;

bindingsStream.on('data', (_binding) => {
  i += 1;
});
bindingsStream.on('end', () => {
  console.log(`there are ${i} results`);
});
bindingsStream.on('error', (error) => {
  console.error(error);
});
