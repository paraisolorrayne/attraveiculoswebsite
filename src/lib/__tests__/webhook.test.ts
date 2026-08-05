import { describe, it, expect } from 'vitest'
import { generateVehicleMessage } from '../webhook'

describe('generateVehicleMessage', () => {
  // ── With full vehicle info ──

  it('includes brand, model, and year when all are provided', () => {
    const msg = generateVehicleMessage('BMW', 'X5', 2024)
    expect(msg).toContain('BMW X5 2024')
    expect(msg).toContain('interesse no')
  })

  it('includes brand and model without year when year is omitted', () => {
    const msg = generateVehicleMessage('Porsche', '911')
    expect(msg).toContain('Porsche 911')
    expect(msg).not.toMatch(/Porsche 911 \d/)
  })

  it('includes brand and model with string year', () => {
    const msg = generateVehicleMessage('Ferrari', '812', '2023')
    expect(msg).toContain('Ferrari 812 2023')
  })

  // ── Without vehicle info (the bug scenario) ──

  it('does NOT contain "um veículo" when brand is undefined', () => {
    const msg = generateVehicleMessage(undefined, 'X5', 2024)
    expect(msg).not.toContain('um veículo')
  })

  it('does NOT contain "um veículo" when model is undefined', () => {
    const msg = generateVehicleMessage('BMW', undefined, 2024)
    expect(msg).not.toContain('um veículo')
  })

  it('does NOT contain "um veículo" when both brand and model are undefined', () => {
    const msg = generateVehicleMessage()
    expect(msg).not.toContain('um veículo')
  })

  it('does NOT contain "um veículo" when brand and model are empty strings', () => {
    const msg = generateVehicleMessage('', '', 2024)
    expect(msg).not.toContain('um veículo')
  })

  it('produces a professional generic message when vehicle info is missing', () => {
    const msg = generateVehicleMessage()
    expect(msg).toContain('veículos disponíveis')
    expect(msg).toContain('Vim do site')
  })

  // ── Geolocation handling ──

  it('includes city/region when valid geolocation is provided', () => {
    const geo = { city: 'Itaguaí', region: 'Rio de Janeiro', country: 'Brasil', ip: '' }
    const msg = generateVehicleMessage('BMW', 'X5', 2024, geo)
    // Sigla, não o nome por extenso: a mensagem é escrita pelo cliente.
    expect(msg).toContain('Itaguaí/RJ')
    expect(msg).toContain('BMW X5 2024')
  })

  it('includes location in generic message when vehicle info is missing', () => {
    const geo = { city: 'São Paulo', region: 'São Paulo', country: 'Brasil', ip: '' }
    const msg = generateVehicleMessage(undefined, undefined, undefined, geo)
    // Antes saía 'São Paulo/São Paulo', com o nome repetido.
    expect(msg).toContain('São Paulo/SP')
    expect(msg).toContain('veículos disponíveis')
    expect(msg).not.toContain('um veículo')
  })

  it('omits location when geolocation is null', () => {
    const msg = generateVehicleMessage('BMW', 'X5', 2024, null)
    expect(msg).not.toContain('sou de')
    expect(msg.endsWith('.')).toBe(true)
  })

  it('omits location when city is "Não identificada"', () => {
    const geo = { city: 'Não identificada', region: 'Rio de Janeiro', country: 'Brasil', ip: '' }
    const msg = generateVehicleMessage('BMW', 'X5', 2024, geo)
    expect(msg).not.toContain('Não identificada')
    expect(msg).not.toContain('sou de')
  })

  it('omits location when region is "Não identificada"', () => {
    const geo = { city: 'Itaguaí', region: 'Não identificada', country: 'Brasil', ip: '' }
    const msg = generateVehicleMessage('BMW', 'X5', 2024, geo)
    expect(msg).not.toContain('Não identificada')
    expect(msg).not.toContain('sou de')
  })

  it('omits location when city is empty string', () => {
    const geo = { city: '', region: 'Rio de Janeiro', country: 'Brasil', ip: '' }
    const msg = generateVehicleMessage('BMW', 'X5', 2024, geo)
    expect(msg).not.toContain('sou de')
  })

  // ── Combined edge cases ──

  it('handles no vehicle info AND no geolocation gracefully', () => {
    const msg = generateVehicleMessage()
    expect(msg).toBe('Vim do site e gostaria de mais informações sobre os veículos disponíveis.')
  })

  it('handles no vehicle info WITH valid geolocation', () => {
    const geo = { city: 'Uberlândia', region: 'Minas Gerais', country: 'Brasil', ip: '' }
    const msg = generateVehicleMessage(undefined, undefined, undefined, geo)
    expect(msg).toBe('Vim do site e gostaria de mais informações sobre os veículos disponíveis, sou de Uberlândia/MG.')
  })

  it('handles full vehicle info WITH valid geolocation', () => {
    const geo = { city: 'Uberlândia', region: 'Minas Gerais', country: 'Brasil', ip: '' }
    const msg = generateVehicleMessage('BMW', 'X5', 2024, geo)
    expect(msg).toBe('Vim do site e tenho interesse no BMW X5 2024, sou de Uberlândia/MG.')
  })

  it('handles full vehicle info WITHOUT geolocation', () => {
    const msg = generateVehicleMessage('BMW', 'X5', 2024)
    expect(msg).toBe('Vim do site e tenho interesse no BMW X5 2024.')
  })
})

