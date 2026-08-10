import { describe, it, expect } from 'vitest'
import {
  normalizarParametroAnuncio,
  rotuloDevice,
  rotuloMatchType,
  rotuloNetwork,
} from '../parametros-anuncio'

describe('normalização do valor cru', () => {
  it('aceita os códigos que o Google manda', () => {
    expect(normalizarParametroAnuncio('e')).toBe('e')
    expect(normalizarParametroAnuncio('m')).toBe('m')
    expect(normalizarParametroAnuncio('ytv')).toBe('ytv')
  })

  it('normaliza caixa e espaço', () => {
    expect(normalizarParametroAnuncio(' C ')).toBe('c')
  })

  it('descarta placeholder não substituído — é defeito de configuração, não dado', () => {
    // Acontece quando o modelo de rastreamento está errado: o Google manda o
    // literal. Gravar encheria o painel de uma linha "{device}".
    expect(normalizarParametroAnuncio('{device}')).toBeNull()
    expect(normalizarParametroAnuncio('{matchtype}')).toBeNull()
    expect(normalizarParametroAnuncio('{keyword}')).toBeNull()
  })

  it('descarta vazio', () => {
    expect(normalizarParametroAnuncio('')).toBeNull()
    expect(normalizarParametroAnuncio(null)).toBeNull()
    expect(normalizarParametroAnuncio('   ')).toBeNull()
  })

  it('recusa o que não parece código — a querystring é editável por qualquer um', () => {
    expect(normalizarParametroAnuncio('<script>')).toBeNull()
    expect(normalizarParametroAnuncio("' or 1=1")).toBeNull()
    expect(normalizarParametroAnuncio('a'.repeat(17))).toBeNull()
  })

  it('aceita até 16 caracteres', () => {
    expect(normalizarParametroAnuncio('a'.repeat(16))).toBe('a'.repeat(16))
  })
})

describe('tradução para o painel', () => {
  it('matchtype', () => {
    expect(rotuloMatchType('e')).toBe('Exata')
    expect(rotuloMatchType('p')).toBe('Frase')
    expect(rotuloMatchType('b')).toBe('Ampla')
    expect(rotuloMatchType('a')).toBe('IA Max')
  })

  it('device', () => {
    expect(rotuloDevice('m')).toBe('Celular')
    expect(rotuloDevice('c')).toBe('Computador')
    expect(rotuloDevice('t')).toBe('Tablet')
  })

  it('network', () => {
    expect(rotuloNetwork('g')).toBe('Pesquisa do Google')
    expect(rotuloNetwork('s')).toBe('Parceiros de pesquisa')
    expect(rotuloNetwork('d')).toBe('Rede de Display')
  })

  it('código desconhecido aparece como veio, não vira "desconhecido"', () => {
    // Um valor novo tem que ficar visível para alguém investigar, não sumir
    // num balde genérico.
    expect(rotuloNetwork('zz')).toBe('zz')
    expect(rotuloDevice('smarttv')).toBe('smarttv')
  })

  it('ausência é declarada, não escondida', () => {
    expect(rotuloDevice(null)).toBe('(não informado)')
    expect(rotuloMatchType('')).toBe('(não informado)')
  })
})
