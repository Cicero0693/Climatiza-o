# Guia de Hospedagem na Vercel 🚀

Para colocar o seu site online na Vercel de forma rápida, siga estes passos:

## Opção 1: Pelo Terminal (Mais rápido)

1.  Abra o terminal na pasta do projeto: `c:\Users\Cicero Freitas\Desktop\Climatizaçao\clima_bot`
2.  Instale a ferramenta da Vercel (se não tiver):
    ```powershell
    npm install -g vercel
    ```
3.  Faça o login:
    ```powershell
    vercel login
    ```
4.  Suba o site:
    ```powershell
    vercel
    ```
    - Quando perguntar "Set up and deploy?", responda **Y**.
    - Quando perguntar "Which scope?", selecione sua conta.
    - Quando perguntar "Link to existing project?", responda **N**.
    - Para o nome do projeto, pode usar `clima-expert`.
    - No "In which directory?", apenas aperte **Enter** (./).

## Opção 2: Pelo GitHub (Recomendado)

1.  Crie um repositório no seu GitHub.
2.  Suba os arquivos da pasta `clima_bot` para lá.
3.  No site da [Vercel](https://vercel.com), clique em **Add New** > **Project**.
4.  Conconecte seu GitHub e importe o repositório.
5.  A Vercel vai reconhecer que é um site estático e publicar automaticamente toda vez que você fizer uma alteração!

> [!IMPORTANT]
> **Atenção com o Supabase:** Certifique-se de que os arquivos `supabase-config.js` e `main.js` estão com as chaves corretas antes de subir. A Vercel vai ler seu `index.html` como a página principal.

---
### Configuração de Domínio Personalizado (.com) 🌐

Para usar um domínio próprio (ex: `climaexpert.com`), siga estes passos:

1.  **Compre o domínio:** Você pode comprar diretamente na [Vercel](https://vercel.com/dashboard/domains) ou em registradores como [Namecheap](https://namecheap.com), [GoDaddy](https://godaddy.com) ou [Cloudflare](https://cloudflare.com).
2.  **Adicione na Vercel:**
    - No seu projeto na Vercel, vá em **Settings** > **Domains**.
    - Digite o domínio que você comprou e clique em **Add**.
3.  **Configure o DNS:**
    - A Vercel mostrará os registros **A** e **CNAME** que você precisa configurar no site onde comprou o domínio.
    - Se comprou na Vercel, ignore este passo (é automático).
4.  **Aguarde a Propagação:** Pode levar de alguns minutos a 24 horas para o domínio começar a funcionar.
