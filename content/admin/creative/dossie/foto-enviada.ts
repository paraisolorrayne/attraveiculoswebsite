/**
 * Foto que o operador manda do computador para um slot do dossiê.
 *
 * POR QUE `blob:` E NÃO BASE64. O documento inteiro é remontado a cada tecla
 * digitada no formulário e entregue ao iframe por `srcDoc` — que é uma string.
 * Uma foto embutida em base64 entraria nessa string: 400 KB de imagem viram
 * ~530 KB de texto que o navegador reparseia a cada letra digitada em qualquer
 * campo. Com três ou quatro fotos enviadas, digitar o torque ficaria travado.
 * A `blob:` URL ocupa 50 caracteres na string e a imagem vive fora dela.
 *
 * E FUNCIONA NA IMPRESSÃO. A janela de impressão nasce de `window.open('')`,
 * que herda a origem desta página; uma `blob:` URL criada aqui resolve lá. Se
 * fosse origem diferente, não resolveria — e é por isso que a impressão não
 * pode virar um `srcdoc` de outra origem sem revisar esta decisão.
 *
 * A REDUÇÃO É NECESSÁRIA. Foto de celular chega com 6000×4000. A maior caixa
 * do dossiê é a capa sangrada, 210 mm — a 200 dpi isso dá ~1650 px. O resto é
 * peso que atrasa a montagem do PDF sem melhorar nada no papel.
 */

/** Lado maior, em pixels. ~200 dpi na largura de uma folha A4. */
export const LADO_MAXIMO = 2000
const QUALIDADE = 0.86

export interface FotoEnviada {
	/** `blob:` URL pronta para entrar no documento. */
	url: string
	/** Para o operador saber o que mandou. */
	nome: string
}

/**
 * Lê o arquivo, reduz se precisar e devolve uma `blob:` URL.
 *
 * Lança com mensagem em português — quem chama mostra na tela. Não engole erro
 * em silêncio: um upload que falha calado é o operador achando que trocou a
 * foto e descobrindo no PDF que não trocou.
 */
export async function prepararFotoEnviada(arquivo: File): Promise<FotoEnviada> {
	if (!arquivo.type.startsWith('image/')) {
		throw new Error(`"${arquivo.name}" não é uma imagem.`)
	}

	const bitmap = await carregarBitmap(arquivo)
	const maior = Math.max(bitmap.width, bitmap.height)
	const escala = maior > LADO_MAXIMO ? LADO_MAXIMO / maior : 1

	// Já está no tamanho: usa o arquivo como veio, sem reencodar. Reencodar uma
	// JPEG que não precisa reduzir só perde qualidade duas vezes.
	if (escala === 1) {
		liberar(bitmap)
		return { url: URL.createObjectURL(arquivo), nome: arquivo.name }
	}

	const largura = Math.round(bitmap.width * escala)
	const altura = Math.round(bitmap.height * escala)
	const canvas = document.createElement('canvas')
	canvas.width = largura
	canvas.height = altura
	const ctx = canvas.getContext('2d')
	if (!ctx) throw new Error('Não consegui preparar a imagem neste navegador.')
	ctx.imageSmoothingQuality = 'high'
	ctx.drawImage(bitmap, 0, 0, largura, altura)
	liberar(bitmap)

	const blob = await new Promise<Blob | null>(ok => canvas.toBlob(ok, 'image/jpeg', QUALIDADE))
	if (!blob) throw new Error('Não consegui converter a imagem. Tente outro arquivo.')
	return { url: URL.createObjectURL(blob), nome: arquivo.name }
}

/** ImageBitmap segura memória até ser fechada; `<img>` não tem o método. */
function liberar(b: ImageBitmap | HTMLImageElement): void {
	if ('close' in b) b.close()
}

/**
 * `createImageBitmap` com queda para `<img>`: o primeiro não existe em Safari
 * antigo, e o segundo não decodifica HEIC — juntos cobrem o que chega de um
 * celular e de um Mac.
 */
async function carregarBitmap(arquivo: File): Promise<ImageBitmap | HTMLImageElement> {
	if (typeof createImageBitmap === 'function') {
		try {
			return await createImageBitmap(arquivo)
		} catch {
			// cai no <img> abaixo
		}
	}
	const url = URL.createObjectURL(arquivo)
	try {
		return await new Promise<HTMLImageElement>((ok, erro) => {
			const img = new Image()
			img.onload = () => ok(img)
			img.onerror = () => erro(new Error(`Não consegui abrir "${arquivo.name}".`))
			img.src = url
		})
	} finally {
		URL.revokeObjectURL(url)
	}
}

/** Esta URL foi criada aqui (e portanto precisa ser devolvida ao navegador)? */
export function ehFotoEnviada(url: string): boolean {
	return url.startsWith('blob:')
}
