import { describe, it, expect } from 'vitest'
import {
  normalizarEmail,
  normalizarTelefone,
  hash,
  prepararPublico,
} from '../publico-anuncios'

describe('normalização de e-mail', () => {
  it('tira espaço e caixa', () => {
    expect(normalizarEmail('  Fulano@Attra.COM.BR ')).toBe('fulano@attra.com.br')
  })

  it('não mexe em ponto nem em +tag — seria correção nossa sobre o endereço da pessoa', () => {
    expect(normalizarEmail('nome.sobrenome+carros@gmail.com')).toBe('nome.sobrenome+carros@gmail.com')
  })

  it('descarta o lixo que sempre vem em planilha', () => {
    for (const v of ['', '   ', 'não informado', 'Fulano de Tal', 'sem@dominio', '@x.com', 'a@b']) {
      expect(normalizarEmail(v)).toBeNull()
    }
  })
})

describe('normalização de telefone', () => {
  it('aceita máscara', () => {
    expect(normalizarTelefone('(34) 99944-4747')).toBe('+5534999444747')
  })

  it('aceita com 55 na frente', () => {
    expect(normalizarTelefone('5534999444747')).toBe('+5534999444747')
    expect(normalizarTelefone('+55 (34) 99944-4747')).toBe('+5534999444747')
  })

  it('tira o zero de operadora', () => {
    expect(normalizarTelefone('034999444747')).toBe('+5534999444747')
  })

  it('acrescenta o nono dígito em cadastro antigo — é a maioria numa base de 5 anos', () => {
    // 34 + 99944747 (8 dígitos, celular antigo) -> 34 + 999944747
    expect(normalizarTelefone('3499944747')).toBe('+5534999944747')
  })

  it('o nono dígito só entra em celular, nunca em fixo', () => {
    // 3014-3232 é fixo da Attra: vira null, não vira +553490143232.
    expect(normalizarTelefone('(34) 3014-3232')).toBeNull()
  })

  it('descarta fixo de 10 dígitos', () => {
    expect(normalizarTelefone('3432260202')).toBeNull()
  })

  it('descarta lixo e tamanho impossível', () => {
    for (const v of ['', 'não tem', '999', '123456789012345', '00999444747']) {
      expect(normalizarTelefone(v)).toBeNull()
    }
  })

  it('dois formatos do mesmo número chegam ao mesmo valor', () => {
    const formas = ['34999444747', '(34) 99944-4747', '+55 34 99944 4747', '5534999444747']
    const saida = new Set(formas.map(normalizarTelefone))
    expect(saida.size).toBe(1)
  })
})

describe('hash', () => {
  it('é SHA-256 hexadecimal minúsculo', () => {
    const h = hash('fulano@attra.com.br')
    expect(h).toMatch(/^[0-9a-f]{64}$/)
  })

  it('mesmo valor normalizado, mesmo hash', () => {
    expect(hash(normalizarEmail('  Fulano@Attra.com.br ')!)).toBe(hash('fulano@attra.com.br'))
  })
})

describe('preparo do arquivo', () => {
  it('cabeçalho é o nome exato que a plataforma exige', () => {
    const r = prepararPublico(['a@b.com'], 'email')
    expect(r.csv.split('\n')[0]).toBe('email')
    expect(prepararPublico(['34999444747'], 'phone_number').csv.split('\n')[0]).toBe('phone_number')
    expect(prepararPublico(['a@b.com'], 'email_sha256').csv.split('\n')[0]).toBe('email_sha256')
  })

  it('deduplica pelo valor normalizado, não pelo texto cru', () => {
    const r = prepararPublico(['(34) 99944-4747', '5534999444747', '34999444747'], 'phone_number')
    expect(r.identificadores).toEqual(['+5534999444747'])
    expect(r.duplicados).toBe(2)
  })

  it('conta o que descartou — coluna trocada gera arquivo pequeno e válido', () => {
    const r = prepararPublico(['Fulano', 'Beltrano', 'a@b.com'], 'email')
    expect(r.identificadores).toHaveLength(1)
    expect(r.descartados).toBe(2)
    expect(r.totalLido).toBe(3)
  })

  it('a versão com hash tem o mesmo tamanho da sem hash', () => {
    const entrada = ['a@b.com', 'c@d.com', 'a@b.com']
    expect(prepararPublico(entrada, 'email_sha256').identificadores).toHaveLength(2)
    expect(prepararPublico(entrada, 'email').identificadores).toHaveLength(2)
  })

  it('hash é do valor normalizado, então caixa diferente não vira linha diferente', () => {
    const r = prepararPublico(['Fulano@Attra.com.br', 'fulano@attra.com.br'], 'email_sha256')
    expect(r.identificadores).toHaveLength(1)
    expect(r.identificadores[0]).toBe(hash('fulano@attra.com.br'))
  })

  it('arquivo termina em quebra de linha', () => {
    expect(prepararPublico(['a@b.com'], 'email').csv.endsWith('\n')).toBe(true)
  })
})
