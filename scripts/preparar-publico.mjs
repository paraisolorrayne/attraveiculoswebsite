#!/usr/bin/env node
/**
 * Prepara um arquivo de público para o Ads Manager do OpenAI a partir de uma
 * planilha de clientes exportada em CSV.
 *
 * Uso:
 *   node scripts/preparar-publico.mjs <arquivo.csv> --coluna <nome> --tipo <tipo>
 *
 *   --coluna  nome da coluna na planilha (ex.: "telefone", "E-mail")
 *   --tipo    email | phone_number | email_sha256 | phone_number_sha256
 *   --saida   caminho do arquivo gerado (padrão: ao lado do de entrada)
 *
 * Exemplo:
 *   node scripts/preparar-publico.mjs clientes.csv --coluna celular --tipo phone_number_sha256
 *
 * A lógica de normalização vive em src/lib/publico-anuncios.ts e tem testes.
 * Este arquivo é só a casca de linha de comando: lê CSV, chama, escreve.
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { createHash } from 'node:crypto'

const TIPOS = ['email', 'phone_number', 'email_sha256', 'phone_number_sha256']

// --- normalização (espelho de src/lib/publico-anuncios.ts) -------------------
// Duplicado aqui de propósito: o script roda sem passar pelo bundler do Next,
// e importar TypeScript exigiria tsx só para isto. Se mudar lá, mude aqui — os
// testes cobrem a versão de lá, que é a fonte da verdade.

function normalizarEmail(bruto) {
  const valor = String(bruto ?? '').trim().toLowerCase()
  if (!valor) return null
  if (!/^[^@\s,;]+@[^@\s,;]+\.[a-z]{2,}$/.test(valor)) return null
  return valor
}

function normalizarTelefone(bruto) {
  let digitos = String(bruto ?? '').replace(/\D/g, '')
  if (!digitos) return null
  if (digitos.startsWith('55') && (digitos.length === 12 || digitos.length === 13)) digitos = digitos.slice(2)
  if ((digitos.length === 11 || digitos.length === 12) && digitos.startsWith('0')) digitos = digitos.slice(1)
  if (digitos.length !== 10 && digitos.length !== 11) return null
  const ddd = digitos.slice(0, 2)
  let numero = digitos.slice(2)
  if (ddd[0] === '0') return null
  if (numero.length === 8) {
    if (!/^[6-9]/.test(numero)) return null
    numero = '9' + numero
  }
  if (numero.length !== 9 || numero[0] !== '9') return null
  return `+55${ddd}${numero}`
}

const hash = v => createHash('sha256').update(v, 'utf8').digest('hex')

// --- CSV --------------------------------------------------------------------
// Parser mínimo, com aspas: exportação de CRM costuma ter vírgula dentro de
// campo de nome ou endereço, e um split ingênuo desalinharia as colunas.

function lerCsv(texto) {
  const linhas = []
  let campo = ''
  let linha = []
  let dentroDeAspas = false

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    if (dentroDeAspas) {
      if (c === '"') {
        if (texto[i + 1] === '"') { campo += '"'; i++ }
        else dentroDeAspas = false
      } else campo += c
      continue
    }
    if (c === '"') { dentroDeAspas = true; continue }
    if (c === ',' || c === ';') { linha.push(campo); campo = ''; continue }
    if (c === '\n') { linha.push(campo); linhas.push(linha); linha = []; campo = ''; continue }
    if (c === '\r') continue
    campo += c
  }
  if (campo || linha.length) { linha.push(campo); linhas.push(linha) }
  return linhas.filter(l => l.some(c => c.trim() !== ''))
}

// --- CLI --------------------------------------------------------------------

function arg(nome, padrao) {
  const i = process.argv.indexOf(`--${nome}`)
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : padrao
}

const entrada = process.argv[2]
const coluna = arg('coluna')
const tipo = arg('tipo')

if (!entrada || !coluna || !tipo) {
  console.error('Uso: node scripts/preparar-publico.mjs <arquivo.csv> --coluna <nome> --tipo <tipo>')
  console.error(`Tipos: ${TIPOS.join(' | ')}`)
  process.exit(1)
}
if (!TIPOS.includes(tipo)) {
  console.error(`Tipo inválido: ${tipo}. Use um de: ${TIPOS.join(' | ')}`)
  process.exit(1)
}

const linhas = lerCsv(readFileSync(entrada, 'utf8'))
if (linhas.length < 2) {
  console.error('Planilha sem dados (esperado cabeçalho + linhas).')
  process.exit(1)
}

const cabecalho = linhas[0].map(c => c.trim())
const idx = cabecalho.findIndex(c => c.toLowerCase() === coluna.toLowerCase())
if (idx === -1) {
  console.error(`Coluna "${coluna}" não existe. Colunas do arquivo:\n  ${cabecalho.join('\n  ')}`)
  process.exit(1)
}

const ehEmail = tipo.startsWith('email')
const ehHash = tipo.endsWith('_sha256')
const vistos = new Set()
const identificadores = []
let descartados = 0
let duplicados = 0

for (const linha of linhas.slice(1)) {
  const normalizado = ehEmail ? normalizarEmail(linha[idx]) : normalizarTelefone(linha[idx])
  if (!normalizado) { descartados++; continue }
  if (vistos.has(normalizado)) { duplicados++; continue }
  vistos.add(normalizado)
  identificadores.push(ehHash ? hash(normalizado) : normalizado)
}

const saida = arg('saida', join(dirname(entrada), `publico-${tipo}-${basename(entrada, '.csv')}.csv`))
writeFileSync(saida, [tipo, ...identificadores].join('\n') + '\n', 'utf8')

const lidos = linhas.length - 1
console.log(`\nArquivo: ${saida}`)
console.log(`  coluna lida ........... ${cabecalho[idx]}`)
console.log(`  linhas na planilha .... ${lidos}`)
console.log(`  identificadores ....... ${identificadores.length}`)
console.log(`  duplicados removidos .. ${duplicados}`)
console.log(`  descartados ........... ${descartados}${descartados > lidos / 2 ? '   <-- mais da metade: confira se a coluna está certa' : ''}`)

if (identificadores.length < 25000) {
  console.log(`\nAVISO: a plataforma só ativa o público a partir de 25.000 usuários CORRESPONDIDOS.`)
  console.log(`Com ${identificadores.length} identificadores, e considerando que nem todos terão conta,`)
  console.log(`este público provavelmente não vai ativar. O arquivo está correto — o volume é que não basta.`)
}
