import { ListaDaCategoria, metadadosDaCategoria, type ParametrosDaLista } from '@/components/blog/lista-da-categoria'

export function generateMetadata({ searchParams }: { searchParams: ParametrosDaLista }) {
  return metadadosDaCategoria('artigos', searchParams)
}

export default function Pagina({ searchParams }: { searchParams: ParametrosDaLista }) {
  return <ListaDaCategoria categoria="artigos" parametros={searchParams} />
}
