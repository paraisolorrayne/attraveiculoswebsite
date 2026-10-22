import Image from 'next/image'

/**
 * Abertura de marca: tela preta, o logo saindo do desfoque e uma linha que
 * se enche embaixo; depois a tela sobe e revela o hero. ~1,9 s, só na
 * primeira página da visita e só na home — quem chega numa ficha (anúncio,
 * Google) vai direto ao carro.
 *
 * Fica no layout, fora do <main>: o <main> tem transform (page-enter), e com
 * ele o `fixed` cobriria só o <main>, por baixo do cabeçalho. O script vem
 * antes de todo o resto da página e só liga a abertura na home (`/`): se a
 * visita já viu a abertura, ela nem é desenhada. Ele marca `data-abertura-agora` no <html> só durante a
 * animação e tira depois, para que voltar à home por um link (sem recarregar)
 * não repita a abertura. Sem JavaScript, ou com movimento reduzido, não há
 * abertura (motion.css).
 */
const SCRIPT = `try{var r=document.documentElement;if(location.pathname==='/'&&!sessionStorage.getItem('attra:abertura')){sessionStorage.setItem('attra:abertura','1');r.dataset.aberturaAgora='1';setTimeout(function(){delete r.dataset.aberturaAgora},2600)}}catch(e){}`

export function AberturaAttra() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: SCRIPT }} />
      <div className="abertura" aria-hidden="true">
        <Image
          src="/images/logo-white.png"
          alt=""
          width={140}
          height={40}
          unoptimized
          className="abertura__logo h-auto"
        />
        <span className="abertura__linha"><span /></span>
      </div>
    </>
  )
}
