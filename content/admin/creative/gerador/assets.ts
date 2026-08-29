/**
 * As imagens fixas da marca, servidas de /public/gerador/.
 *
 * Eram 1,04 MB de base64 dentro do HTML — o iframe as rebaixava a cada
 * abertura, sem cache possível. Aqui são URLs: o navegador guarda, e o código
 * do gerador volta a caber na cabeça.
 */
import type { Assets } from './tipos'

const ARQUIVOS = {
	logoBranca: '/gerador/logo-branca.png',
	logoPreta: '/gerador/logo-preta.jpg',
	fundoEditorial: '/gerador/fundo-editorial.jpg',
	fachadaClassico: '/gerador/fachada-classico.jpg',
	fachadaLoja: '/gerador/fachada-loja.jpg',
	pisoConcreto: '/gerador/piso-concreto.jpg',
	pisoAsfalto: '/gerador/piso-asfalto.jpg',
} as const

export function carregar(src: string): Promise<HTMLImageElement> {
	return new Promise((resolve, reject) => {
		const img = new Image()
		img.onload = () => resolve(img)
		img.onerror = () => reject(new Error(`gerador: falhou ao carregar ${src}`))
		img.src = src
	})
}

/**
 * A logo preta vem em JPEG, que não tem transparência: sobre o piso claro do
 * Clássico ela apareceria dentro de um retângulo branco. Aqui o branco vira
 * transparente, com o mesmo limiar do HTML — luminância média acima de 232 e
 * canais a menos de 20 de distância entre si, para não comer o vermelho da
 * marca, que tem R alto e G/B baixos.
 */
export function brancoParaTransparente(img: HTMLImageElement): HTMLCanvasElement {
	const c = document.createElement('canvas')
	c.width = img.naturalWidth
	c.height = img.naturalHeight
	const x = c.getContext('2d')!
	x.drawImage(img, 0, 0)
	const d = x.getImageData(0, 0, c.width, c.height)
	for (let i = 0; i < d.data.length; i += 4) {
		const r = d.data[i]
		const g = d.data[i + 1]
		const b = d.data[i + 2]
		if ((r + g + b) / 3 > 232 && Math.abs(r - g) < 20 && Math.abs(g - b) < 20) d.data[i + 3] = 0
	}
	x.putImageData(d, 0, 0)
	return c
}

let cache: Promise<Assets> | null = null

/**
 * Carrega tudo uma vez por sessão do navegador. Trocar de aba ou de formato
 * não recarrega nada — e o primeiro desenho só acontece depois disto resolver,
 * senão o Clássico abre sem fachada e o operador vê a peça "piscar".
 */
export function carregarAssets(): Promise<Assets> {
	cache ??= (async (): Promise<Assets> => {
		const [logoBranca, logoPretaCrua, fundoEditorial, fachadaClassico, fachadaLoja, pisoConcreto, pisoAsfalto] =
			await Promise.all([
				carregar(ARQUIVOS.logoBranca),
				carregar(ARQUIVOS.logoPreta),
				carregar(ARQUIVOS.fundoEditorial),
				carregar(ARQUIVOS.fachadaClassico),
				carregar(ARQUIVOS.fachadaLoja),
				carregar(ARQUIVOS.pisoConcreto),
				carregar(ARQUIVOS.pisoAsfalto),
			])
		return {
			logoBranca,
			logoPreta: brancoParaTransparente(logoPretaCrua),
			fundoEditorial,
			fachadaClassico,
			fachadaLoja,
			pisoConcreto,
			pisoAsfalto,
		}
	})()
	return cache
}

/** Só para teste: esquece o que já foi carregado. */
export function limparCacheDeAssets(): void {
	cache = null
}
