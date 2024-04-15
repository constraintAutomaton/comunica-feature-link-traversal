import type { ILink } from '@comunica/bus-rdf-resolve-hypermedia-links';

export type FilterFunction = (link: ILink) => boolean;
