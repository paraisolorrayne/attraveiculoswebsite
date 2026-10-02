import { describe, it, expect } from 'vitest'
import { agenciaDoUsuario } from '@/lib/auth/usuario-agencia'

const EXISTENTES = ['id-mh', 'id-eb']

describe('agenciaDoUsuario', () => {
	it('papel agência exige uma agência que exista', () => {
		expect(agenciaDoUsuario('agencia', 'id-mh', EXISTENTES)).toEqual({ ok: true, agencia_id: 'id-mh' })
		expect(agenciaDoUsuario('agencia', undefined, EXISTENTES)).toEqual({ ok: false, erro: 'Escolha a agência deste usuário' })
		expect(agenciaDoUsuario('agencia', '', EXISTENTES)).toEqual({ ok: false, erro: 'Escolha a agência deste usuário' })
		expect(agenciaDoUsuario('agencia', 'id-inventado', EXISTENTES)).toEqual({ ok: false, erro: 'Agência não encontrada' })
	})

	it('nos outros papéis a agência é sempre apagada', () => {
		expect(agenciaDoUsuario('marketing', 'id-mh', EXISTENTES)).toEqual({ ok: true, agencia_id: null })
		expect(agenciaDoUsuario('admin', undefined, EXISTENTES)).toEqual({ ok: true, agencia_id: null })
	})
})
