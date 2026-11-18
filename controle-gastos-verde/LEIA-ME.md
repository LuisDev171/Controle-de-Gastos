# Controle de Gastos (aplicativo instalável)

## Publicar o app (Netlify Drop)
1. Abra https://app.netlify.com/drop
2. Arraste a PASTA `gastos` inteira (index.html, sw.js, manifest, icons).
3. Abra o link no celular do cliente e use "Adicionar à tela inicial".

## Ligar o banco de dados na nuvem (Supabase) — grátis
1. Crie uma conta em https://supabase.com e um projeto novo.
2. No projeto: SQL Editor > New query > cole o conteúdo de `supabase.sql` > Run.
3. Settings > API: copie "Project URL" e a chave "anon public".
4. Abra `index.html`, procure `SUPABASE_URL` e `SUPABASE_KEY` (início do script) e cole os dois valores.
5. Em Authentication > Providers > Email, desligue "Confirm email" se quiser entrar sem confirmar e-mail.
6. Publique de novo (arraste a pasta no Netlify) e troque o número da versão em `sw.js`.

Com o banco ligado, cada pessoa só enxerga os próprios gastos (regras RLS do `supabase.sql`).
Sem o banco ligado, o app funciona só no aparelho (dados no próprio celular).

## Atualização v5 (categorias novas)
- Cartão de crédito: Parcelados, Diversos, Combustível, Farmácia, Supermercado, Alimentação.
- Casa: Aluguel, Condomínio, Luz, IPTU, Internet, Outros (saiu Água).
- Carro: IPVA, Seguro, Mecânico, Lavador, Outros (Combustível foi para o cartão).
- Cachorro: Veterinário, Banho/Tosa, Petshop, Creche.
- Nova aba "Gastos Pessoais": Beach Tennis, Wellhub, Diversos.
- Gastos antigos continuam no histórico e aparecem como "(antigo)".
- Se você usa o Supabase: rode o bloco "ATUALIZAÇÃO" no final do `supabase.sql` uma vez (sem isso, a aba Gastos Pessoais não salva na nuvem).
