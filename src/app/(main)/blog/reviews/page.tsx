import { ListaDaCategoria, metadadosDaCategoria, type ParametrosDaLista } from '@/components/blog/lista-da-categoria'

export function generateMetadata({ searchParams }: { searchParams: ParametrosDaLista }) {
  return metadadosDaCategoria('reviews', searchParams)
}

export default function Pagina({ searchParams }: { searchParams: ParametrosDaLista }) {
  return <ListaDaCategoria categoria="reviews" parametros={searchParams} />
}
