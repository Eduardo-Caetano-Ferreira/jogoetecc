# Dashboard de Ordem de Serviço (O.S. Geral) 🛠️🤖

Este é um dashboard moderno e responsivo para gestão de Ordens de Serviço, focado em agilidade para técnicos e atendentes. O sistema inclui uma funcionalidade exclusiva de **Inteligência Artificial** para atualizar a escala de técnicos via imagem.

## ✨ Funcionalidades

- **Formulário Completo:** Campos para agendamento, dados do cliente, detalhes técnicos e autorizações.
- **Validação Inteligente:** Destaca campos obrigatórios e valida a lógica de preenchimento.
- **Cópia de Script:** Gera um resumo formatado da O.S. pronto para ser colado em sistemas externos.
- **Atualização via IA:** Use o Gemini para ler imagens de tabelas de técnicos e atualizar a lista da região automaticamente.
- **Persistência Local:** Os dados dos técnicos ficam salvos no seu navegador (LocalStorage).
- **Máscara de Telefone:** Formatação automática do campo de contato.

## 🚀 Como Rodar o Projeto

1. **Clone o repositório:**
   ```bash
   git clone <seu-repositorio-github>
   cd <nome-da-pasta>
   ```

2. **Instale as dependências:**
   ```bash
   npm install
   ```

3. **Configure a API Key do Gemini:**
   - Crie um arquivo `.env` na raiz do projeto.
   - Adicione sua chave: `VITE_GEMINI_API_KEY=sua_chave_aqui`
   - Obtenha sua chave em: [Google AI Studio](https://aistudio.google.com/app/apikey)

4. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```

## 🌐 Deploy no GitHub Pages / Vercel / Netlify

Ao subir para produção, lembre-se de configurar a variável de ambiente `VITE_GEMINI_API_KEY` no painel de configurações do seu serviço de hospedagem.

## 🛠️ Tecnologias Utilizadas

- **React 19**
- **TypeScript**
- **Tailwind CSS**
- **Lucide React** (Ícones)
- **Motion** (Animações)
- **Google GenAI SDK** (Gemini API)
