/**
 * Configuração central do modelo Gemini usado em todo o projeto.
 *
 * Centralizado aqui pra que trocar de modelo seja UMA edição só. Todos os
 * usos de IA importam GEMINI_TEXT_MODEL daqui:
 *   - news-guardrails.ts   (classificação de relevância de notícias)
 *   - vehicle-sections.ts  (copy editorial das 3 seções do veículo)
 *   - gemini-service.ts    (descrição "Sobre este veículo")
 *   - blog-ai/gemini-blog.ts (geração de posts do blog)
 *
 * Modelo atual: gemini-3.1-flash-lite — geração 3.1 (mais recente estável
 * em mai/2026), custo $0.25/$1.50 por 1M tokens (in/out). Estável (não
 * preview), boa precisão de classificação e geração leve. Volume do projeto
 * é baixo (~9 veículos/dia + notícias semanais), então o custo é trivial.
 */
export const GEMINI_TEXT_MODEL = 'gemini-3.1-flash-lite'
