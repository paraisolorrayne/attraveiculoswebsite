// organization-schema e website-schema foram removidos: a entidade AutoDealer
// e o nó WebSite são declarados uma única vez, no layout raiz.
//
// local-business-schema também saiu: ninguém o importava e ele carregava o
// endereço antigo ("Av. Rondon Pacheco, 4600 - Tibery") mais uma segunda
// unidade que a Attra não confirmou. Código morto com dado errado é armadilha
// para quem for usá-lo depois. O endereço correto vive em src/lib/constants.ts.
export * from './faq-schema'
